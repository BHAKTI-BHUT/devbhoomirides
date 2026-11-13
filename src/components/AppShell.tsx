import { Link } from '@tanstack/react-router'
import { Home, Search, Ticket, UserRound } from 'lucide-react'
import { useIdentity } from '@/lib/identity-context'
import { t } from '@/lib/i18n'
import { Logo } from './Logo'
import { DemoBadge } from './DemoBadge'

/** Customer app frame: feels like a phone app even on desktop. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const tab = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-stone'
  const active = { className: `${tab} !text-pine-900` }
  return (
    <div className="min-h-screen bg-pine-100/60 md:py-6">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-snow md:min-h-[calc(100vh-3rem)] md:overflow-clip md:rounded-[2rem] md:shadow-2xl md:shadow-pine-900/20 md:ring-1 md:ring-line">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-snow/90 px-4 py-3 backdrop-blur">
          <Logo to="/app" />
          <div className="flex items-center gap-2">
            <DemoBadge label="PREVIEW" />
            <AccountLink />
          </div>
        </header>
        <main className="flex-1 pb-6">{children}</main>
        <nav className="sticky bottom-0 z-30 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <Link to="/app" activeOptions={{ exact: true }} className={tab} activeProps={active}>
            <Home className="h-5 w-5" /> {t('home')}
          </Link>
          <Link to="/app/search" search={{}} className={tab} activeProps={active}>
            <Search className="h-5 w-5" /> {t('search')}
          </Link>
          <Link to="/app/bookings" className={tab} activeProps={active}>
            <Ticket className="h-5 w-5" /> {t('myBookings')}
          </Link>
        </nav>
      </div>
    </div>
  )
}

function AccountLink() {
  const { user, ready } = useIdentity()
  if (!ready) return null
  return (
    <a
      href={user ? '/login' : '/login?redirect=/app'}
      className="flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-pine-900"
    >
      <UserRound className="h-3.5 w-3.5" /> {user ? 'Account' : 'Sign in'}
    </a>
  )
}
