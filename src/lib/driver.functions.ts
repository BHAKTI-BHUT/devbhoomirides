// Driver app server functions. Registration is open to any signed-in user (it assigns the
// driver role); everything else re-checks the role and the driver's verification on the server.
import { createServerFn } from '@tanstack/react-start'
import { admin as identityAdmin } from '@netlify/identity'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { auditLogs, bookings, driverDocuments, driverProfiles, routeStops, routes, tripStops, trips, users, vehicles } from '../../db/schema.js'
import { authMiddleware, driverMiddleware } from '@/middleware/auth'
import { AppError, toPublicError } from '@/server/errors'
import { documentStore, loadDriverDetail, parseWith, type DriverDetail, type DocumentType } from '@/server/drivers'

export type DriverRoute = { id: string; name: string; stops: Array<{ id: string; name: string; offsetMinutes: number }> }
export type DriverTripBooking = {
  code: string
  status: string
  seats: number
  pickup: string
  drop: string
  pickupPoint: string
  contactPhone: string
  passengers: Array<{ name: string; age: string; gender: string }>
}
export type DriverTrip = {
  id: string
  routeName: string
  from: string
  to: string
  date: string
  departureTime: string
  totalSeats: number
  bookedSeats: number
  pricePerSeat: number // rupees
  status: string
  isReturn: boolean
  vehicle: string
  bookings: DriverTripBooking[]
}
export type DriverDashboard = {
  role: 'customer' | 'driver' | 'admin'
  email: string
  name: string
  detail: DriverDetail | null
  trips: DriverTrip[]
  routes: DriverRoute[]
}

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{10,15}$/, 'Enter a valid 10-digit mobile number.')
const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter your full name.').max(80),
  phone,
  licenceNumber: z.string().trim().min(6, 'Enter your driving licence number.').max(30),
  licenceExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your licence expiry date.'),
  emergencyName: z.string().trim().min(2, 'Enter an emergency contact name.').max(80),
  emergencyPhone: phone,
  vehicleType: z.string().trim().min(2, 'Choose your vehicle type.').max(40),
  vehicleModel: z.string().trim().min(2, 'Enter your vehicle model.').max(80),
  registrationNumber: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase().replace(/\s+/g, ' '))
    .pipe(z.string().regex(/^[A-Z0-9 -]{6,15}$/, 'Enter a valid vehicle registration number, e.g. UK07 TA 4521.')),
  passengerSeats: z.coerce.number().int().min(1, 'Seats must be at least 1.').max(20, 'Seats must be 20 or fewer.'),
})

const todayIST = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10)

export const getDriverDashboard = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DriverDashboard> => {
    try {
      const u = context.user
      const detail = await loadDriverDetail({ userId: u.id })
      const routeRows = await db
        .select({ id: routes.id, name: routes.name, stopId: routeStops.id, stopName: routeStops.name, offset: routeStops.offsetMinutes })
        .from(routes)
        .innerJoin(routeStops, eq(routeStops.routeId, routes.id))
        .where(and(eq(routes.isActive, true), eq(routeStops.isActive, true)))
        .orderBy(asc(routes.name), asc(routeStops.position))
      const routeMap = new Map<string, DriverRoute>()
      for (const r of routeRows) {
        const route = routeMap.get(r.id) ?? { id: r.id, name: r.name, stops: [] }
        route.stops.push({ id: r.stopId, name: r.stopName, offsetMinutes: r.offset })
        routeMap.set(r.id, route)
      }
      return {
        role: u.role,
        email: u.email,
        name: u.name,
        detail,
        trips: detail ? await loadDriverTrips(detail.profile.id) : [],
        routes: [...routeMap.values()],
      }
    } catch (err) {
      throw toPublicError(err)
    }
  })

