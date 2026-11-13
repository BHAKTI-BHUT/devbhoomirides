import { Link, createFileRoute } from '@tanstack/react-router'
import { BadgeCheck, CalendarClock, CircleCheck, FileText, IdCard, ShieldCheck, Ticket, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { SiteFooter } from '@/components/SiteChrome'
import { Logo } from '@/components/Logo'
import { platformSettings } from '@/data/fixtures'
import { formatRupees } from '@/lib/format'
import { driverPayout } from '@/lib/trips'

export const Route = createFileRoute('/drive')({
  head: () => ({
    meta: [
      { title: 'Drive With Us – Devbhoomi Rides' },
      { name: 'description', content: 'Publish your Dehradun–Karnaprayag trips in advance, fill empty seats and get paid per seat with Devbhoomi Rides.' },
    ],
  }),
  component: DrivePage,
})

const steps = [
  { icon: CalendarClock, title: 'Create Trip', text: 'Choose route, date, departure time and the stops you will cover.' },
  { icon: Users, title: 'Publish Seats', text: 'Set total seats and your price per seat. Return trips are separate.' },
  { icon: Ticket, title: 'Receive Bookings', text: 'See each passenger, their pickup, drop and Booking ID.' },
  { icon: CircleCheck, title: 'Complete Trip', text: 'Mark passengers picked up, finish the trip and get your payout.' },
]

const documents = [
  { icon: IdCard, text: 'Driving licence number and expiry' },
  { icon: FileText, text: 'Vehicle registration number and model' },
  { icon: Users, text: 'Number of passenger seats' },
  { icon: BadgeCheck, text: 'Your photo and a photo of the vehicle' },
  { icon: ShieldCheck, text: 'Emergency contact' },
]

function DrivePage() {
  const [seats, setSeats] = useState(6)
  const [price, setPrice] = useState(650)
  const rideFare = seats * price
  const { commission, payout } = driverPayout(rideFare)

  return (
    <div className="bg-snow">
      <header className="contour-bg bg-pine-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo light />
          <Link to="/app" className="rounded-full bg-snow px-4 py-2 text-sm font-semibold text-pine-900 hover:bg-marigold">Find a Ride</Link>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pb-24">
          <span className="text-sm font-semibold uppercase tracking-wider text-marigold">For drivers</span>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight text-snow md:text-5xl">Fill every seat on your next hill trip.</h1>
          <p className="mt-4 max-w-xl text-lg text-snow/80">
            Publish your Dehradun–Karnaprayag trips in advance. Passengers book seats from any stop on your way, and you see every booking before you leave.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/driver" className="rounded-full bg-marigold px-6 py-3.5 font-bold text-pine-950 hover:bg-snow">Register as Driver</Link>
            <a href="#earnings" className="rounded-full px-6 py-3.5 font-bold text-snow ring-1 ring-snow/40 hover:bg-white/10">Estimate earnings</a>
          </div>
          <p className="mt-4 max-w-xl text-sm text-snow/70">
            Already registered? <Link to="/driver" className="font-semibold text-snow underline">Open your driver dashboard</Link>.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-3xl font-bold text-pine-900">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-line bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-river text-white"><s.icon className="h-5 w-5" /></span>
              <div className="mt-4 font-bold text-ink"><span className="mr-1.5 text-stone">{i + 1}.</span>{s.title}</div>
              <p className="mt-1 text-sm text-stone">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="earnings" className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-pine-900">Estimate your earnings</h2>
            <p className="mt-2 text-stone">You set your own price per seat. The platform keeps a small commission; the rest is yours.</p>
            <div className="mt-6 space-y-5">
              <label className="block">
                <div className="flex justify-between text-sm font-semibold"><span>Seats booked</span><span>{seats}</span></div>
                <input type="range" min={1} max={12} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="mt-2 w-full accent-pine-700" />
              </label>
              <label className="block">
                <div className="flex justify-between text-sm font-semibold"><span>Price per seat</span><span>{formatRupees(price)}</span></div>
                <input type="range" min={100} max={1500} step={50} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-2 w-full accent-pine-700" />
              </label>
            </div>
          </div>
          <div className="rounded-3xl bg-pine-900 p-6 text-snow md:p-8">
            <Wallet className="h-8 w-8 text-marigold" />
            <dl className="mt-5 space-y-3">
              <div className="flex justify-between"><dt className="text-snow/70">{seats} seats × {formatRupees(price)}</dt><dd className="font-semibold">{formatRupees(rideFare)}</dd></div>
              <div className="flex justify-between"><dt className="text-snow/70">Platform commission ({platformSettings.commissionPercent}%)</dt><dd className="font-semibold">− {formatRupees(commission)}</dd></div>
              <div className="flex justify-between border-t border-white/15 pt-3 text-xl font-bold"><dt>Your payout per trip</dt><dd className="text-marigold">{formatRupees(payout)}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-snow/60">Commission is set by Devbhoomi Rides and shown before you publish each trip.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-bold text-pine-900">What you need</h2>
          <ul className="mt-6 space-y-3">
            {documents.map((d) => (
              <li key={d.text} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
                <d.icon className="h-5 w-5 text-river" /> <span className="font-medium text-ink">{d.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-pine-900">Verification</h2>
          <p className="mt-2 text-stone">Passengers trust a verified badge. Our team checks every driver before their first trip.</p>
          <ol className="mt-6 space-y-3">
            {[
              ['Pending Verification', 'We review your licence and vehicle documents.', 'bg-marigold-light text-marigold-dark'],
              ['Verified', 'You can create and publish trips.', 'bg-pine-50 text-pine-700'],
              ['Rejected', 'We tell you what to fix so you can apply again.', 'bg-red-50 text-red-700'],
              ['Suspended', 'Used only for safety or policy issues.', 'bg-line text-stone'],
            ].map(([title, text, cls]) => (
              <li key={title} className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{title}</span>
                <span className="text-sm text-stone">{text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
