// Server function middleware: injects the verified app user into `context.user`.
import { createMiddleware } from '@tanstack/react-start'
import { requireRole, type Role } from '@/server/session'

export function requireRoleMiddleware(...roles: Role[]) {
  return createMiddleware().server(async ({ next }) => {
    const user = await requireRole(...roles)
    return next({ context: { user } })
  })
}

export const authMiddleware = requireRoleMiddleware()
export const adminMiddleware = requireRoleMiddleware('admin')
export const driverMiddleware = requireRoleMiddleware('driver', 'admin')
