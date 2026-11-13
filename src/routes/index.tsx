import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck, CalendarClock, CarFront, CircleCheck, IndianRupee, MapPinned, PhoneOff, Search, ShieldCheck, Ticket, Users } from 'lucide-react'
import { RouteLine } from '@/components/RouteLine'
import { SearchForm } from '@/components/SearchForm'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { TripCard } from '@/components/TripCard'
import { ddnKpgRoute } from '@/data/fixtures'
import { t } from '@/lib/i18n'
import { upcomingTrips } from '@/lib/trips'

export const Route = createFileRoute('/')({
  component: Landing,
})

const img = (file: string, w: number) => import.meta.env.MODE === 'netlify'
  ? `/.netlify/images?url=/img/${file}&w=${w}&fm=webp`
  : `/img/${file}`

const customerSteps = [
  { icon: Search, title: 'Search', text: 'Pick where you start, where you go and the date.' },
  { icon: CarFront, title: 'Select Ride', text: 'See drivers, vehicles, timings and seats left.' },
  { icon: MapPinned, title: 'Choose Pickup & Drop', text: 'Get on and off at any stop on the way.' },
  { icon: Ticket, title: 'Book Seat', text: 'Pay for your seats and get a Booking ID.' },
]
const driverSteps = [
  { icon: CalendarClock, title: 'Create Trip', text: 'Add your date, time, vehicle and stops.' },
  { icon: Users, title: 'Publish Seats', text: 'Set how many seats and the price per seat.' },
  { icon: Ticket, title: 'Receive Bookings', text: 'See each passenger, pickup and drop.' },
  { icon: CircleCheck, title: 'Complete Trip', text: 'Mark pickups, finish the trip, get paid.' },
]

