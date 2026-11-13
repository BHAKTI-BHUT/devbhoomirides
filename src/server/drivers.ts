// Server-only driver helpers shared by the driver app and the admin verification queue.
import { getStore } from '@netlify/blobs'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { driverDocuments, driverProfiles, users, vehicles } from '../../db/schema.js'
import { AppError } from './errors'

/** Uploaded driver documents (licence, RC, photos). Never public — served only via /api/documents. */
export const documentStore = () => {
  const managedContext = globalThis.netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT
  const siteID = process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_BLOBS_TOKEN
  if (!managedContext && (!siteID || !token)) {
    throw new AppError('Document storage is not configured on this host.', 'internal')
  }
  return getStore({ name: 'driver-documents', consistency: 'strong', siteID, token })
}

export type DocumentType = (typeof driverDocuments.$inferSelect)['type']
export type Verification = (typeof driverProfiles.$inferSelect)['verification']

export type DriverProfileView = {
  id: string
  userId: string
  email: string
  displayName: string
  phone: string
  licenceNumber: string
  licenceExpiry: string
  emergencyContact: string
  verification: Verification
  verificationNote: string | null
  verifiedAt: string | null
  createdAt: string
}
export type VehicleView = {
  id: string
  type: string
  model: string
  registrationNumber: string
  passengerSeats: number
  status: 'active' | 'inactive' | 'archived'
}
export type DocumentView = { id: string; type: DocumentType; fileName: string; contentType: string; sizeBytes: number; createdAt: string }
export type DriverDetail = { profile: DriverProfileView; vehicles: VehicleView[]; documents: DocumentView[] }

/** Validates input with zod and turns the first issue into a friendly AppError. */
export function parseWith<T extends z.ZodType>(schema: T) {
  return (data: unknown): z.infer<T> => {
    const r = schema.safeParse(data)
    if (!r.success) throw new AppError(r.error.issues[0]?.message ?? 'Please check the details and try again.')
    return r.data
  }
}

export async function loadDriverDetail(where: { driverId: string } | { userId: string }): Promise<DriverDetail | null> {
  const [row] = await db
    .select({ p: driverProfiles, email: users.email })
    .from(driverProfiles)
    .innerJoin(users, eq(users.id, driverProfiles.userId))
    .where('driverId' in where ? eq(driverProfiles.id, where.driverId) : eq(driverProfiles.userId, where.userId))
    .limit(1)
  if (!row) return null
  const p = row.p
  const [vs, docs] = await Promise.all([
    db.select().from(vehicles).where(eq(vehicles.driverId, p.id)).orderBy(asc(vehicles.createdAt)),
    db.select().from(driverDocuments).where(eq(driverDocuments.driverId, p.id)).orderBy(desc(driverDocuments.createdAt)),
  ])
  return {
    profile: {
      id: p.id,
      userId: p.userId,
      email: row.email ?? '',
      displayName: p.displayName,
      phone: p.phone ?? '',
      licenceNumber: p.licenceNumber ?? '',
      licenceExpiry: p.licenceExpiry ?? '',
      emergencyContact: p.emergencyContact ?? '',
      verification: p.verification,
      verificationNote: p.verificationNote,
      verifiedAt: p.verifiedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    },
    vehicles: vs.map((v) => ({
      id: v.id,
      type: v.type,
      model: v.model,
      registrationNumber: v.registrationNumber,
      passengerSeats: v.passengerSeats,
      status: v.status,
    })),
    documents: docs.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      contentType: d.contentType,
      sizeBytes: d.sizeBytes,
      createdAt: d.createdAt.toISOString(),
    })),
  }
}
