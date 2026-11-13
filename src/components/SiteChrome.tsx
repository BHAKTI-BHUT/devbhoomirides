import { Link } from '@tanstack/react-router'
import { t } from '@/lib/i18n'
import { Logo } from './Logo'

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo light />
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <a href="/#how-it-works" className="hidden px-3 py-2 text-snow/85 hover:text-snow md:block">How It Works</a>
          <a href="/#route" className="hidden px-3 py-2 text-snow/85 hover:text-snow md:block">The Route</a>
          <Link to="/drive" className="hidden px-3 py-2 text-snow/85 hover:text-snow sm:block">{t('driveWithUs')}</Link>
          <Link to="/app" className="rounded-full bg-snow px-4 py-2 text-pine-900 hover:bg-marigold">{t('findRide')}</Link>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-pine-950 text-snow/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-sm">Scheduled shared rides across the Garhwal hills. Book a seat, not a whole taxi.</p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold text-snow">Travel</div>
          <ul className="space-y-1.5">
            <li><Link to="/app/search" search={{ from: 'dehradun', to: 'karnaprayag' }} className="hover:text-snow">Dehradun to Karnaprayag</Link></li>
            <li><Link to="/app/search" search={{ from: 'karnaprayag', to: 'dehradun' }} className="hover:text-snow">Karnaprayag to Dehradun</Link></li>
            <li><Link to="/app/search" search={{ from: 'rishikesh', to: 'rudraprayag' }} className="hover:text-snow">Rishikesh to Rudraprayag</Link></li>
            <li><Link to="/app/search" search={{ from: 'dehradun', to: 'srinagar' }} className="hover:text-snow">Dehradun to Srinagar</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold text-snow">Company</div>
          <ul className="space-y-1.5">
            <li><Link to="/drive" className="hover:text-snow">Drive With Us</Link></li>
            <li><Link to="/app/bookings" className="hover:text-snow">My Bookings</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} Devbhoomi Rides · Uttarakhand</div>
    </footer>
  )
}
