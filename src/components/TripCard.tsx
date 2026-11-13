import { Link } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck, Star } from 'lucide-react'
import { formatRupees, formatTime, formatTripDate } from '@/lib/format'
import { t } from '@/lib/i18n'
import { getDriver, getVehicle, isBookable, seatsLeft, stopIndex } from '@/lib/trips'
import type { Trip } from '@/lib/types'
import { VehicleThumb } from './VehicleIcon'

export function TripCard({
  trip,
  from,
  to,
  extraBooked = 0,
}: {
  trip: Trip
  from?: string
  to?: string
  extraBooked?: number
}) {
  const driver = getDriver(trip.driverId)!
  const vehicle = getVehicle(trip.vehicleId)!
  const pickup = trip.stops[from ? Math.max(0, stopIndex(trip, from)) : 0]
  const drop = trip.stops[to && stopIndex(trip, to) !== -1 ? stopIndex(trip, to) : trip.stops.length - 1]
  const left = seatsLeft(trip, extraBooked)
  const open = isBookable(trip, extraBooked)

  return (
    <Link
      to="/app/trips/$tripId"
      params={{ tripId: trip.id }}
      search={{ from: pickup.stopId, to: drop.stopId }}
      className={`block rounded-2xl border bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pine-900/5 ${
        open ? 'border-line' : 'border-line opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-stone">
            {formatTripDate(trip.date)}
            {trip.isReturn && <span className="ml-2 rounded bg-river-light px-1.5 py-0.5 text-[10px] text-river">Return trip</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-lg font-bold text-ink">
            <span>{formatTime(pickup.eta)}</span>
            <ArrowRight className="h-4 w-4 text-stone" />
            <span className="text-stone">{formatTime(drop.eta)}</span>
          </div>
          <div className="text-sm text-ink">
            {pickup.name} → {drop.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-pine-900">{formatRupees(trip.pricePerSeat)}</div>
          <div className="text-xs text-stone">{t('perSeat')}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-dashed border-line pt-3">
        <VehicleThumb type={vehicle.type} photoUrl={vehicle.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 font-semibold text-ink">
            <span className="truncate">{driver.name}</span>
            {driver.verification === 'verified' && <BadgeCheck className="h-4 w-4 shrink-0 text-river" aria-label={t('verifiedDriver')} />}
          </div>
          <div className="flex items-center gap-1 text-xs text-stone">
            <Star className="h-3.5 w-3.5 fill-marigold text-marigold" />
            {driver.rating.toFixed(1)} · {vehicle.type} · {vehicle.registrationNumber}
          </div>
        </div>
        <div className="text-right">
          {open ? (
            <span className={`text-sm font-bold ${left <= 2 ? 'text-marigold-dark' : 'text-pine-700'}`}>
              {left} {left === 1 ? t('seatAvailable') : t('seatsAvailable')}
            </span>
          ) : (
            <span className="text-sm font-bold text-stone">{t('fullyBooked')}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
