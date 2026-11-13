// Netlify Identity event hook: assigns the starting role on signup.
// Emails in ADMIN_EMAILS get `admin`; everyone else starts as `customer`.
// Roles live in app_metadata, which users cannot edit themselves.
import type { UserSignupEvent } from '@netlify/functions'

export default {
  userSignup(event: UserSignupEvent) {
    const email = (event.user.email ?? '').toLowerCase()
    const admins = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    const existing = Array.isArray(event.user.appMetadata?.roles) ? (event.user.appMetadata.roles as string[]) : []
    const roles = admins.includes(email) ? ['admin'] : existing.length ? existing : ['customer']
    return { user: { ...event.user, appMetadata: { ...event.user.appMetadata, roles } } }
  },
}