async function loadDriverTrips(driverId: string): Promise<DriverTrip[]> {
  const rows = await db
    .select({ t: trips, routeName: routes.name, vModel: vehicles.model, vReg: vehicles.registrationNumber })
    .from(trips)
    .innerJoin(routes, eq(routes.id, trips.routeId))
    .innerJoin(vehicles, eq(vehicles.id, trips.vehicleId))
    .where(eq(trips.driverId, driverId))
    .orderBy(desc(trips.departsAt))
    .limit(50)
  if (!rows.length) return []
  const ids = rows.map((r) => r.t.id)
  const pickup = alias(routeStops, 'pickup_stop')
  const drop = alias(routeStops, 'drop_stop')
  const [stopRows, bookingRows] = await Promise.all([
    db
      .select({ tripId: tripStops.tripId, name: routeStops.name })
      .from(tripStops)
      .innerJoin(routeStops, eq(routeStops.id, tripStops.routeStopId))
      .where(inArray(tripStops.tripId, ids))
      .orderBy(asc(tripStops.position)),
    db
      .select({ b: bookings, pickup: pickup.name, drop: drop.name })
      .from(bookings)
      .innerJoin(pickup, eq(pickup.id, bookings.pickupStopId))
      .innerJoin(drop, eq(drop.id, bookings.dropStopId))
      .where(and(inArray(bookings.tripId, ids), inArray(bookings.status, ['confirmed', 'completed', 'no_show'])))
      .orderBy(asc(bookings.createdAt)),
  ])
  return rows.map(({ t, routeName, vModel, vReg }) => {
    const names = stopRows.filter((s) => s.tripId === t.id).map((s) => s.name)
    return {
      id: t.id,
      routeName,
      from: names[0] ?? '',
      to: names[names.length - 1] ?? '',
      date: t.date,
      departureTime: t.departureTime,
      totalSeats: t.totalSeats,
      bookedSeats: t.bookedSeats,
      pricePerSeat: t.pricePerSeat / 100,
      status: t.status,
      isReturn: t.isReturn,
      vehicle: `${vModel} · ${vReg}`,
      bookings: bookingRows
        .filter((r) => r.b.tripId === t.id)
        .map(({ b, pickup, drop }) => ({
          code: b.code,
          status: b.status,
          seats: b.seats,
          pickup,
          drop,
          pickupPoint: b.pickupPoint,
          contactPhone: b.contactPhone,
          passengers: b.passengers,
        })),
    }
  })
}

/**
 * Creates or updates the driver profile + vehicle and assigns the driver role.
 * Every (re)submission goes back to Pending Verification; verified or suspended
 * drivers can't edit details here, so approval can't be bypassed.
 */
export const registerDriver = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(parseWith(registerSchema))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    try {
      const u = context.user
      const existing = await loadDriverDetail({ userId: u.id })
      if (existing && (existing.profile.verification === 'verified' || existing.profile.verification === 'suspended'))
        throw new AppError('Your driver profile is locked after review. Please contact Devbhoomi Rides support to change details.')

      const [taken] = await db
        .select({ driverId: vehicles.driverId })
        .from(vehicles)
        .where(eq(vehicles.registrationNumber, data.registrationNumber))
        .limit(1)
      if (taken && taken.driverId !== existing?.profile.id)
        throw new AppError('This vehicle registration number is already registered with another driver.')

      const profileFields = {
        displayName: data.displayName,
        phone: data.phone,
        licenceNumber: data.licenceNumber.toUpperCase(),
        licenceExpiry: data.licenceExpiry,
        emergencyContact: `${data.emergencyName} · ${data.emergencyPhone}`,
        verification: 'pending' as const,
        verificationNote: null,
        verifiedAt: null,
        verifiedBy: null,
      }
      const vehicleFields = {
        type: data.vehicleType,
        model: data.vehicleModel,
        registrationNumber: data.registrationNumber,
        passengerSeats: data.passengerSeats,
      }

      await db.transaction(async (tx) => {
        const [profile] = await tx
          .insert(driverProfiles)
          .values({ userId: u.id, ...profileFields })
          .onConflictDoUpdate({ target: driverProfiles.userId, set: profileFields })
          .returning({ id: driverProfiles.id })
        const current = existing?.vehicles[0]
        if (current) await tx.update(vehicles).set(vehicleFields).where(eq(vehicles.id, current.id))
        else await tx.insert(vehicles).values({ driverId: profile.id, ...vehicleFields })
        // Admins keep their admin role; everyone else becomes a driver.
        await tx
          .update(users)
          .set({ phone: data.phone, name: data.displayName, ...(u.role === 'admin' ? {} : { role: 'driver' as const }) })
          .where(eq(users.id, u.id))
        await tx.insert(auditLogs).values({
          actorId: u.id,
          actorEmail: u.email,
          action: existing ? 'driver.resubmitted' : 'driver.registered',
          entityType: 'driver_profile',
          entityId: profile.id,
          next: { ...profileFields, vehicle: vehicleFields },
        })
      })

      // Mirror the role into Identity app_metadata (best effort — the database role is authoritative).
      if (u.role !== 'admin') {
        try {
          await identityAdmin.updateUser(u.identityId, { app_metadata: { roles: ['driver'] } })
        } catch (err) {
          console.warn('[driver] could not sync Identity role', err)
        }
      }
      return { ok: true }
    } catch (err) {
      const msg = String((err as { cause?: { message?: string } })?.cause?.message ?? (err as Error)?.message ?? '')
      if (/registration_number/.test(msg)) throw new AppError('This vehicle registration number is already registered with another driver.')
      throw toPublicError(err)
    }
  })

const DOC_TYPES = ['profile_photo', 'driving_licence', 'vehicle_rc', 'vehicle_photo', 'other'] as const
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 5 * 1024 * 1024

