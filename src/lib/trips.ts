// Pure booking rules. These run in the browser for the preview and are written
// to be reused unchanged by the server-side booking API in a later milestone.
import { drivers, platformSettings, routes, trips, vehicles } from '@/data/fixtures'
import type { CancellationRule, FareBreakdown, PlatformSettings, Trip, TripStop } from './types'

export function getTrip(id: string) {
  return trips.find((t) => t.id === id)
}
export function getDriver(id: string) {
  return drivers.find((d) => d.id === id)
}
export function getVehicle(id: string) {
  return vehicles.find((v) => v.id === id)
}

/** Every distinct stop across all active routes, in route order. */
export function allStops() {
  const seen = new Map<string, { id: string; name: string }>()
  for (const r of routes) for (const s of r.stops) if (!seen.has(s.id)) seen.set(s.id, { id: s.id, name: s.name })
  return [...seen.values()]
}

export function stopName(id: string) {
  return allStops().find((s) => s.id === id)?.name ?? id
}

export function stopIndex(trip: Trip, stopId: string) {
  return trip.stops.findIndex((s) => s.stopId === stopId)
}

/** A segment is valid only when pickup comes strictly before drop on this trip. */
export function isValidSegment(trip: Trip, pickupId: string, dropId: string) {
  const p = stopIndex(trip, pickupId)
  const d = stopIndex(trip, dropId)
  return p !== -1 && d !== -1 && p < d
}

/** Pickups: every stop except the last. */
export function pickupOptions(trip: Trip): TripStop[] {
  return trip.stops.slice(0, -1)
}

/** Drops: only stops after the chosen pickup. */
export function dropOptions(trip: Trip, pickupId: string): TripStop[] {
  const p = stopIndex(trip, pickupId)
  return p === -1 ? [] : trip.stops.slice(p + 1)
}

export function seatsLeft(trip: Trip, extraBooked = 0) {
  return Math.max(0, trip.totalSeats - trip.bookedSeats - extraBooked)
}

export function isBookable(trip: Trip, extraBooked = 0) {
  return (trip.status === 'booking_open' || trip.status === 'published') && seatsLeft(trip, extraBooked) > 0
}

export function calculateFare(
  pricePerSeat: number,
  seats: number,
  settings: PlatformSettings = platformSettings,
): FareBreakdown {
  const rideFare = pricePerSeat * seats
  return { seats, pricePerSeat, rideFare, bookingFee: settings.bookingFee, total: rideFare + settings.bookingFee }
}

export function driverPayout(rideFare: number, settings: PlatformSettings = platformSettings) {
  const commission = Math.round((rideFare * settings.commissionPercent) / 100)
  return { commission, payout: rideFare - commission }
}

export function departureDate(trip: Trip) {
  return new Date(`${trip.date}T${trip.departureTime}:00`)
}

export function cancellationRuleFor(trip: Trip, now = new Date(), settings = platformSettings): CancellationRule {
  const hours = (departureDate(trip).getTime() - now.getTime()) / 36e5
  const sorted = [...settings.cancellationRules].sort((a, b) => b.minHoursBefore - a.minHoursBefore)
  return sorted.find((r) => hours >= r.minHoursBefore) ?? sorted[sorted.length - 1]
}

export function refundFor(trip: Trip, fare: FareBreakdown, now = new Date()) {
  const rule = cancellationRuleFor(trip, now)
  // Booking fee is non-refundable; the refund applies to the ride fare.
  return { rule, amount: Math.round((fare.rideFare * rule.refundPercent) / 100) }
}

export type SearchQuery = { from?: string; to?: string; date?: string }

/** Trips that run from → to in that direction, sorted by departure. */
export function searchTrips({ from, to, date }: SearchQuery) {
  const matches = trips
    .filter((t) => t.status !== 'cancelled' && t.status !== 'draft' && t.status !== 'trip_completed')
    .filter((t) => (from && to ? isValidSegment(t, from, to) : from ? stopIndex(t, from) !== -1 && stopIndex(t, from) < t.stops.length - 1 : true))
    .filter((t) => departureDate(t).getTime() > Date.now() - 60 * 60 * 1000)
    .sort((a, b) => departureDate(a).getTime() - departureDate(b).getTime())
  if (!date) return { onDate: matches, otherDates: [] as Trip[] }
  return { onDate: matches.filter((t) => t.date === date), otherDates: matches.filter((t) => t.date !== date) }
}

export function upcomingTrips(limit = 4) {
  return searchTrips({}).onDate.slice(0, limit)
}
