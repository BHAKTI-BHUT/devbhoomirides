# Devbhoomi Rides

Book seats on scheduled shared rides between **Dehradun and Karnaprayag**, Uttarakhand — with stops at Rishikesh, Devprayag, Srinagar and Rudraprayag. Drivers publish trips in advance; customers search, choose a pickup and drop on the route, and book one or more seats.

## What's live now
- **Landing page** (`/`) — SEO-friendly intro, How It Works, the route, upcoming rides
- **Customer app** (`/app`) — mobile-first search, results, booking flow with valid pickup/drop selection, fare summary, test-mode payment, Booking ID, and My Bookings with cancellation
- **Drive With Us** (`/drive`) — driver onboarding info and an earnings estimator

Trips, drivers and vehicles are **demo data** (`src/data/fixtures.ts`). Bookings made in the preview are stored in the browser so the whole flow can be tried end to end.

## Tech
TanStack Start (React 19, TanStack Router), Vite 8, Tailwind CSS 4, TypeScript. The application uses server-side rendering, including server functions and protected routes; it is not a static-only site. Separate adapters support a standard Node.js server and Netlify Functions. Existing integrations use Netlify Database (Postgres + Drizzle), Netlify Identity, Netlify Functions and Netlify Blobs.

## Run locally
```bash
pnpm install --frozen-lockfile
pnpm dev
```

Use Node.js **22.12.0 or newer** (Node 22 is selected in `.nvmrc`). The pinned TanStack Start and Netlify Database packages require this minimum, so Node 20 is not supported by these dependency versions. For local Netlify services, use `netlify dev`; `netlify.toml` selects `dev:netlify`.

## Production: Hostinger / standard Node.js

Configure the application as a **Node.js application**, not as static hosting of `dist`:

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

### Hostinger deployment settings

Keep GitHub → Hostinger → `devbhoomirides.in`. No DNS changes to Netlify are needed. A Vite framework label or a “Completed and Running” deployment is not proof that the generated Nitro server is running. Configure the Node application startup, not a static document root or an `index.html` fallback.