export const uploadDriverDocument = createServerFn({ method: 'POST' })
  .middleware([driverMiddleware])
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new AppError('Please choose a file to upload.')
    return d
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    try {
      const type = String(data.get('type') ?? '') as DocumentType
      const file = data.get('file')
      if (!DOC_TYPES.includes(type)) throw new AppError('Choose the document type.')
      if (!(file instanceof File) || file.size === 0) throw new AppError('Please choose a file to upload.')
      if (!ALLOWED_TYPES.includes(file.type)) throw new AppError('Upload a JPG, PNG, WebP or PDF file.')
      if (file.size > MAX_BYTES) throw new AppError('Files must be 5 MB or smaller.')

      const [profile] = await db
        .select({ id: driverProfiles.id, verification: driverProfiles.verification })
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, context.user.id))
        .limit(1)
      if (!profile) throw new AppError('Complete your driver registration first.')
      if (profile.verification === 'suspended') throw new AppError('Your driver account is suspended. Please contact support.')

      const blobKey = `${profile.id}/${crypto.randomUUID()}`
      await documentStore().set(blobKey, await file.arrayBuffer(), { metadata: { contentType: file.type, fileName: file.name } })
      await db.insert(driverDocuments).values({
        driverId: profile.id,
        type,
        blobKey,
        fileName: file.name.slice(0, 120),
        contentType: file.type,
        sizeBytes: file.size,
      })
      return { ok: true }
    } catch (err) {
      throw toPublicError(err)
    }
  })

const tripSchema = z.object({
  routeId: z.string().uuid('Choose a route.'),
  vehicleId: z.string().uuid('Choose a vehicle.'),
  direction: z.enum(['forward', 'return']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a travel date.'),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a departure time.'),
  totalSeats: z.coerce.number().int().min(1, 'Offer at least 1 seat.'),
  pricePerSeat: z.coerce.number().int().min(50, 'Price per seat must be at least ₹50.').max(5000, 'Price per seat must be ₹5,000 or less.'),
})

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = (h * 60 + m + minutes) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Publishes a trip. Only drivers whose profile an admin has verified may do this. */
export const createDriverTrip = createServerFn({ method: 'POST' })
  .middleware([driverMiddleware])
  .inputValidator(parseWith(tripSchema))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    try {
      const [profile] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, context.user.id)).limit(1)
      if (!profile) throw new AppError('Complete your driver registration first.')
      if (profile.verification !== 'verified')
        throw new AppError('You can publish trips after Devbhoomi Rides verifies your profile.', 'forbidden')

      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, data.vehicleId), eq(vehicles.driverId, profile.id), eq(vehicles.status, 'active')))
        .limit(1)
      if (!vehicle) throw new AppError('Choose one of your registered vehicles.')
      if (data.totalSeats > vehicle.passengerSeats)
        throw new AppError(`This vehicle has ${vehicle.passengerSeats} passenger seats. Offer ${vehicle.passengerSeats} or fewer.`)

      const departsAt = new Date(`${data.date}T${data.departureTime}:00+05:30`)
      if (data.date < todayIST() || departsAt.getTime() < Date.now() + 30 * 60_000)
        throw new AppError('Departure must be at least 30 minutes from now.')

      const stops = await db
        .select()
        .from(routeStops)
        .where(and(eq(routeStops.routeId, data.routeId), eq(routeStops.isActive, true)))
        .orderBy(asc(routeStops.position))
      if (stops.length < 2) throw new AppError('This route is not available yet.')
      const ordered = data.direction === 'return' ? [...stops].reverse() : stops
      const start = ordered[0].offsetMinutes

      const id = await db.transaction(async (tx) => {
        const [trip] = await tx
          .insert(trips)
          .values({
            routeId: data.routeId,
            driverId: profile.id,
            vehicleId: vehicle.id,
            date: data.date,
            departureTime: data.departureTime,
            departsAt,
            totalSeats: data.totalSeats,
            pricePerSeat: data.pricePerSeat * 100,
            status: 'booking_open',
            isReturn: data.direction === 'return',
          })
          .returning({ id: trips.id })
        await tx.insert(tripStops).values(
          ordered.map((s, i) => ({
            tripId: trip.id,
            routeStopId: s.id,
            position: i,
            eta: addMinutes(data.departureTime, Math.abs(s.offsetMinutes - start)),
            pickupPoints: s.pickupPoints,
          })),
        )
        await tx.insert(auditLogs).values({
          actorId: context.user.id,
          actorEmail: context.user.email,
          action: 'trip.published',
          entityType: 'trip',
          entityId: trip.id,
          next: data,
        })
        return trip.id
      })
      return { id }
    } catch (err) {
      throw toPublicError(err)
    }
  })
