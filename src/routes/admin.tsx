import { createFileRoute, redirect } from '@tanstack/react-router'
import { CheckCircle2, LogOut, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { DriverVerification } from '@/components/admin/DriverVerification'
import { getAdminOverview, listDriversForReview, type AdminOverview, type DriverQueueItem } from '@/lib/admin.functions'
import { getSession, type PublicSession } from '@/lib/auth.functions'
import { useIdentity } from '@/lib/identity-context'

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Admin Panel – Devbhoomi Rides' }, { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login', search: { redirect: '/admin' } })
    return { session }
  },
  // The page guard is for UX; getAdminOverview re-checks the admin role on the server.
  loader: async ({ context }): Promise<AdminLoaderData> => {
    if (context.session.role !== 'admin' || context.session.status !== 'active') return { denied: true as const, session: context.session }
    const [overview, drivers] = await Promise.all([getAdminOverview(), listDriversForReview()])
    return { denied: false as const, session: context.session, overview, drivers }
  },
  component: AdminPage,
})

type AdminLoaderData =
  | { denied: true; session: PublicSession }
  | { denied: false; session: PublicSession; overview: AdminOverview; drivers: DriverQueueItem[] }

function AdminPage() {
  const data = Route.useLoaderData() as AdminLoaderData
  const { logout } = useIdentity()
  const signOut = () => logout().then(() => (window.location.href = '/'))

  if (data.denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-snow px-4">
        <div className="max-w-sm rounded-2xl border border-line bg-white p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-700" />
          <h1 className="mt-3 text-lg font-bold text-ink">Access denied</h1>
          <p className="mt-1 text-sm text-stone">
            You are not authorized to perform this action. The Admin Panel is only available to Devbhoomi Rides administrators.
          </p>
          <p className="mt-3 text-xs text-stone">Signed in as {data.session.email} ({data.session.role})</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href="/app" className="rounded-xl bg-marigold py-2.5 font-bold text-pine-950">Go to app</a>
            <button onClick={signOut} className="rounded-xl border border-line py-2.5 font-semibold text-ink">Sign out</button>
          </div>
        </div>
      </div>
    )
  }

  const { overview } = data
  return (
    <div className="min-h-screen bg-snow">
      <header className="flex items-center justify-between border-b border-line bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Logo to="/admin" />
          <span className="rounded-full bg-pine-900 px-2.5 py-0.5 text-xs font-bold tracking-wide text-snow">ADMIN</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-stone">{overview.admin.email}</span>
          <button onClick={signOut} className="flex items-center gap-1.5 font-semibold text-pine-900">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-pine-900">
          <ShieldCheck className="h-6 w-6 text-river" /> Admin Panel
        </h1>
        <p className="mt-1 text-stone">Welcome, {overview.admin.name || overview.admin.email}. Access verified on the server.</p>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {(['customer', 'driver', 'admin'] as const).map((r) => (
            <div key={r} className="rounded-2xl border border-line bg-white p-5">
              <div className="text-sm font-semibold capitalize text-stone">{r}s</div>
              <div className="mt-1 text-3xl font-bold text-pine-900 tabular-nums">{overview.roleCounts[r] ?? 0}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-bold text-ink">System status</h2>
          <ul className="mt-3 divide-y divide-line">
            {overview.checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2 font-semibold text-ink">
                  {c.ok ? <CheckCircle2 className="h-4 w-4 text-pine-700" /> : <XCircle className="h-4 w-4 text-red-700" />}
                  {c.label}
                </span>
                <span className={c.ok ? 'text-stone' : 'font-semibold text-red-700'}>{c.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <DriverVerification drivers={data.drivers} />

        <p className="mt-6 rounded-xl bg-marigold-light px-4 py-3 text-sm text-marigold-dark">
          Dashboard, bookings, payments, wallets, payouts and reports sections arrive in the next milestone.
        </p>
      </main>
    </div>
  )
}
