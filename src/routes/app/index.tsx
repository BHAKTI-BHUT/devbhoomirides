import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, ChevronRight, Ticket } from 'lucide-react'
import { SearchForm } from '@/components/SearchForm'
import { TripCard } from '@/components/TripCard'
import { popularRoutes } from '@/data/fixtures'
import { demoSeatsBooked, useDemoBookings } from '@/lib/demo-bookings'
import { formatTime, formatTripDate } from '@/lib/format'
import { t } from '@/lib/i18n'
import { getTrip, stopName, upcomingTrips } from '@/lib/trips'

export const Route = createFileRoute('/app/')({
  component: CustomerHome,
})

function CustomerHome() {
  const bookings = useDemoBookings()
  const active = bookings.filter((b) => b.status === 'confirmed')
  return (
    <div>
      <section className="contour-bg bg-pine-900 px-4 pb-24 pt-6">
        <p className="text-sm font-medium text-marigold">Namaste 🙏</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-snow">Where are you going?</h1>
      </section>
      <div className="-mt-20 px-4">
        <SearchForm />
      </div>

      <Section title={t('myBookings')} action={active.length ? { label: 'See all', to: '/app/bookings' } : undefined}>
        {active.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-white p-4 text-sm text-stone">
            <Ticket className="h-5 w-5 text-pine-700" /> No bookings yet. Search a ride to book your first seat.
          </div>
        ) : (
          <div className="space-y-2">
            {active.slice(0, 2).map((b) => {
              const trip = getTrip(b.tripId)!
              const pickup = trip.stops.find((s) => s.stopId === b.pickupStopId)!
              return (
                <Link key={b.id} to="/app/bookings" className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
                  <div>
                    <div className="text-xs font-semibold text-stone">{b.id}</div>
                    <div className="font-bold text-ink">{stopName(b.pickupStopId)} → {stopName(b.dropStopId)}</div>
                    <div className="text-sm text-stone">{formatTripDate(trip.date)}, {formatTime(pickup.eta)} · {b.seats} seat{b.seats > 1 ? 's' : ''}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-stone" />
                </Link>
              )
            })}
          </div>
        )}
      </Section>

      <Section title={t('popularRoutes')}>
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {popularRoutes.map((r) => (
            <Link
              key={`${r.from}-${r.to}`}
              to="/app/search"
              search={{ from: r.from, to: r.to }}
              className="flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-pine-900 hover:border-pine-700"
            >
              {stopName(r.from)} <ArrowRight className="h-3.5 w-3.5 text-marigold-dark" /> {stopName(r.to)}
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t('upcomingTrips')}>
        <div className="space-y-3">
          {upcomingTrips(5).map((trip) => (
            <TripCard key={trip.id} trip={trip} extraBooked={demoSeatsBooked(bookings, trip.id)} />
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: { label: string; to: '/app/bookings' }; children: React.ReactNode }) {
  return (
    <section className="mt-7 px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {action && <Link to={action.to} className="text-sm font-semibold text-pine-700">{action.label}</Link>}
      </div>
      {children}
    </section>
  )
}
