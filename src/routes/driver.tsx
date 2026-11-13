import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { BadgeCheck, CalendarPlus, Car, FileUp, LogOut, ShieldAlert, Users } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/Logo'
import { getSession } from '@/lib/auth.functions'
import {
  createDriverTrip,
  getDriverDashboard,
  registerDriver,
  uploadDriverDocument,
  type DriverDashboard,
  type DriverTrip,
} from '@/lib/driver.functions'
import { formatRupees, formatTime, formatTripDate, todayISO } from '@/lib/format'
import { DOC_LABELS, VERIFICATION_STYLE } from '@/lib/driver-labels'
import { useIdentity } from '@/lib/identity-context'
import type { DriverDetail } from '@/server/drivers'

export const Route = createFileRoute('/driver')({
  head: () => ({ meta: [{ title: 'Driver – Devbhoomi Rides' }, { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login', search: { redirect: '/driver' } })
    return { session }
  },
  // Page guard is UX only; every driver server function re-checks role and verification.
  loader: async ({ context }) => {
    if (context.session.status !== 'active') return { blocked: true as const }
    return { blocked: false as const, dashboard: await getDriverDashboard() }
  },
  component: DriverPage,
})

const input =
  'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base font-medium text-ink outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-100'
const card = 'rounded-2xl border border-line bg-white p-4'
const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.')

function DriverPage() {
  const data = Route.useLoaderData()
  const { logout } = useIdentity()
  const signOut = () => logout().then(() => (window.location.href = '/'))

  return (
    <div className="min-h-screen bg-pine-100/60 md:py-6">
      <div className="mx-auto min-h-screen max-w-lg bg-snow md:min-h-0 md:rounded-[2rem] md:pb-6 md:shadow-2xl md:shadow-pine-900/20 md:ring-1 md:ring-line">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <Logo to="/drive" />
          <button onClick={signOut} className="flex items-center gap-1.5 text-sm font-semibold text-pine-900">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </header>
        <main className="space-y-4 px-4 py-5">
          {data.blocked ? (
            <div className={`${card} text-center`}>
              <ShieldAlert className="mx-auto h-9 w-9 text-red-700" />
              <p className="mt-2 font-semibold text-ink">Your account is suspended. Please contact Devbhoomi Rides support.</p>
            </div>
          ) : data.dashboard.detail ? (
            <Dashboard dashboard={data.dashboard} detail={data.dashboard.detail} />
          ) : (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-pine-900">Register as a driver</h1>
                <p className="mt-1 text-sm text-stone">
                  Signed in as {data.dashboard.email}. Add your licence and vehicle details — our team verifies every driver before their first trip goes live.
                </p>
              </div>
              <RegistrationForm dashboard={data.dashboard} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function RegistrationForm({ dashboard, onDone }: { dashboard: DriverDashboard; onDone?: () => void }) {
  const router = useRouter()
  const p = dashboard.detail?.profile
  const v = dashboard.detail?.vehicles[0]
  const [emName = '', emPhone = ''] = (p?.emergencyContact ?? '').split(' · ')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setBusy(true)
    setError('')
    try {
      await registerDriver({
        data: {
          displayName: f.displayName,
          phone: f.phone,
          licenceNumber: f.licenceNumber,
          licenceExpiry: f.licenceExpiry,
          emergencyName: f.emergencyName,
          emergencyPhone: f.emergencyPhone,
          vehicleType: f.vehicleType,
          vehicleModel: f.vehicleModel,
          registrationNumber: f.registrationNumber,
          passengerSeats: Number(f.passengerSeats),
        },
      })
      await router.invalidate()
      onDone?.()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const label = 'block text-sm font-semibold text-ink'
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset className={`${card} space-y-3`}>
        <legend className="px-1 font-bold text-pine-900">Your details</legend>
        <label className={label}>Full name (as on licence)<input name="displayName" className={`${input} mt-1`} defaultValue={p?.displayName ?? dashboard.name} required /></label>
        <label className={label}>Mobile number<input name="phone" type="tel" inputMode="tel" className={`${input} mt-1`} placeholder="98765 43210" defaultValue={p?.phone} required /></label>
        <label className={label}>Email<input className={`${input} mt-1 bg-snow text-stone`} value={dashboard.email} readOnly /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>Licence number<input name="licenceNumber" className={`${input} mt-1`} placeholder="UK07 20190012345" defaultValue={p?.licenceNumber} required /></label>
          <label className={label}>Licence expiry<input name="licenceExpiry" type="date" min={todayISO()} className={`${input} mt-1`} defaultValue={p?.licenceExpiry} required /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>Emergency contact<input name="emergencyName" className={`${input} mt-1`} placeholder="Name" defaultValue={emName} required /></label>
          <label className={label}>Their mobile<input name="emergencyPhone" type="tel" inputMode="tel" className={`${input} mt-1`} defaultValue={emPhone} required /></label>
        </div>
      </fieldset>

      <fieldset className={`${card} space-y-3`}>
        <legend className="px-1 font-bold text-pine-900">Your vehicle</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Vehicle type
            <select name="vehicleType" className={`${input} mt-1`} defaultValue={v?.type ?? ''} required>
              <option value="" disabled>Choose</option>
              {['Bolero', 'Ertiga', 'Innova', 'Scorpio', 'Sumo', 'Tempo Traveller', 'Other SUV', 'Other'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={label}>Passenger seats<input name="passengerSeats" type="number" min={1} max={20} className={`${input} mt-1`} defaultValue={v?.passengerSeats ?? 6} required /></label>
        </div>
        <label className={label}>Vehicle model<input name="vehicleModel" className={`${input} mt-1`} placeholder="Mahindra Bolero Neo" defaultValue={v?.model} required /></label>
        <label className={label}>Registration number<input name="registrationNumber" className={`${input} mt-1 uppercase`} placeholder="UK07 TA 4521" defaultValue={v?.registrationNumber} required /></label>
      </fieldset>

      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-marigold py-3 font-bold text-pine-950 disabled:opacity-60">
        {busy ? 'Please wait…' : p ? 'Resubmit for verification' : 'Submit for verification'}
      </button>
      <p className="text-center text-xs text-stone">You can upload your licence, RC and photos on the next screen.</p>
    </form>
  )
}

function Dashboard({ dashboard, detail }: { dashboard: DriverDashboard; detail: DriverDetail }) {
  const { profile } = detail
  const [editing, setEditing] = useState(false)
  const status = VERIFICATION_STYLE[profile.verification]
  const canEdit = profile.verification === 'pending' || profile.verification === 'rejected'

  if (editing) return <RegistrationForm dashboard={dashboard} onDone={() => setEditing(false)} />

  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-bold text-pine-900">Namaste, {profile.displayName.split(' ')[0]}</h1>
        <p className="text-sm text-stone">{profile.email}</p>
      </div>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-ink"><BadgeCheck className="h-5 w-5 text-river" /> Verification</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.cls}`}>{status.label}</span>
        </div>
        <p className="mt-2 text-sm text-stone">
          {profile.verification === 'pending' && 'Our team is reviewing your details. Upload your driving licence and vehicle RC below to speed this up. You can publish trips once verified.'}
          {profile.verification === 'verified' && 'You are verified. You can publish trips and see your passengers here.'}
          {profile.verification === 'rejected' && 'Your application needs changes. Update your details or documents and resubmit.'}
          {profile.verification === 'suspended' && 'Your driver account is suspended. Please contact Devbhoomi Rides support.'}
        </p>
        {profile.verificationNote && profile.verification !== 'verified' && (
          <p className="mt-2 rounded-lg bg-snow px-3 py-2 text-sm text-ink"><span className="font-semibold">Note from our team:</span> {profile.verificationNote}</p>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3 text-sm">
          <Item k="Mobile" v={profile.phone} />
          <Item k="Licence" v={profile.licenceNumber} />
          <Item k="Licence expiry" v={profile.licenceExpiry} />
          <Item k="Emergency contact" v={profile.emergencyContact} />
        </dl>
        {canEdit && (
          <button onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-pine-700">Edit details</button>
        )}
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 font-bold text-ink"><Car className="h-5 w-5 text-river" /> Vehicle</h2>
        {detail.vehicles.map((v) => (
          <dl key={v.id} className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Item k="Type" v={v.type} />
            <Item k="Model" v={v.model} />
            <Item k="Registration" v={v.registrationNumber} />
            <Item k="Passenger seats" v={String(v.passengerSeats)} />
          </dl>
        ))}
      </section>

      <Documents detail={detail} locked={profile.verification === 'suspended'} />

      {profile.verification === 'verified' ? (
        <CreateTrip dashboard={dashboard} detail={detail} />
      ) : (
        <section className={`${card} bg-snow`}>
          <h2 className="flex items-center gap-2 font-bold text-ink"><CalendarPlus className="h-5 w-5 text-stone" /> Publish a trip</h2>
          <p className="mt-1 text-sm text-stone">Trip publishing unlocks after Devbhoomi Rides approves your profile.</p>
        </section>
      )}

      <TripList trips={dashboard.trips} />
    </>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-stone">{k}</dt>
      <dd className="font-semibold text-ink">{v || '—'}</dd>
    </div>
  )
}

function Documents({ detail, locked }: { detail: DriverDetail; locked: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const uploaded = new Set(detail.documents.map((d) => d.type))
  const missing = (['driving_licence', 'vehicle_rc', 'profile_photo', 'vehicle_photo'] as const).filter((t) => !uploaded.has(t))

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setError('')
    try {
      await uploadDriverDocument({ data: new FormData(form) })
      form.reset()
      await router.invalidate()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 font-bold text-ink"><FileUp className="h-5 w-5 text-river" /> Documents</h2>
      {detail.documents.length > 0 ? (
        <ul className="mt-2 divide-y divide-line text-sm">
          {detail.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2">
              <span><span className="font-semibold text-ink">{DOC_LABELS[d.type]}</span> <span className="text-stone">· {d.fileName}</span></span>
              <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="font-semibold text-pine-700">View</a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-stone">No documents uploaded yet.</p>
      )}
      {missing.length > 0 && <p className="mt-2 text-xs text-marigold-dark">Still needed: {missing.map((t) => DOC_LABELS[t]).join(', ')}</p>}
      {!locked && (
        <form onSubmit={upload} className="mt-3 space-y-2 border-t border-line pt-3">
          <div className="grid grid-cols-2 gap-2">
            <select name="type" className={input} defaultValue={missing[0] ?? 'other'}>
              {Object.entries(DOC_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-pine-50 file:px-3 file:py-2 file:font-semibold file:text-pine-900" />
          </div>
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-pine-900 py-2.5 font-bold text-snow disabled:opacity-60">{busy ? 'Uploading…' : 'Upload document'}</button>
          <p className="text-xs text-stone">JPG, PNG, WebP or PDF, up to 5 MB. Only you and Devbhoomi Rides staff can view these.</p>
        </form>
      )}
    </section>
  )
}

function CreateTrip({ dashboard, detail }: { dashboard: DriverDashboard; detail: DriverDetail }) {
  const router = useRouter()
  const vehicles = detail.vehicles.filter((v) => v.status === 'active')
  const [routeId, setRouteId] = useState(dashboard.routes[0]?.id ?? '')
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const route = dashboard.routes.find((r) => r.id === routeId)
  const maxSeats = vehicles.find((v) => v.id === vehicleId)?.passengerSeats ?? 1

  if (!route || !vehicles.length)
    return (
      <section className={card}>
        <h2 className="font-bold text-ink">Publish a trip</h2>
        <p className="mt-1 text-sm text-stone">{!route ? 'No routes are open yet. Please check back soon.' : 'Add an active vehicle to publish trips.'}</p>
      </section>
    )

  const first = route.stops[0].name
  const last = route.stops[route.stops.length - 1].name

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await createDriverTrip({
        data: {
          routeId,
          vehicleId,
          direction: f.direction as 'forward' | 'return',
          date: f.date,
          departureTime: f.departureTime,
          totalSeats: Number(f.totalSeats),
          pricePerSeat: Number(f.pricePerSeat),
        },
      })
      form.reset()
      setNotice('Trip published. Passengers can now book seats.')
      await router.invalidate()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const label = 'block text-sm font-semibold text-ink'
  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <h2 className="flex items-center gap-2 font-bold text-ink"><CalendarPlus className="h-5 w-5 text-river" /> Publish a trip</h2>
      {dashboard.routes.length > 1 && (
        <label className={label}>Route
          <select className={`${input} mt-1`} value={routeId} onChange={(e) => setRouteId(e.target.value)}>
            {dashboard.routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
      )}
      <label className={label}>Direction
        <select name="direction" className={`${input} mt-1`} defaultValue="forward">
          <option value="forward">{first} → {last}</option>
          <option value="return">{last} → {first}</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>Date<input name="date" type="date" min={todayISO()} defaultValue={todayISO(1)} className={`${input} mt-1`} required /></label>
        <label className={label}>Departure<input name="departureTime" type="time" defaultValue="06:00" className={`${input} mt-1`} required /></label>
      </div>
      {vehicles.length > 1 && (
        <label className={label}>Vehicle
          <select className={`${input} mt-1`} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.model} · {v.registrationNumber}</option>)}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>Seats offered<input name="totalSeats" type="number" min={1} max={maxSeats} defaultValue={maxSeats} className={`${input} mt-1`} required /></label>
        <label className={label}>Price per seat (₹)<input name="pricePerSeat" type="number" min={50} max={5000} step={10} defaultValue={650} className={`${input} mt-1`} required /></label>
      </div>
      <p className="text-xs text-stone">Stops: {route.stops.map((s) => s.name).join(' · ')}. Stop times are estimated from your departure time.</p>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-pine-50 px-3 py-2 text-sm text-pine-800">{notice}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-marigold py-3 font-bold text-pine-950 disabled:opacity-60">{busy ? 'Publishing…' : 'Publish trip'}</button>
    </form>
  )
}

function TripList({ trips }: { trips: DriverTrip[] }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-bold text-ink"><Users className="h-5 w-5 text-river" /> My trips & passengers</h2>
      {trips.length === 0 ? (
        <p className={`${card} mt-2 text-sm text-stone`}>No trips yet.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {trips.map((t) => (
            <li key={t.id} className={card}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-ink">{t.from} → {t.to}</div>
                  <div className="text-sm text-stone">{formatTripDate(t.date)} · {formatTime(t.departureTime)} · {t.vehicle}</div>
                </div>
                <span className="shrink-0 rounded-full bg-pine-50 px-2.5 py-1 text-xs font-bold capitalize text-pine-700">{t.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="mt-2 text-sm text-ink">
                <span className="font-semibold">{t.bookedSeats}/{t.totalSeats}</span> seats booked · {formatRupees(t.pricePerSeat)} per seat
              </div>
              {t.bookings.length > 0 ? (
                <ul className="mt-2 divide-y divide-line border-t border-line text-sm">
                  {t.bookings.map((b) => (
                    <li key={b.code} className="py-2">
                      <div className="flex justify-between font-semibold text-ink"><span>{b.code}</span><span>{b.seats} seat{b.seats > 1 ? 's' : ''}</span></div>
                      <div className="text-stone">{b.pickup} ({b.pickupPoint}) → {b.drop} · <a href={`tel:${b.contactPhone}`} className="text-pine-700">{b.contactPhone}</a></div>
                      <div className="text-stone">{b.passengers.map((p) => p.name).join(', ')}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-stone">No passengers booked yet.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
