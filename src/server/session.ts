// Server-only: resolves the signed-in Netlify Identity user to an app user row and
// enforces role-based access. Every protected server function goes through here.
import { getIdentityUser } from './identity-session'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users } from '../../db/schema.js'
import { AppError, MESSAGES } from './errors'

export type Role = 'customer' | 'driver' | 'admin'
export type SessionUser = {
  id: string
  identityId: string
  email: string
  name: string
  role: Role
  status: 'active' | 'inactive' | 'suspended' | 'archived'
}

/** Emails listed in the ADMIN_EMAILS env var (comma-separated) are bootstrapped as admins. */
export function isBootstrapAdmin(email: string | undefined | null) {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

function resolveRole(identityRoles: string[], email: string, existing: Role | undefined): Role {
  if (identityRoles.includes('admin') || isBootstrapAdmin(email)) return 'admin'
  if (identityRoles.includes('driver') || existing === 'driver') return 'driver'
  return 'customer'
}

/**
 * Returns the current user (creating/updating their `users` row) or null when signed out.
 * Admin rights are never read from the database alone — they must come from the Identity
 * `admin` role or ADMIN_EMAILS, so a stale DB row can't keep someone an admin.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const identity = await getIdentityUser()
  if (!identity?.id || !identity.email) return null
  const email = identity.email.toLowerCase()
  const name = identity.name ?? (identity.userMetadata?.full_name as string | undefined) ?? ''

  const [existing] = await db.select({ role: users.role }).from(users).where(eq(users.identityId, identity.id)).limit(1)
  const role = resolveRole(identity.roles ?? [], email, existing?.role)

  const [row] = await db
    .insert(users)
    .values({ identityId: identity.id, email, name, role, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: users.identityId,
      set: { email, name: sql`coalesce(nullif(${name}, ''), ${users.name})`, role, lastSeenAt: new Date() },
    })
    .returning()

  return { id: row.id, identityId: identity.id, email, name: row.name, role: row.role, status: row.status }
}

/** Throws a friendly error unless the user is signed in, active, and has one of `roles`. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new AppError(MESSAGES.unauthenticated, 'unauthenticated')
  if (user.status !== 'active') throw new AppError(MESSAGES.suspended, 'suspended')
  if (roles.length && !roles.includes(user.role)) throw new AppError(MESSAGES.forbidden, 'forbidden')
  return user
}

export const requireUser = () => requireRole()
export const requireAdmin = () => requireRole('admin')
