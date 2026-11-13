import { createFileRoute } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'
import { SearchForm } from '@/components/SearchForm'
import { TripCard } from '@/components/TripCard'
import { demoSeatsBooked, useDemoBookings } from '@/lib/demo-bookings'
import { formatTripDate } from '@/lib/format'
import { t } from '@/lib/i18n'
import { parseSearch } from '@/lib/search-params'
import { searchTrips, stopName } from '@/lib/trips'

export const Route = createFileRoute('/app/search')({
  validateSearch: parseSearch,
  component: SearchResults,
})

function SearchResults() {
  const query = Route.useSearch()
  const bookings = useDemoBookings()
  const { onDate, otherDates } = searchTrips(query)
  const hasQuery = query.from && query.to

  return (
    <div className="px-4 pt-4">
      <SearchForm key={`${query.from}-${query.to}-${query.date}`} initial={query} compact />

      {hasQuery && (
        <div className="mt-5">
          <h1 className="text-lg font-bold text-ink">
            {stopName(query.from!)} → {stopName(query.to!)}
          </h1>
          <p className="text-sm text-stone">
            {query.date ? formatTripDate(query.date) : 'All upcoming dates'} · {onDate.length} ride{onDate.length === 1 ? '' : 's'}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {onDate.map((trip) => (
          <TripCard key={trip.id} trip={trip} from={query.from} to={query.to} extraBooked={demoSeatsBooked(bookings, trip.id)} />
        ))}
      </div>

      {onDate.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-white p-6 text-center">
          <SearchX className="mx-auto h-8 w-8 text-stone" />
          <p className="mt-2 font-semibold text-ink">{t('noRides')}</p>
          <p className="text-sm text-stone">
            Rides only run in the driver's direction. Try another date, or search the return direction.
          </p>
        </div>
      )}

      {otherDates.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-base font-bold text-ink">{t('otherDates')}</h2>
          <div className="space-y-3">
            {otherDates.map((trip) => (
              <TripCard key={trip.id} trip={trip} from={query.from} to={query.to} extraBooked={demoSeatsBooked(bookings, trip.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
