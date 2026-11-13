// Session server functions — safe to import from routes and components.
import { createServerFn } from '@tanstack/react-start'
import { getSessionUser } from '@/server/session'
import { toPublicError } from '@/server/errors'

export type PublicSession = {
  id: string
  email: string
  name: string
  role: 'customer' | 'driver' | 'admin'
  status: 'active' | 'inactive' | 'suspended' | 'archived'
}

/** Current signed-in user with their server-verified role, or null. */
export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<PublicSession | null> => {
  try {
    const u = await getSessionUser()
    return u ? { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status } : null
  } catch (err) {
    throw toPublicError(err)
  }
})
