// Admin-only server functions. Every handler is gated by adminMiddleware, so
// customers and drivers get "not authorized" before any data is read.
import { createServerFn } from '@tanstack/react-start'
import { getSettings } from '@netlify/identity'
import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { auditLogs, driverDocuments, driverProfiles, financialSettings, users, vehicles } from '../../db/schema.js'
import { adminMiddleware } from '@/middleware/auth'
import { AppError, toPublicError } from '@/server/errors'
import { loadDriverDetail, parseWith, type DriverDetail, type Verification } from '@/server/drivers'

export type SystemCheck = { label: string; ok: boolean; detail: string }
export type AdminOverview = {
  admin: { email: string; name: string }
  checks: SystemCheck[]
  roleCounts: Record<string, number>
}

export const getAdminOverview = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const checks: SystemCheck[] = []
    let roleCounts: Record<string, number> = { customer: 0, driver: 0, admin: 0 }

    try {
      const rows = await db.select({ role: users.role, n: sql<number>`count(*)::int` }).from(users).groupBy(users.role)
      roleCounts = { ...roleCounts, ...Object.fromEntries(rows.map((r) => [r.role, r.n])) }
      checks.push({ label: 'Database', ok: true, detail: 'Connected' })
    } catch {
      checks.push({ label: 'Database', ok: false, detail: 'Not connected' })
    }

    try {
      const [s] = await db.select().from(financialSettings).orderBy(desc(financialSettings.createdAt)).limit(1)
      checks.push(
        s
          ? { label: 'Migrations', ok: true, detail: `Applied · default commission ${Number(s.commissionRate)}%` }
          : { label: 'Migrations', ok: false, detail: 'Settings row missing' },
      )
    } catch {
      checks.push({ label: 'Migrations', ok: false, detail: 'Not applied' })
    }

    try {
      await getSettings()
      checks.push({ label: 'Authentication', ok: true, detail: 'Netlify Identity connected' })
    } catch {
      checks.push({ label: 'Authentication', ok: false, detail: 'Not connected' })
    }

    checks.push({
      label: 'Admin bootstrap',
      ok: true,
      detail: process.env.ADMIN_EMAILS ? 'ADMIN_EMAILS is set' : 'Using Identity “admin” role only (ADMIN_EMAILS not set)',
    })

    return { admin: { email: context.user.email, name: context.user.name }, checks, roleCounts }
  })

// ── Driver verification ──────────────────────────────────────────────────────
export type DriverQueueItem = {
  id: string
  displayName: string
  email: string
  phone: string
  verification: Verification
  vehicle: string
  documentCount: number
  createdAt: string
}

export const listDriversForReview = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async (): Promise<DriverQueueItem[]> => {
    try {
      const rows = await db
        .select({
          id: driverProfiles.id,
          displayName: driverProfiles.displayName,
          email: users.email,
          phone: driverProfiles.phone,
          verification: driverProfiles.verification,
          createdAt: driverProfiles.createdAt,
          vehicle: sql<string | null>`(select ${vehicles.model} || ' · ' || ${vehicles.registrationNumber} from ${vehicles} where ${vehicles.driverId} = ${driverProfiles.id} order by ${vehicles.createdAt} limit 1)`,
          documentCount: sql<number>`(select count(*)::int from ${driverDocuments} where ${driverDocuments.driverId} = ${driverProfiles.id})`,
        })
        .from(driverProfiles)
        .innerJoin(users, eq(users.id, driverProfiles.userId))
        .where(eq(driverProfiles.isDemo, false))
        .orderBy(desc(driverProfiles.createdAt))
        .limit(200)
      return rows.map((r) => ({
        ...r,
        email: r.email ?? '',
        phone: r.phone ?? '',
        vehicle: r.vehicle ?? '—',
        createdAt: r.createdAt.toISOString(),
      }))
    } catch (err) {
      throw toPublicError(err)
    }
  })

export const getDriverForReview = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .inputValidator(parseWith(z.object({ driverId: z.string().uuid() })))
  .handler(async ({ data }): Promise<DriverDetail> => {
    try {
      const detail = await loadDriverDetail({ driverId: data.driverId })
      if (!detail) throw new AppError('Driver not found.', 'not_found')
      return detail
    } catch (err) {
      throw toPublicError(err)
    }
  })

const ACTIONS = { approve: 'verified', reject: 'rejected', suspend: 'suspended', reactivate: 'verified' } as const

export const setDriverVerification = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(
    parseWith(
      z
        .object({
          driverId: z.string().uuid(),
          action: z.enum(['approve', 'reject', 'suspend', 'reactivate']),
          note: z.string().trim().max(500).optional(),
        })
        .refine((d) => d.action === 'approve' || d.action === 'reactivate' || !!d.note, {
          message: 'Add a reason so the driver knows what to fix.',
        }),
    ),
  )
  .handler(async ({ data, context }): Promise<{ verification: Verification }> => {
    try {
      const [current] = await db
        .select({ verification: driverProfiles.verification })
        .from(driverProfiles)
        .where(eq(driverProfiles.id, data.driverId))
        .limit(1)
      if (!current) throw new AppError('Driver not found.', 'not_found')
      const verification = ACTIONS[data.action]
      const approved = verification === 'verified'
      await db.transaction(async (tx) => {
        await tx
          .update(driverProfiles)
          .set({
            verification,
            verificationNote: data.note || null,
            ...(approved ? { verifiedAt: new Date(), verifiedBy: context.user.id } : {}),
          })
          .where(eq(driverProfiles.id, data.driverId))
        await tx.insert(auditLogs).values({
          actorId: context.user.id,
          actorEmail: context.user.email,
          action: `driver.${data.action}`,
          entityType: 'driver_profile',
          entityId: data.driverId,
          previous: { verification: current.verification },
          next: { verification, note: data.note ?? null },
        })
      })
      return { verification }
    } catch (err) {
      throw toPublicError(err)
    }
  })
