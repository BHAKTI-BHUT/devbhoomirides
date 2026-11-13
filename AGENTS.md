# AGENTS.md

Devbhoomi Rides — a scheduled shared-ride marketplace for the Dehradun ↔ Karnaprayag route (Uttarakhand). Three experiences are planned: Customer App, Driver App, Admin Panel.

**Start every session by reading [PLAN.md](./PLAN.md)** and continue from the first unchecked milestone. Milestone 1 (product surface) is done; Milestone 2 (database schema + seed) is next.

## Stack
TanStack Start (React 19, file-based TanStack Router), Vite 7, Tailwind CSS 4 (`@theme` tokens in `src/styles.css`), TypeScript strict, Netlify. Path alias `@/` → `src/`. Package manager: pnpm.

## Layout
```
src/
  routes/
    __root.tsx            # HTML shell, SEO meta, Google Fonts (Fraunces + Plus Jakarta Sans)
    index.tsx             # Public SEO landing page
    drive.tsx             # Drive With Us page (earnings estimator)
    app.tsx               # Customer app layout → AppShell (phone-style frame + bottom nav)
    app/index.tsx         # Customer home: search, my bookings, popular routes, upcoming trips
    app/search.tsx        # Search results (?from=&to=&date=)
    app/trips/$tripId.tsx # Trip details + booking flow (ride → passengers → pay → confirmation)
    app/bookings.tsx      # My Bookings + cancellation
  components/             # Logo, AppShell, SiteChrome, SearchForm, TripCard, RouteLine, VehicleIcon, DemoBadge
  data/fixtures.ts        # ALL stub data (routes, stops, drivers, vehicles, trips, settings). DEMO DATA.
  lib/types.ts            # Domain types mirroring the planned DB tables and status enums
  lib/trips.ts            # Pure rules: valid segments, pickup/drop options, seats left, fare, commission, refunds, search
  lib/demo-bookings.ts    # Preview-only booking store (localStorage) — replace with server API in Milestone 4
  lib/i18n.ts             # Customer-facing strings; add a `hi` dictionary for Hindi
  lib/format.ts           # ₹ formatting, dates ("Today"/"Tomorrow"), 12h times
public/img/               # Generated imagery; always served via /.netlify/images?url=/img/<file>&w=&fm=webp
```

## Key decisions
- **Direction comes from trip stop order.** A trip's `stops[]` is ordered; a booking is valid only if pickup index < drop index (`isValidSegment`). Return trips are separate trips with reversed stops. Never hard-code the route — read stops from route/trip data.
- **Seats:** `seatsLeft = totalSeats − bookedSeats` (whole-trip counting for v1). The server must enforce this atomically in Milestone 4; client checks are UX only.
- **Money:** `seats × pricePerSeat + bookingFee`. Booking fee, commission % and cancellation rules come from `platformSettings` (to become the `admin_settings` table). Never hard-code prices or percentages in components.
- **Privacy:** driver phone numbers are never in client data; contact unlocks after a confirmed booking.
- **No dead buttons:** features not built yet show an inline notice explaining when they arrive.
- Demo records are flagged (`isDemo`) and shown with `<DemoBadge />`.

## Conventions
- Components PascalCase, utilities camelCase; Tailwind utilities with theme tokens (`pine-*`, `marigold`, `river`, `snow`, `ink`, `stone`, `line`).
- Customer and driver screens are mobile-first; the admin panel (future) targets desktop.
- Put customer-facing copy in `src/lib/i18n.ts` where practical; keep wording simple English.
- Don't run build/dev commands in agent sessions; the Netlify pipeline validates builds.
