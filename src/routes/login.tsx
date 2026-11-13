import { createFileRoute } from '@tanstack/react-router'
import { AuthError, MissingIdentityError, acceptInvite, login, requestPasswordRecovery, signup, updateUser } from '@netlify/identity'
import { useState } from 'react'
import { INVITE_TOKEN_KEY, POST_CONFIRM_REDIRECT_KEY } from '@/components/CallbackHandler'
import { Logo } from '@/components/Logo'
import { useIdentity } from '@/lib/identity-context'

type Mode = 'signin' | 'signup' | 'forgot' | 'reset' | 'invite' | 'confirmed' | 'link-expired'
const MODES: Mode[] = ['signin', 'signup', 'forgot', 'reset', 'invite', 'confirmed', 'link-expired']

export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: MODES.includes(s.mode as Mode) ? (s.mode as Mode) : undefined,
    // Only same-site paths, so the redirect can't send people to another domain.
    redirect: typeof s.redirect === 'string' && s.redirect.startsWith('/') && !s.redirect.startsWith('//') ? s.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: 'Sign in – Devbhoomi Rides' }] }),
  component: LoginPage,
})

function friendly(err: unknown) {
  if (err instanceof MissingIdentityError) return 'Sign-in is not available on this preview yet. Please try the deployed site.'
  if (err instanceof AuthError) {
    if (err.status === 401) return 'Invalid email or password.'
    if (err.status === 403) return 'New sign-ups are closed. Please contact Devbhoomi Rides for an invite.'
    if (err.status === 422) return 'Please check your email and use a password of at least 8 characters.'
    if (/confirm/i.test(err.message)) return 'Please confirm your email first — check your inbox for the link.'
  }
  return 'Something went wrong. Please try again.'
}

function LoginPage() {
  const search = Route.useSearch()
  const { user, ready, logout } = useIdentity()
  const [mode, setMode] = useState<Mode>(search.mode ?? 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(
    search.mode === 'confirmed'
      ? 'Your email is confirmed and you are signed in.'
      : search.mode === 'link-expired'
        ? 'That link has expired or was already used. Please try again.'
        : search.redirect === '/driver'
          ? 'Sign in, or create an account, to register as a driver.'
          : '',
  )
  const next = search.redirect ?? '/app'
  // Full navigation so the server sees the fresh nf_jwt cookie.
  const go = () => (window.location.href = next)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signin') return run(async () => { await login(email, password); go() })
    if (mode === 'signup')
      return run(async () => {
        const u = await signup(email, password, { full_name: name })
        if (u.confirmedAt) go()
        else {
          // Bring the user back here (e.g. driver registration) after they confirm their email.
          if (search.redirect) localStorage.setItem(POST_CONFIRM_REDIRECT_KEY, search.redirect)
          setNotice(`We sent a confirmation link to ${email}. Open it to finish creating your account.`)
          setMode('signin')
        }
      })
    if (mode === 'forgot')
      return run(async () => {
        await requestPasswordRecovery(email)
        setNotice(`If an account exists for ${email}, a password reset link is on its way.`)
        setMode('signin')
      })
    if (mode === 'reset') return run(async () => { await updateUser({ password }); go() })
    if (mode === 'invite')
      return run(async () => {
        const token = sessionStorage.getItem(INVITE_TOKEN_KEY)
        if (!token) throw new AuthError('missing invite')
        await acceptInvite(token, password)
        sessionStorage.removeItem(INVITE_TOKEN_KEY)
        go()
      })
  }

  const input = 'w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-medium text-ink outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-100'
  const titles: Record<Mode, string> = {
    signin: 'Sign in',
    signup: 'Create your account',
    forgot: 'Reset your password',
    reset: 'Set a new password',
    invite: 'Accept your invite',
    confirmed: 'Sign in',
    'link-expired': 'Sign in',
  }
  const formMode: Mode = mode === 'confirmed' || mode === 'link-expired' ? 'signin' : mode

  return (
    <div className="flex min-h-screen items-center justify-center bg-pine-100/60 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-xl shadow-pine-900/10">
          {ready && user && formMode !== 'reset' && formMode !== 'invite' ? (
            <div className="text-center">
              <p className="font-semibold text-ink">Signed in as {user.email}</p>
              {notice && <p className="mt-2 text-sm text-pine-700">{notice}</p>}
              <button onClick={go} className="mt-4 w-full rounded-xl bg-marigold py-3 font-bold text-pine-950">Continue</button>
              <button onClick={() => logout().then(() => (window.location.href = '/login'))} className="mt-2 w-full py-2 text-sm font-semibold text-stone">
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <h1 className="font-display text-xl font-bold text-pine-900">{titles[formMode]}</h1>
              {notice && <p className="rounded-lg bg-pine-50 px-3 py-2 text-sm text-pine-800">{notice}</p>}
              {formMode === 'signup' && <input className={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />}
              {(formMode === 'signin' || formMode === 'signup' || formMode === 'forgot') && (
                <input className={input} type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              )}
              {formMode !== 'forgot' && (
                <input
                  className={input}
                  type="password"
                  autoComplete={formMode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder={formMode === 'signin' ? 'Password' : 'New password (min. 8 characters)'}
                  minLength={formMode === 'signin' ? undefined : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
              {error && <p className="text-sm font-medium text-red-700">{error}</p>}
              <button disabled={busy} className="w-full rounded-xl bg-pine-900 py-3 font-bold text-snow hover:bg-pine-800 disabled:opacity-60">
                {busy ? 'Please wait…' : titles[formMode]}
              </button>
              <div className="flex justify-between pt-1 text-sm font-semibold text-pine-700">
                {formMode === 'signin' ? (
                  <>
                    <button type="button" onClick={() => setMode('signup')}>Create account</button>
                    <button type="button" onClick={() => setMode('forgot')}>Forgot password?</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
