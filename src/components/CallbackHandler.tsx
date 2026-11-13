import { useEffect } from 'react'
import { handleAuthCallback } from '@netlify/identity'

const AUTH_HASH = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/
export const INVITE_TOKEN_KEY = 'devbhoomi-invite-token'
export const POST_CONFIRM_REDIRECT_KEY = 'devbhoomi-post-confirm-redirect'

/** Finishes email confirmation, password recovery, invites and OAuth redirects. */
export function CallbackHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!AUTH_HASH.test(window.location.hash)) return
    handleAuthCallback()
      .then((result) => {
        if (!result) return
        history.replaceState(null, '', window.location.pathname + window.location.search)
        if (result.type === 'recovery') window.location.href = '/login?mode=reset'
        else if (result.type === 'invite' && result.token) {
          sessionStorage.setItem(INVITE_TOKEN_KEY, result.token)
          window.location.href = '/login?mode=invite'
        } else if (result.type === 'confirmation') {
          const next = localStorage.getItem(POST_CONFIRM_REDIRECT_KEY)
          localStorage.removeItem(POST_CONFIRM_REDIRECT_KEY)
          const safe = next && next.startsWith('/') && !next.startsWith('//') ? `&redirect=${encodeURIComponent(next)}` : ''
          window.location.href = `/login?mode=confirmed${safe}`
        }
      })
      .catch(() => {
        window.location.href = '/login?mode=link-expired'
      })
  }, [])
  return <>{children}</>
}
