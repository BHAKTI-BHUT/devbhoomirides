import { Link, createFileRoute } from '@tanstack/react-router'
import { Flag, MessageCircle, Star, Ticket, XCircle } from 'lucide-react'
import { useState } from 'react'
import { cancelDemoBooking, useDemoBookings } from '@/lib/demo-bookings'
import { formatRupees, formatTime, formatTripDate } from '@/lib/format'
import { t } from '@/lib/i18n'
import { getDriver, getTrip, getVehicle, refundFor, stopName } from '@/lib/trips'
import type { Booking, BookingStatus } from '@/lib/types'

export const Route = createFileRoute('/app/bookings')({
  head: () => ({ meta: [{ title: 'My Bookings – Devbhoomi Rides' }] }),
  component: MyBookings,
})

const statusStyle: Record<BookingStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-marigold-light text-marigold-dark' },
  confirmed: { label: 'Confirmed', cls: 'bg-pine-50 text-pine-700' },
  cancelled_by_customer: { label: 'Cancelled', cls: 'bg-red-50 text-red-700' },
  cancelled_by_driver: { label: 'Cancelled by driver', cls: 'bg-red-50 text-red-700' },
  completed: { label: 'Completed', cls: 'bg-river-light text-river' },
  no_show: { label: 'No show', cls: 'bg-line text-stone' },
  refund_pending: { label: 'Refund pending', cls: 'bg-marigold-light text-marigold-dark' },
  refunded: { label: 'Refunded', cls: 'bg-river-light text-river' },
}

function MyBookings() {
  const bookings = useDemoBookings()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const upcoming = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending')
  const past = bookings.filter((b) => !upcoming.includes(b))
  const list = tab === 'upcoming' ? upcoming : past

  return (
    <div className="px-4 pt-4">
      <h1 className="font-display text-2xl font-bold text-pine-900">{t('myBookings')}</h1>
      <div className="mt-4 flex rounded-xl bg-white p-1 ring-1 ring-line">
        {(['upcoming', 'past'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === k ? 'bg-pine-900 text-snow' : 'text-stone'}`}>
            {k === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past & cancelled (${past.length})`}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.map((b) => <BookingCard key={b.id} booking={b} />)}
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center">
            <Ticket className="mx-auto h-8 w-8 text-stone" />
            <p className="mt-2 font-semibold text-ink">{tab === 'upcoming' ? 'No upcoming bookings' : 'Nothing here yet'}</p>
            <Link to="/app/search" search={{ from: 'dehradun', to: 'karnaprayag' }} className="mt-3 inline-block rounded-xl bg-marigold px-5 py-2.5 font-bold text-pine-950">
              {t('searchButton')}
            </Link>
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-stone">Preview bookings are saved on this device only.</p>
    </div>
  )
}

function BookingCard({ booking: b }: { booking: Booking }) {
  const trip = getTrip(b.tripId)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [notice, setNotice] = useState('')
  if (!trip) return null
  const driver = getDriver(trip.driverId)!
  const vehicle = getVehicle(trip.vehicleId)!
  const pickup = trip.stops.find((s) => s.stopId === b.pickupStopId)!
  const refund = refundFor(trip, b.fare)
  const s = statusStyle[b.status]
  const active = b.status === 'confirmed' || b.status === 'pending'

  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs font-semibold text-stone">{b.id}</div>
          <div className="mt-0.5 font-bold text-ink">{stopName(b.pickupStopId)} → {stopName(b.dropStopId)}</div>
          <div className="text-sm text-stone">{formatTripDate(trip.date)}, {formatTime(pickup.eta)} · {b.pickupPoint}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>
      </div>
      <div className="mt-3 flex justify-between border-t border-dashed border-line pt-3 text-sm">
        <span className="text-stone">{driver.name} · {vehicle.type} {vehicle.registrationNumber}</span>
        <span className="font-semibold">{b.seats} seat{b.seats > 1 ? 's' : ''} · {formatRupees(b.fare.total)}</span>
      </div>
      {b.refundAmount !== undefined && (
        <p className="mt-2 text-sm text-stone">Refund: <span className="font-semibold text-ink">{formatRupees(b.refundAmount)}</span> {b.refundAmount > 0 ? '(refund pending)' : '(no refund as per policy)'}</p>
      )}

      {active && !confirmCancel && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setNotice('Chat and the driver\'s phone number open up once customer accounts are live.')} className="flex items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-sm font-semibold text-pine-900">
            <MessageCircle className="h-4 w-4" /> {t('contactDriver')}
          </button>
          <button onClick={() => setConfirmCancel(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-700">
            <XCircle className="h-4 w-4" /> {t('cancelBooking')}
          </button>
        </div>
      )}

      {active && confirmCancel && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm">
          <p className="font-semibold text-red-800">Cancel this booking?</p>
          <p className="mt-1 text-red-800/80">
            {refund.rule.label}: {refund.rule.refundPercent}% of the ride fare is refunded — <strong>{formatRupees(refund.amount)}</strong>. Booking fee is not refunded.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirmCancel(false)} className="rounded-lg bg-white py-2 font-semibold text-ink ring-1 ring-line">Keep booking</button>
            <button onClick={() => cancelDemoBooking(b.id, refund.amount)} className="rounded-lg bg-red-700 py-2 font-semibold text-white">Yes, cancel</button>
          </div>
        </div>
      )}

      {!active && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setNotice('Ratings open after a trip is marked completed by the driver.')} className="flex items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-sm font-semibold text-stone">
            <Star className="h-4 w-4" /> Rate driver
          </button>
          <button onClick={() => setNotice('Reporting an issue goes live with customer accounts. For now, keep your Booking ID handy.')} className="flex items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-sm font-semibold text-stone">
            <Flag className="h-4 w-4" /> Report issue
          </button>
        </div>
      )}
      {notice && <p className="mt-2 rounded-lg bg-marigold-light px-3 py-2 text-xs text-marigold-dark">{notice}</p>}
    </article>
  )
}