| Setting | Value |
| --- | --- |
| Framework preset | `Nitro`; use Hostinger's documented `Other` custom-app option if Nitro is not listed, never static `Vite` |
| Repository root | `./` |
| Branch | `main` |
| Node.js | Node 22, at least 22.12.0 |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm run build` |
| Generated deployment directory | `.output` — retain both `server/` and `public/` |
| Generated Nitro entry, relative to the repository root | `.output/server/index.mjs` |
| Start command, with the repository as working directory | `node .output/server/index.mjs` |
| Startup file, relative to the generated deployment directory | `server/index.mjs` |

If Hostinger deploys **only the contents of `.output`**, the root `package.json` and root `server.mjs` are not in that artifact. In that case, start the generated server directly: `node server/index.mjs` with `.output` as the working directory. The startup file relative to that artifact is `server/index.mjs`; its repository-relative path is `.output/server/index.mjs`. Do not enter `pnpm start` for an artifact that does not contain the root package and launcher. The generated bootstrap applies runtime settings before importing Nitro: `PORT` takes precedence over `NITRO_PORT`, and `NITRO_HOST` takes precedence over `HOST`, with a wildcard host default of `0.0.0.0`.

These paths come from `vite.config.ts` and the installed Nitro Vite adapter, which names the entry `index.mjs`; they are not guessed from a Vite convention. The build's `scripts/verify-node-output.mjs` checks that the generated entry and public directory exist. Hostinger must retain the complete server bundle, including its chunks and any generated runtime dependencies. `.output/public` and `dist/client` are not valid standalone deployments for this application.

The Hostinger overview does not disclose whether its output-directory field defines an artifact root or a static web root, or where its startup file is resolved. Apply the matching startup path above in the Node application settings. Do not treat `.output` as a public directory, expose its server files, or change the framework to a static SPA merely to obtain an HTML file.

- Build command: `pnpm run build` (`vite build --mode node`, followed by output validation).
- Start command: `node .output/server/index.mjs` from the repository root, or `node server/index.mjs` from `.output`. `pnpm start` remains an optional repository-root launcher that imports the Nitro entry once without changing runtime settings or creating another server.
- The root `server.mjs` is a process launcher, not a request handler, and intentionally has no default export. Nitro uses `serverEntry: false` to prevent auto-detecting this launcher as a handler; TanStack Start supplies the SSR entry through Vite instead. Do not import the launcher into the server bundle or point Nitro's handler entry at it.
- Server entry: `.output/server/index.mjs`, a generated startup bootstrap that configures the runtime environment before dynamically importing Nitro's `node-server` bundle at `.output/server/nitro.mjs`. Keep both files and all generated chunks. The build fails if the entry or the public directory is missing, or if the entry has invalid JavaScript syntax.
- Static assets: `.output/public/`, served by the same Node server. Keep the **entire** `.output/` directory alongside `server.mjs`; do not deploy only the public directory or only the server entry.
- Listener: the platform-provided `PORT` takes precedence over `NITRO_PORT`, including when starting `.output/server/index.mjs` directly. `NITRO_PORT` remains an optional fallback when `PORT` is absent. Nitro's own local default applies only when neither is supplied; no production port is injected by the build or launcher. Host selection uses `NITRO_HOST`, then `HOST`, then `0.0.0.0`.
- Keep the Node process running and reverse-proxy **all** requests to it, including `/`, assets, deep links and TanStack server functions. Do not configure an `index.html` fallback or directory browsing.
- Images use ordinary `/img/` assets for the Node build; Netlify builds retain Image CDN URLs.

After the production build, start the process with `pnpm start`, then check `/`, `/app`, `/drive`, `/login`, `/favicon.svg` and `/img/hero.png` through the assigned port. `/` should return HTTP 200 with rendered landing-page HTML, not a directory-listing 403. Check a JavaScript asset referenced by that HTML and a server-function request as well. Stop only the process you started.

### Verify before publishing

Runtime port and host settings are applied by the generated bootstrap before any Nitro modules are evaluated. A JavaScript bundle banner cannot guarantee this ordering: static ESM dependencies run before the importing module's body, even when the banner appears at the top of that body. The runtime regression tests include a split-module fixture that reads listener settings during import, rather than testing only inline banner code. The Node-only Nitro completion hook writes the bootstrap; the Netlify build remains unchanged.

The Node build's output verifier also runs `node .output/server/index.mjs` with closed stdin and then with a stdin getter that throws `EEXIST`. Both runs assign an available port to `PORT` and deliberately set `NITRO_PORT` to `0` to verify that the platform port wins. They set `HOST` and `NITRO_HOST` to `0.0.0.0`. The first run inherits the configured environment so service configuration and Node runtime options are not silently discarded. The guarded second run uses an isolated environment without service credentials, verifying that public SSR does not require them at startup. Neither run prints environment values or child runtime logs. They check TCP connectivity on `127.0.0.1` first, then require a static asset and rendered HTTP 200 responses from `/`, `/app`, `/drive`, and `/login`, and terminate the child process. Missing assets or invalid HTTP content fail immediately with a separate diagnostic rather than being mislabeled as an unreachable port. Run the checks independently with `pnpm run test:production` after the Node artifact exists. `pnpm run test:runtime` checks the installed server dependencies, runtime configuration, verifier behavior, and configured Identity transport without building or contacting external services.

The startup defect was traced to `src/server/drivers.ts` importing `@netlify/blobs` 11.1.3. Its ESM utility chunk imported the Node `process` built-in. Node initialized that module's export namespace and evaluated `process.stdin` even though the SDK only used `process.platform` for path encoding. The pnpm patch replaces this import with a platform-only reference to the existing global process. It does not replace stdin, suppress socket errors, disable storage, or downgrade Node. Keep the committed lockfile and patch together; the dependency regression test catches any reintroduced stdin access.

Use Hostinger's staging or temporary URL first. Check the Node process through its assigned port from the Hostinger runtime and then check the staging URL. A local runtime HTTP 200 with a public HTTP 403 identifies a routing/proxy failure; a missing entry, startup error or failed local request identifies an artifact/process failure. Hostinger must forward `/`, deep links, assets and server-function requests to the same Node listener. Keep HTTPS termination at Hostinger; no custom Nitro TLS secrets are needed for this setup.

After staging passes and the deployment is published, perform an actual GET, not just a HEAD request:

```bash
curl --silent --show-error --output /tmp/devbhoomi-root.html --write-out 'HTTP %{http_code}\n' https://devbhoomirides.in/
```

Require HTTP 200 and rendered Devbhoomi Rides HTML. Also verify `/app`, `/drive`, `/login`, `/favicon.svg`, `/img/hero.png`, and a generated JavaScript asset referenced by the HTML. A deployment marked completed is insufficient. Do not consider authentication or protected operations verified until their existing Netlify-backed service integration has also been checked.

## Production: Netlify

Netlify uses `pnpm run build:netlify` and publishes `dist/client`. The Netlify adapter emits `.netlify/v1/functions/server.mjs` with a `/*` catch-all and `preferStatic: true`, so existing assets are served first and `/` plus application deep links reach SSR. `netlify/functions` contains the separately deployed Identity hook; it is **not** the directory for the generated SSR function. No manual SPA redirect to `/index.html` or duplicate function redirect should be added. There is no persistent `start` command on Netlify.

Serving the original `dist/client` directory on a conventional static host did not start this SSR handler. The original configuration also had no production `start` script. That mismatch explains how a successful build could still leave the root without a page or running server. A live HTTP 403 can also come from hosting permissions or proxy settings; configuration inspection alone cannot prove its origin.

## Environment variables
Set values using the hosting provider's environment settings; never commit credentials. There is no required build-time secret for the adapter itself.

- `PORT`: supplied by the Node hosting platform and read when the server starts; takes precedence over `NITRO_PORT`.
- `NITRO_PORT`: optional runtime port fallback when `PORT` is absent.
- `HOST`: optional runtime bind host, defaulting to `0.0.0.0` unless `NITRO_HOST` overrides it.
- `NODE_ENV`: use `production` for the deployed Node process.
- `NITRO_HOST`: optional runtime bind-host override; use `0.0.0.0` for a wildcard listener. The launcher preserves all supplied runtime settings.
- `NETLIFY_DB_URL`: required when a database-backed operation runs. Database initialization is lazy, so an unconfigured database does not crash public SSR during module loading. On Netlify this is managed by Netlify Database; on a Node host, securely supply the connection to the same Netlify Database. Do not create another database or change applied migrations for this deployment fix.
- `NETLIFY_DB_DRIVER`: retain the matching Netlify Database driver setting (`server` or `serverless`); the existing Drizzle adapter defaults to serverless when unset.
- `ADMIN_EMAILS`: optional comma-separated administrator bootstrap list.
- `NETLIFY_SITE_ID` and `NETLIFY_BLOBS_TOKEN`: explicitly configure access to the existing private document store outside the managed Netlify Blobs runtime. Missing configuration fails document operations safely instead of substituting local storage.
- `NETLIFY_IDENTITY_URL`: the existing Netlify Identity site's HTTPS origin (or its `/.netlify/identity` endpoint). The Node build proxies the browser SDK's same-origin Identity endpoints to that configured service. It rejects a target on the production app's own origin to prevent proxy loops.
- `URL`: compatibility fallback for the Netlify Identity site's origin when `NETLIFY_IDENTITY_URL` is absent. Do not use the Hostinger app's own URL as the Identity upstream.

Hostinger remains the production web host; the existing Netlify services remain the explicitly configured database, document-storage, and Identity providers. On standalone Node, protected operations read the request's `nf_jwt` cookie and validate it through the configured Identity service's `/user` API over HTTPS before trusting administrator-controlled roles. They do not rely on Netlify Functions cookies, runtime sockets, or locally decoded JWT claims. Native Netlify request contexts continue to use `@netlify/identity`. The browser also retains `@netlify/identity`, using the Node proxy for its existing endpoints. Missing Identity configuration returns an explicit unavailable response; no fake authentication or roles are substituted. Keep the existing Identity signup hook deployed on the provider site. No routes or access-control checks were removed or bypassed, and functional provider testing is still required after configuring production.

`PAYMENT_GATEWAY_KEY`, `PAYMENT_GATEWAY_SECRET`, `GOOGLE_MAPS_API_KEY`, `SMS_API_KEY`, `WHATSAPP_API_TOKEN` and `PUSH_NOTIFICATION_KEY` remain reserved for future integrations, not startup requirements.

## Roadmap
See [PLAN.md](./PLAN.md). Next up: database schema and seed data, then accounts and roles, the atomic booking engine, payments, the Driver App, the Admin Panel, reviews/complaints and notifications.