function Landing() {
  const rides = upcomingTrips(3)
  return (
    <div className="bg-snow">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-pine-950">
        <img
          src={img('hero.png', 1800)}
          alt="Mountain road along the Alaknanda river in Garhwal, Uttarakhand"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-pine-950/80 via-pine-950/45 to-pine-950/90 md:bg-gradient-to-r md:from-pine-950/90 md:via-pine-950/55 md:to-transparent" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-28 md:grid-cols-[1.15fr_0.85fr] md:pb-24 md:pt-36">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-marigold ring-1 ring-white/15">
              Shared Taxi · Scheduled Rides
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-snow sm:text-5xl md:text-6xl">
              Travel Between Dehradun &amp; Karnaprayag
            </h1>
            <p className="mt-5 max-w-lg text-lg text-snow/85">
              Find scheduled rides, check available seats and book your journey online.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app" className="inline-flex items-center gap-2 rounded-full bg-marigold px-6 py-3.5 font-bold text-pine-950 hover:bg-snow">
                {t('findRide')} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/drive" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-bold text-snow ring-1 ring-snow/40 hover:bg-white/10">
                {t('driveWithUs')}
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-snow/75">
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-marigold" /> Verified drivers</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-marigold" /> Book 1 or more seats</span>
              <span className="flex items-center gap-1.5"><MapPinned className="h-4 w-4 text-marigold" /> 6 stops on the way</span>
            </div>
          </div>
          <div className="md:justify-self-end md:w-full md:max-w-sm">
            <SearchForm />
          </div>
        </div>
      </section>

      {/* Keywords strip */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-2 px-5 py-4 text-sm font-semibold text-pine-800">
          <span>Dehradun to Karnaprayag</span><span className="text-line">•</span>
          <span>Shared Taxi</span><span className="text-line">•</span>
          <span>Scheduled Rides</span><span className="text-line">•</span>
          <span>Uttarakhand Travel</span><span className="text-line">•</span>
          <span>Book Seats Online</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-display text-3xl font-bold text-pine-900 md:text-4xl">How It Works</h2>
        <p className="mt-2 max-w-xl text-stone">Drivers publish their trips in advance. You pick a ride and book only the seats you need.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Steps label="For Customers" steps={customerSteps} accent="bg-marigold text-pine-950" />
          <Steps label="For Drivers" steps={driverSteps} accent="bg-river text-white" />
        </div>
      </section>

      {/* Route */}
      <section id="route" className="contour-bg relative bg-pine-900">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold text-snow md:text-4xl">One road. Six stops.</h2>
            <p className="mt-3 max-w-md text-snow/75">
              Rides run along NH-7 beside the Ganga and Alaknanda. Get on and off at any stop — just travel in the trip's direction. Return trips run separately.
            </p>
            <div className="mt-8 rounded-2xl bg-pine-950/50 p-6 ring-1 ring-white/10">
              <RouteLine
                dark
                stops={ddnKpgRoute.stops.map((s) => ({ id: s.id, name: s.name, note: s.distanceKm ? `${s.distanceKm} km from Dehradun` : 'Start' }))}
              />
            </div>
          </div>
          <figure className="relative">
            <img src={img('devprayag.png', 900)} alt="The river confluence at Devprayag" loading="lazy" className="aspect-[4/5] w-full rounded-3xl object-cover shadow-2xl md:aspect-[4/5]" />
            <figcaption className="absolute bottom-4 left-4 rounded-full bg-pine-950/80 px-3 py-1.5 text-xs font-semibold text-snow backdrop-blur">
              Devprayag — where the Ganga begins
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Upcoming rides */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold text-pine-900 md:text-4xl">Upcoming rides</h2>
            <p className="mt-2 text-stone">A look at rides drivers have already scheduled.</p>
          </div>
          <Link to="/app/search" search={{ from: 'dehradun', to: 'karnaprayag' }} className="hidden shrink-0 items-center gap-1 font-semibold text-pine-700 hover:text-pine-900 sm:flex">
            See all rides <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {rides.map((trip) => <TripCard key={trip.id} trip={trip} />)}
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <Trust icon={ShieldCheck} title="Verified drivers" text="Every driver's licence and vehicle is checked before they can publish a trip." />
          <Trust icon={Users} title="Your seat is held" text="Seats are counted live, so a ride can never be booked twice over." />
          <Trust icon={IndianRupee} title="Clear prices" text="Seats × price per seat. A small booking fee, shown before you pay." />
          <Trust icon={PhoneOff} title="Private numbers" text="Phone numbers are shared only after a booking is confirmed." />
        </div>
      </section>

      {/* SEO copy */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-stone">
        <h2 className="font-display text-2xl font-bold text-pine-900">Dehradun to Karnaprayag shared taxi</h2>
        <p className="mt-3 leading-relaxed">
          Devbhoomi Rides connects you with scheduled shared rides between Dehradun and Karnaprayag, passing Rishikesh, Devprayag, Srinagar and
          Rudraprayag. Instead of hiring a full taxi or waiting at the stand, see which rides are leaving, how many seats are left and the price per
          seat — then book seats online. It is simple, affordable Uttarakhand travel for students, families, workers and pilgrims.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/app" className="rounded-full bg-pine-900 px-5 py-3 font-bold text-snow hover:bg-pine-800">{t('findRide')}</Link>
          <Link to="/drive" className="rounded-full px-5 py-3 font-bold text-pine-900 ring-1 ring-pine-900/30 hover:bg-pine-50">{t('driveWithUs')}</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

function Steps({ label, steps, accent }: { label: string; steps: typeof customerSteps; accent: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 md:p-8">
      <div className="text-sm font-bold uppercase tracking-wider text-stone">{label}</div>
      <ol className="mt-6 space-y-5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <div className="font-bold text-ink">
                <span className="mr-2 text-stone">{i + 1}.</span>
                {s.title}
              </div>
              <div className="text-sm text-stone">{s.text}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Trust({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <div>
      <Icon className="h-7 w-7 text-river" strokeWidth={1.7} />
      <div className="mt-3 font-bold text-ink">{title}</div>
      <p className="mt-1 text-sm text-stone">{text}</p>
    </div>
  )
}
