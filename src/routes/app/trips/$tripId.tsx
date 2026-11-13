import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { ArrowLeft, BadgeCheck, CheckCircle2, CreditCard, FlaskConical, Info, MessageCircle, Minus, Plus, ShieldCheck, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DemoBadge } from '@/components/DemoBadge'
import { RouteLine } from '@/components/RouteLine'
import { VehicleThumb } from '@/components/VehicleIcon'
import { platformSettings } from '@/data/fixtures'
import { addDemoBooking, demoSeatsBooked, nextBookingId, useDemoBookings } from '@/lib/demo-bookings'
import { formatRupees, formatTime, formatTripDate } from '@/lib/format'
import { t } from '@/lib/i18n'
import { parseSearch } from '@/lib/search-params'
import { calculateFare, dropOptions, getDriver, getTrip, getVehicle, isBookable, isValidSegment, pickupOptions, seatsLeft } from '@/lib/trips'
import type { Booking, Passenger, Trip } from '@/lib/types'

export const Route = createFileRoute('/app/trips/$tripId')({
  validateSearch: parseSearch,
  loader: ({ params }) => {
    const trip = getTrip(params.tripId)
    if (!trip) throw notFound()
    return { trip }
  },
  head: () => ({ meta: [{ title: 'Book Seat – Devbhoomi Rides' }] }),
  component: TripBooking,
  notFoundComponent: () => (
    <div className="p-6 text-center">
      <p className="font-semibold">This ride could not be found.</p>
      <Link to="/app" className="mt-3 inline-block font-semibold text-pine-700">Back to Home</Link>
    </div>
  ),
})

type Step = 'trip' | 'passengers' | 'pay' | 'done'
const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'trip', label: 'Ride' },
  { id: 'passengers', label: 'Passengers' },
  { id: 'pay', label: 'Pay' },
]

