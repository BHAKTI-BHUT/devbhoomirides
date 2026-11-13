# Devbhoomi Rides — Product Roadmap

Scheduled shared rides between Dehradun and Karnaprayag (via Rishikesh, Devprayag, Srinagar, Rudraprayag), with three experiences: **Customer App**, **Driver App** and **Admin Panel**. Each milestone is a self-contained, shippable step. Tick items as they land.

## Milestone 1 — Product surface ✅
- [x] SEO landing page (`/`): hero, How It Works (customers + drivers), visual route, upcoming rides, trust section
- [x] Customer app shell (`/app`): mobile-first frame with bottom navigation
- [x] Customer home: Search a Ride (From / To / Date), My Bookings, Popular Routes, Upcoming Trips
- [x] Search results (`/app/search`): direction-aware matching, seats left, price per seat, driver rating, vehicle
- [x] Booking flow (`/app/trips/$tripId`): pickup/drop limited to valid forward stops, pickup point, seat count capped by availability, passenger details, fare summary, test-mode payment, Booking ID (`DR-YYYY-NNNNNN`)
- [x] My Bookings (`/app/bookings`): upcoming / past, cancellation with policy-based refund preview
- [x] Drive With Us (`/drive`): earnings estimator using configurable commission, documents, verification statuses
- [x] Pure booking rules in `src/lib/trips.ts`, all stub data in `src/data/fixtures.ts`, preview bookings in `src/lib/demo-bookings.ts` (localStorage)

## Milestone 2 — Database schema & seed data (in progress)
- [x] Netlify Database (Postgres) + Drizzle, schema in `db/schema.ts`, client in `db/index.ts`, migrations in `netlify/database/migrations` (core schema + append-only financial guards + default 15% commission settings)
- [ ] Seed data and swapping fixtures for DB reads (below)
- Tables: `users`, `customer_profiles`, `driver_profiles`, `vehicles`, `routes`, `route_stops` (order, lat/lng, pickup points), `trips`, `trip_stops` (order, ETA, pickup/drop points), `bookings`, `booking_passengers`, `payments`, `reviews`, `notifications`, `complaints`, `admin_settings`
- UUID primary keys, `created_at` / `updated_at` on every table; enums for trip, booking, payment and verification statuses (already defined in `src/lib/types.ts`)
- Seed script: Dehradun–Karnaprayag route, demo verified drivers + vehicles, trips at varied times/seat counts — all flagged `is_demo = true` and labelled DEMO DATA in the UI
- Replace `src/data/fixtures.ts` reads with server functions / loaders

## Milestone 3 — Authentication & roles (in progress)
- [x] Netlify Identity: `/login` (sign in, sign up, confirm, reset, invite), `src/server/session.ts` role resolution, `requireRoleMiddleware`, Identity `userSignup` hook, `ADMIN_EMAILS` bootstrap, protected `/admin`
- [ ] Customer profile, driver role assignment on driver registration, guards on booking APIs
- Netlify Identity: sign up, log in, email verification, password reset
- Roles `customer`, `driver`, `admin` stored in app metadata; server-side guards on every server function
- Customer profile + saved passengers
- Route protection: customers never see driver/admin data; drivers see only their own trips/bookings

## Milestone 4 — Real booking engine
- Booking API with atomic seat reservation (`UPDATE trips SET booked_seats = booked_seats + n WHERE booked_seats + n <= total_seats` inside a transaction) to prevent double booking
- Server-side validation of pickup-before-drop, trip status, seat count and fare (price from DB, never from the client)
- Booking ID sequence `DR-YYYY-NNNNNN`
- Near-real-time seat counts (refetch on focus/interval)
- Cancellation by customer using admin-configured rules; seats released; refund record created
- Swap `demo-bookings.ts` for the real API

## Milestone 5 — Payments (gateway-ready)
- `payments` table with statuses Pending / Paid / Failed / Refund Pending / Refunded
- Payment provider interface; **test mode** used when `PAYMENT_GATEWAY_KEY` is not set
- Commission + driver payout computed from `admin_settings` at booking time and stored on the payment
- No card data stored, ever

## Milestone 6 — Driver App
- Driver registration (licence, vehicle, photos via Netlify Blobs, emergency contact) → Pending Verification
- Driver dashboard: Today's Trips, Upcoming, Seats left, Total Bookings, Earnings, Completed
- Create Trip (one-way or return): route, date, time, vehicle, seats, price per seat, stops + optional ETAs, pickup/drop points
- Trip management: edit before bookings, cancel (auto-cancels bookings → refund), start trip, mark passenger picked up / no-show, complete trip
- Guard: seats can never drop below booked seats; only verified drivers can publish

## Milestone 7 — Admin Panel (desktop)
- Dashboard KPIs; customers, drivers, vehicles, trips, bookings, payments, refunds tables
- Driver verification queue: view documents/photos → Approve / Reject / Suspend / Reactivate
- Route & stop management: add, rename, reorder, remove stops; create new routes (Chamoli, Gopeshwar, Pauri, Joshimath…)
- App settings: booking fee, commission %, cancellation rules, refund rules
- Complaints, ratings and notifications log

## Milestone 8 — Trust, reviews & communication
- Reviews 1–5 stars + text, only after `trip_completed`; driver rating aggregates; optional driver-rates-customer
- Complaints: driver / vehicle / booking / payment / other → admin queue
- In-app message thread per booking; driver phone revealed only for confirmed bookings

## Milestone 9 — Notifications
- Notification records for: new booking, confirmation, cancellation, trip reminder (scheduled function), trip published/changed/cancelled, payment success, refund initiated, verification approved/rejected
- Channel adapters for in-app (live), SMS / WhatsApp / push (enabled when `SMS_API_KEY`, `WHATSAPP_API_TOKEN`, `PUSH_NOTIFICATION_KEY` are set)

## Milestone 10 — Polish & expansion
- Hindi dictionary in `src/lib/i18n.ts` + language switch
- Optional map view when `GOOGLE_MAPS_API_KEY` is set (booking never depends on it)
- Segment-based seat reuse (a seat freed at Srinagar can be resold onward)
- Per-segment pricing, end-to-end tests for the full booking and authorization matrix