function TripBooking() {
  const { trip } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const bookings = useDemoBookings()
  const driver = getDriver(trip.driverId)!
  const vehicle = getVehicle(trip.vehicleId)!
  const left = seatsLeft(trip, demoSeatsBooked(bookings, trip.id))

  const initialPickup = search.from && pickupOptions(trip).some((s) => s.stopId === search.from) ? search.from : trip.stops[0].stopId
  const initialDrop = search.to && isValidSegment(trip, initialPickup, search.to) ? search.to : trip.stops[trip.stops.length - 1].stopId

  const [step, setStep] = useState<Step>('trip')
  const [pickupId, setPickupId] = useState(initialPickup)
  const [dropId, setDropId] = useState(initialDrop)
  const [pickupPoint, setPickupPoint] = useState(trip.stops.find((s) => s.stopId === initialPickup)!.pickupPoints[0])
  const [seats, setSeats] = useState(1)
  const [passengers, setPassengers] = useState<Passenger[]>([{ name: '', age: '', gender: '' }])
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)

  const fare = useMemo(() => calculateFare(trip.pricePerSeat, seats), [trip.pricePerSeat, seats])
  const pickup = trip.stops.find((s) => s.stopId === pickupId)!
  const drop = trip.stops.find((s) => s.stopId === dropId)!

  function changePickup(id: string) {
    setPickupId(id)
    setPickupPoint(trip.stops.find((s) => s.stopId === id)!.pickupPoints[0])
    // Keep drop valid: it must come after the new pickup.
    if (!isValidSegment(trip, id, dropId)) setDropId(dropOptions(trip, id)[0].stopId)
  }

  function changeSeats(n: number) {
    const next = Math.min(Math.max(1, n), left)
    setSeats(next)
    setPassengers((p) => Array.from({ length: next }, (_, i) => p[i] ?? { name: '', age: '', gender: '' }))
  }

  function toPassengers() {
    if (!isValidSegment(trip, pickupId, dropId)) return setError('Please choose a drop stop after your pickup stop.')
    if (seats > left) return setError(`Only ${left} seat${left === 1 ? '' : 's'} left on this ride.`)
    setError('')
    setStep('passengers')
  }

  function toPay() {
    if (passengers.some((p) => p.name.trim().length < 2)) return setError('Please enter a name for every passenger.')
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10))) return setError('Please enter a valid 10-digit mobile number.')
    setError('')
    setStep('pay')
  }

  function confirm() {
    // Re-check seats right before confirming (the server will do this atomically).
    const nowLeft = seatsLeft(trip, demoSeatsBooked(bookings, trip.id))
    if (seats > nowLeft) {
      setError(`Sorry, only ${nowLeft} seat${nowLeft === 1 ? ' is' : 's are'} left now. Please change the number of passengers.`)
      setStep('trip')
      return
    }
    const b: Booking = {
      id: nextBookingId(),
      tripId: trip.id,
      pickupStopId: pickupId,
      pickupPoint,
      dropStopId: dropId,
      seats,
      passengers,
      contactPhone: phone,
      fare,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMode: 'demo',
      createdAt: new Date().toISOString(),
    }
    addDemoBooking(b)
    setBooking(b)
    setStep('done')
  }

  const back = () => {
    setError('')
    if (step === 'passengers') setStep('trip')
    else if (step === 'pay') setStep('passengers')
    else router.history.back()
  }

  if (step === 'done' && booking) return <Confirmation booking={booking} trip={trip} />

  const input = 'w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-medium text-ink outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-100'
  const bookable = isBookable(trip, demoSeatsBooked(bookings, trip.id))

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white" aria-label={t('back')}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone">{formatTripDate(trip.date)} · {formatTime(trip.departureTime)} departure</div>
          <div className="font-bold text-ink">{trip.stops[0].name} → {trip.stops[trip.stops.length - 1].name}</div>
        </div>
      </div>

      <Stepper step={step} />

      {step === 'trip' && (
        <div className="space-y-4 px-4">
          <Card>
            <div className="flex items-center gap-3">
              <VehicleThumb type={vehicle.type} photoUrl={vehicle.photoUrl} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  {driver.name}
                  {driver.verification === 'verified' && <BadgeCheck className="h-4 w-4 text-river" />}
                  <DemoBadge />
                </div>
                <div className="flex items-center gap-1 text-sm text-stone">
                  <Star className="h-3.5 w-3.5 fill-marigold text-marigold" /> {driver.rating.toFixed(1)} ({driver.ratingCount} ratings) · {driver.completedTrips} trips
                </div>
                <div className="text-sm text-stone">{vehicle.model} · {vehicle.registrationNumber}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-pine-50 px-3 py-2 text-xs font-medium text-pine-800">
              <ShieldCheck className="h-4 w-4" /> {t('verifiedDriver')}. Phone number is shared after booking.
            </div>
          </Card>

          <Card title="Choose Pickup & Drop">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone">{t('pickup')}</span>
                <select value={pickupId} onChange={(e) => changePickup(e.target.value)} className={input}>
                  {pickupOptions(trip).map((s) => <option key={s.stopId} value={s.stopId}>{s.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone">{t('drop')}</span>
                <select value={dropId} onChange={(e) => setDropId(e.target.value)} className={input}>
                  {dropOptions(trip, pickupId).map((s) => <option key={s.stopId} value={s.stopId}>{s.name}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone">{t('pickupPoint')} in {pickup.name}</span>
              <select value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)} className={input}>
                {pickup.pickupPoints.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <div className="mt-4 rounded-xl border border-line bg-snow p-4">
              <RouteLine stops={trip.stops.map((s) => ({ id: s.stopId, name: s.name, eta: s.eta }))} pickupId={pickupId} dropId={dropId} />
            </div>
            <p className="mt-2 flex gap-1.5 text-xs text-stone">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" /> Times after departure are estimates.
            </p>
          </Card>

          <Card title={t('passengers')}>
            {bookable ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-ink">Number of seats</div>
                    <div className="text-sm text-stone">{left} of {trip.totalSeats} seats left</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StepBtn onClick={() => changeSeats(seats - 1)} disabled={seats <= 1} label="Remove seat"><Minus className="h-4 w-4" /></StepBtn>
                    <span className="w-6 text-center text-xl font-bold tabular-nums">{seats}</span>
                    <StepBtn onClick={() => changeSeats(seats + 1)} disabled={seats >= left} label="Add seat"><Plus className="h-4 w-4" /></StepBtn>
                  </div>
                </div>
                {seats >= left && <p className="mt-2 text-xs font-medium text-marigold-dark">That's all the seats left on this ride.</p>}
              </>
            ) : (
              <p className="font-semibold text-stone">This ride is fully booked. Please choose another ride.</p>
            )}
          </Card>

          <FareCard fare={fare} />
        </div>
      )}

      {step === 'passengers' && (
        <div className="space-y-4 px-4">
          {passengers.map((p, i) => (
            <Card key={i} title={`Passenger ${i + 1}`}>
              <div className="space-y-3">
                <input className={input} placeholder="Full name" value={p.name} onChange={(e) => setPassengers((ps) => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={input} placeholder="Age" inputMode="numeric" maxLength={3} value={p.age} onChange={(e) => setPassengers((ps) => ps.map((x, j) => (j === i ? { ...x, age: e.target.value.replace(/\D/g, '') } : x)))} />
                  <select className={input} value={p.gender} onChange={(e) => setPassengers((ps) => ps.map((x, j) => (j === i ? { ...x, gender: e.target.value as Passenger['gender'] } : x)))}>
                    <option value="">Gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </Card>
          ))}
          <Card title="Contact number">
            <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-pine-700">
              <span className="pl-3 font-semibold text-stone">+91</span>
              <input className="w-full rounded-xl bg-transparent px-2 py-3 text-base font-medium outline-none" placeholder="10-digit mobile number" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <p className="mt-2 text-xs text-stone">The driver uses this to reach you on the day of travel.</p>
          </Card>
        </div>
      )}

      {step === 'pay' && (
        <div className="space-y-4 px-4">
          <Card title={t('tripDetails')}>
            <dl className="space-y-2 text-sm">
              <Row k="Date" v={`${formatTripDate(trip.date)}`} />
              <Row k={t('pickup')} v={`${pickup.name} · ${pickupPoint} · ${formatTime(pickup.eta)}`} />
              <Row k={t('drop')} v={`${drop.name} · approx. ${formatTime(drop.eta)}`} />
              <Row k="Vehicle" v={`${vehicle.type} · ${vehicle.registrationNumber}`} />
              <Row k="Driver" v={driver.name} />
              <Row k={t('passengers')} v={passengers.map((p) => p.name).join(', ')} />
            </dl>
          </Card>
          <FareCard fare={fare} />
          <Card title={t('paymentMethod')}>
            <label className="flex items-start gap-3 rounded-xl border-2 border-pine-700 bg-pine-50 p-3">
              <input type="radio" checked readOnly className="mt-1 accent-pine-700" />
              <div>
                <div className="flex items-center gap-2 font-semibold text-ink"><FlaskConical className="h-4 w-4" /> Test payment <DemoBadge label="TEST MODE" /></div>
                <div className="text-xs text-stone">No money is charged. Use this to try the full booking flow.</div>
              </div>
            </label>
            <div className="mt-2 flex items-start gap-3 rounded-xl border border-line p-3 opacity-60">
              <input type="radio" disabled className="mt-1" />
              <div>
                <div className="flex items-center gap-2 font-semibold text-ink"><CreditCard className="h-4 w-4" /> UPI / Card / Net Banking</div>
                <div className="text-xs text-stone">Not configured yet. Online payment turns on once a payment gateway is connected.</div>
              </div>
            </div>
          </Card>
          <Card title="Cancellation policy">
            <ul className="space-y-1.5 text-sm">
              {platformSettings.cancellationRules.map((r) => (
                <li key={r.label} className="flex justify-between gap-3">
                  <span className="text-stone">{r.label}</span>
                  <span className="shrink-0 font-semibold text-ink">{r.refundPercent}% refund</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-stone">The booking fee is not refundable.</p>
          </Card>
        </div>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-14 z-20 mt-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
        {error && <p className="mb-2 text-sm font-medium text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-stone">{seats} seat{seats > 1 ? 's' : ''} · {pickup.name} → {drop.name}</div>
            <div className="text-lg font-bold text-pine-900">{formatRupees(fare.total)}</div>
          </div>
          {step === 'trip' && (
            <button onClick={toPassengers} disabled={!bookable} className="rounded-xl bg-marigold px-6 py-3.5 font-bold text-pine-950 hover:bg-marigold-dark hover:text-white disabled:cursor-not-allowed disabled:bg-line disabled:text-stone">
              {t('bookSeat')}
            </button>
          )}
          {step === 'passengers' && (
            <button onClick={toPay} className="rounded-xl bg-marigold px-6 py-3.5 font-bold text-pine-950 hover:bg-marigold-dark hover:text-white">{t('continue')}</button>
          )}
          {step === 'pay' && (
            <button onClick={confirm} className="rounded-xl bg-pine-900 px-5 py-3.5 font-bold text-snow hover:bg-pine-800">{t('payAndBook')}</button>
          )}
        </div>
      </div>
    </div>
  )
}

function Confirmation({ booking, trip }: { booking: Booking; trip: Trip }) {
  const driver = getDriver(trip.driverId)!
  const vehicle = getVehicle(trip.vehicleId)!
  const pickup = trip.stops.find((s) => s.stopId === booking.pickupStopId)!
  const drop = trip.stops.find((s) => s.stopId === booking.dropStopId)!
  const [contactNote, setContactNote] = useState(false)
  return (
    <div className="px-4 pt-6">
      <div className="rounded-3xl bg-pine-900 p-6 text-center text-snow">
        <CheckCircle2 className="mx-auto h-14 w-14 text-marigold" />
        <h1 className="mt-3 font-display text-2xl font-bold">{t('bookingConfirmed')}</h1>
        <p className="mt-1 text-snow/75">Your seats are booked. Have a safe journey!</p>
        <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3">
          <div className="text-xs uppercase tracking-wider text-snow/60">Booking ID</div>
          <div className="font-mono text-2xl font-bold tracking-wider">{booking.id}</div>
        </div>
      </div>

      <div className="relative -mt-3 rounded-b-3xl border border-t-0 border-line bg-white p-5 pt-7">
        <dl className="space-y-2 text-sm">
          <Row k="Date" v={formatTripDate(trip.date)} />
          <Row k={t('pickup')} v={`${pickup.name} · ${booking.pickupPoint} · ${formatTime(pickup.eta)}`} />
          <Row k={t('drop')} v={`${drop.name} · approx. ${formatTime(drop.eta)}`} />
          <Row k="Driver" v={driver.name} />
          <Row k="Vehicle" v={`${vehicle.model} · ${vehicle.registrationNumber}`} />
          <Row k="Seats" v={String(booking.seats)} />
          <Row k="Paid" v={`${formatRupees(booking.fare.total)} (test payment)`} />
        </dl>
      </div>

      <div className="mt-4 space-y-2">
        <button onClick={() => setContactNote(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-pine-700 bg-white py-3.5 font-bold text-pine-900">
          <MessageCircle className="h-5 w-5" /> {t('contactDriver')}
        </button>
        {contactNote && (
          <p className="rounded-xl bg-marigold-light px-3 py-2 text-sm text-marigold-dark">
            In-app chat and the driver's phone number open up once customer accounts are live. Your Booking ID is all the driver needs to find you.
          </p>
        )}
        <Link to="/app/bookings" className="flex w-full items-center justify-center rounded-xl bg-marigold py-3.5 font-bold text-pine-950">{t('myBookings')}</Link>
        <Link to="/app" className="block py-2 text-center font-semibold text-stone">Back to Home</Link>
      </div>
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.id === step)
  return (
    <ol className="my-4 flex gap-2 px-4">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex-1">
          <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-marigold' : 'bg-line'}`} />
          <div className={`mt-1 text-[11px] font-semibold ${i <= idx ? 'text-ink' : 'text-stone'}`}>{s.label}</div>
        </li>
      ))}
    </ol>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      {title && <h2 className="mb-3 font-bold text-ink">{title}</h2>}
      {children}
    </section>
  )
}

function FareCard({ fare }: { fare: ReturnType<typeof calculateFare> }) {
  return (
    <Card title={t('fareSummary')}>
      <dl className="space-y-2 text-sm">
        <Row k={`${fare.seats} seat${fare.seats > 1 ? 's' : ''} × ${formatRupees(fare.pricePerSeat)}`} v={formatRupees(fare.rideFare)} />
        <Row k="Booking fee" v={formatRupees(fare.bookingFee)} />
        <div className="flex justify-between border-t border-dashed border-line pt-2 text-base font-bold">
          <dt>Booking amount</dt>
          <dd className="text-pine-900">{formatRupees(fare.total)}</dd>
        </div>
      </dl>
    </Card>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-stone">{k}</dt>
      <dd className="text-right font-medium text-ink">{v}</dd>
    </div>
  )
}

function StepBtn({ onClick, disabled, label, children }: { onClick: () => void; disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-snow text-pine-900 disabled:opacity-40">
      {children}
    </button>
  )
}
