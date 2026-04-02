# Plan: Big Refactor — Remove Next.js + Supabase, Docker Compose Everything

> **Created:** 2026-04-02
> **Status:** Draft — awaiting approval

## Goal

Remove Next.js and Supabase as dependencies so EweserDB can be fully self-hosted via a single Docker Compose, with custom auth, a revived aggregator, and all apps as React SPAs.

## Research Decisions

### Framework: **Hono**
- Web Standard `Request`/`Response` — Next.js App Router handlers port nearly 1:1
- Zero deps, <14KB — smallest Docker footprint
- Built-in middleware: JWT, CORS, body parsing, bearer auth
- First-class TypeScript with typed routes
- Used by Cloudflare, Clerk, Supabase Functions

### Auth: **better-auth**
- Native Drizzle adapter with PostgreSQL (`provider: "pg"`)
- Built-in email/password + social sign-on (GitHub, Google — one-liner config)
- CLI generates Drizzle schema: `npx @better-auth/cli generate`
- Hono integration documented (mount as handler)
- Plugin ecosystem: 2FA, passkeys, magic links, orgs (future extensibility)
- TypeScript-first, framework-agnostic

### CRDT Sync: **Hocuspocus** (replacing Y-Sweet)
- **MIT licensed** (Tiptap GmbH), ~5-8K LOC TypeScript — fully maintainable by a TS team
- **Actively developed** — v3.4.4 stable (Jan 2026), v4.0.0-rc.5 (Mar 2026), 92 releases, 2.2K stars
- **Extension architecture** — pluggable: SQLite, Postgres, Redis, S3, Webhook, Logger, Throttle
- **20+ lifecycle hooks** — `onAuthenticate`, `onConnect`, `onLoadDocument`, `onStoreDocument`, `onChange`, etc.
- **Auth via hooks** — `onAuthenticate` callback integrates directly with better-auth sessions
- **Document listing** — `server.getDocumentsCount()`, `server.getConnectionsCount()` (Y-Sweet has neither)
- **Tiered storage** (no third-party accounts needed):
  - **Quick deploy (default):** SQLite persistence (`@hocuspocus/extension-sqlite`) — single file in Docker volume
  - **Durable:** PostgreSQL persistence (via `@hocuspocus/extension-database` + Drizzle) — same DB as auth
  - **Scalable:** Redis pub/sub (`@hocuspocus/extension-redis`) for multi-instance
  - **Production storage:** S3 (`@hocuspocus/extension-s3`) — works with MinIO or cloud S3
- **Client SDK:** `@hocuspocus/provider` — replaces `@y-sweet/client` in the SDK (moderate migration)
- **Webhook extension** — fires on `onCreate`, `onChange`, `onConnect`, `onDisconnect` — perfect for aggregator
- **Why not Y-Sweet:** Y-Sweet is Rust (~2.2K LOC), last release Sep 2025, no SQLite/Postgres persistence, no hooks, no doc listing. Hocuspocus is TypeScript-native, more actively maintained, and has richer features for our use case.

### SPA Serving: **Caddy reverse proxy**
- Auto HTTPS, HTTP/3, simple Caddyfile config
- Reverse-proxies to auth API + Y-Sweet
- Serves all SPA static files from different paths
- Y-Sweet's own reference docker-compose uses this approach

## Scope

### In
- Replace Next.js auth-server backend with Hono
- Replace Supabase Auth with better-auth (email/password + OAuth)
- Replace Supabase PostgreSQL with self-hosted Docker Postgres
- Create Docker Compose for full stack
- Extract auth UI pages into React SPA (Vite)
- Revive aggregator (Y-Sweet + Postgres)
- Update all documentation and AI agent instructions for the new architecture

### Out
- SDK API changes (internal implementation only — keep `@eweser/db` public API stable)
- Native mobile SDKs (yswift/Kotlin — future, after Capacitor validates the mobile story)

---

## Phase 1: Foundation

> Unblocks everything. Get Docker Compose running with Postgres, Y-Sweet, and a new Hono auth API with better-auth.

### Run 1.1: Docker Compose skeleton + PostgreSQL + Hocuspocus

**What:** Create root `docker-compose.yml` with PostgreSQL and Hocuspocus CRDT sync services. Verify both start and are reachable.

**Files:**
- Create `packages/sync-server/` — Hocuspocus server package
  - `package.json` — `@hocuspocus/server`, `@hocuspocus/extension-sqlite`, `@hocuspocus/extension-database`
  - `src/index.ts` — server setup with SQLite persistence
  - `Dockerfile` — Node 22 slim
- Create `docker-compose.yml` (root)
- Create `docker/` dir for any custom configs
- Create `.env.example` with all required vars

**Hocuspocus server (minimal):**
```typescript
import { Server } from '@hocuspocus/server'
import { SQLite } from '@hocuspocus/extension-sqlite'

const server = Server.configure({
  port: 8080,
  extensions: [
    new SQLite({ database: '/data/sync.sqlite' }),
  ],
})

server.listen()
```

**Docker Compose services:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment: [POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB]
    ports: ["5432:5432"]
    healthcheck: pg_isready

  sync-server:
    build: packages/sync-server
    volumes: [sync-data:/data]
    ports: ["8080:8080"]
    environment: [SYNC_AUTH_SECRET]
```

**Tests:** `docker compose up -d` → Postgres accepts connections → Hocuspocus WebSocket responds on :8080

**Done when:** Both services start, are healthy, and can be connected to from host. Zero external dependencies.

**Risks:** Low — Hocuspocus is pure TypeScript, well-documented, actively maintained.

---

### Run 1.2: Initialize Hono auth API server

**What:** Create a new Hono-based server package to replace the Next.js auth-server. Start with a health check endpoint and Drizzle DB connection.

**Files:**
- Create `packages/auth-server-hono/` (new package, parallel to existing auth-server during migration)
  - `package.json` — hono, drizzle-orm, postgres, better-auth, jsonwebtoken, zod
  - `tsconfig.json`
  - `src/index.ts` — Hono app entry point
  - `src/db/drizzle.ts` — Drizzle init (port from `auth-server/src/services/database/drizzle/init.ts`)
  - `Dockerfile` — Node 20 Alpine, build + serve

**Endpoints (initial):**
```
GET  /health → 200 OK
GET  /ping   → pong
```

**Add to docker-compose.yml:**
```yaml
  auth-api:
    build: packages/auth-server-hono
    depends_on: [postgres]
    environment: [DATABASE_URL, Y_SWEET_AUTH_KEY, ...]
    ports: ["3000:3000"]
```

**Tests:** Docker compose up → auth-api healthy → Drizzle connects to Postgres → `GET /health` returns 200.

**Done when:** Hono server starts in Docker, connects to Postgres via Drizzle.

**Risks:** Drizzle postgres driver compatibility with connection string format.

---

### Run 1.3: Port database schema + migrations

**What:** Move Drizzle schema from auth-server to auth-server-hono. Create a migration system that doesn't depend on Supabase CLI.

**Files:**
- Copy `packages/auth-server/src/model/` → `packages/auth-server-hono/src/model/`
  - `users.ts` — keep as-is
  - `rooms/schema.ts` — keep as-is
  - `access_grants.ts` — keep as-is
  - `apps.ts` — keep as-is
- Create `packages/auth-server-hono/src/db/migrate.ts` — Drizzle Kit migration runner
- Create `drizzle.config.ts` — Drizzle Kit config
- Port `packages/auth-server/supabase/migrations/` → Drizzle Kit migrations

**Schema changes needed:**
- Remove references to `auth.users` Supabase table (the `id` FK in users table)
- Add `password_hash` column to users table (for custom auth)
- Add `email_verified` boolean to users table
- better-auth will generate additional tables (sessions, accounts, verification_tokens)

**Tests:** `drizzle-kit push` runs clean against fresh Postgres → all tables created → existing Drizzle queries still work.

**Done when:** Schema is in the new package, migrations run without Supabase CLI.

**Risks:** Existing data migration for users with Supabase auth IDs. Need a migration script for production deployments that have existing users. (Can be deferred — most installs will be fresh.)

---

### Run 1.4: Integrate better-auth

**What:** Set up better-auth with Drizzle adapter for email/password + OAuth (GitHub, Google).

**Files:**
- Create `packages/auth-server-hono/src/auth.ts` — better-auth config
- Create `packages/auth-server-hono/src/routes/auth.ts` — mount better-auth handler on Hono
- Update `packages/auth-server-hono/src/model/` with better-auth generated tables
- Create `packages/auth-server-hono/src/middleware/auth.ts` — session validation middleware

**better-auth config:**
```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  },
})
```

**Tests:**
- Sign up with email/password → user created in DB → session token returned
- Sign in with email/password → session token returned
- Invalid credentials → 401
- OAuth flow initiation (mock callback)

**Done when:** Can create account, sign in, get session — all without Supabase.

**Risks:** better-auth session model vs existing JWT access-grant model — may need to bridge the two (better-auth for login sessions, existing JWT system for room access grants).

---

### Run 1.5: Port API routes from Next.js to Hono

**What:** Port all auth-server API endpoints from Next.js App Router to Hono routes.

**Existing routes to port:**

| Next.js Route | Method | Hono Route | Notes |
|---|---|---|---|
| `/access-grant/sync-registry` | POST | `/api/access-grant/sync-registry` | Protected — returns rooms for user |
| `/access-grant/get-rooms` | POST | `/api/access-grant/get-rooms` | Public — JWT-based room lookup |
| `/access-grant/create-room-invite` | POST | `/api/access-grant/create-room-invite` | Public — generate invite JWT |
| `/access-grant/update-room/[roomId]` | POST | `/api/access-grant/update-room/:roomId` | Protected — rename room |
| `/access-grant/refresh-y-sweet-token/[roomId]` | GET | `/api/access-grant/refresh-y-sweet-token/:roomId` | Protected — Y-Sweet token refresh |
| `/auth/callback` | GET | `/api/auth/callback` | OAuth redirect handler |
| `/auth/confirm` | GET | `/api/auth/confirm` | Email OTP confirmation |

**Files:**
- Create `packages/auth-server-hono/src/routes/access-grant.ts`
- Create `packages/auth-server-hono/src/routes/rooms.ts`
- Port `packages/auth-server/src/modules/` → `packages/auth-server-hono/src/services/`
  - `sync-token.ts` — Hocuspocus auth token generation (JWT for document-level access)
  - `access-grant/` — grant creation, validation, token generation
  - `rooms/` — CRUD operations
- Create `packages/auth-server-hono/src/middleware/cors.ts` — CORS from apps table

**Key change:** Replace `supabase.auth.getUser()` in middleware with better-auth session validation.

**Tests:**
- Sync registry returns rooms for authenticated user
- Get rooms with valid JWT returns room list
- CORS allows registered app domains
- Hocuspocus sync token generation returns valid token

**Done when:** All existing auth-server API endpoints work on Hono without Supabase. SDK `serverFetch()` calls succeed against new server.

**Risks:** Subtle behavior differences in error handling between Next.js and Hono response objects. Test each endpoint against the SDK.

---

### Run 1.6: Update SDK — replace Y-Sweet client with Hocuspocus provider

**What:** Replace `@y-sweet/client` with `@hocuspocus/provider` in `@eweser/db`. Update the SDK to connect to Hocuspocus instead of Y-Sweet. Also verify auth server integration.

**Files:**
- `packages/db/package.json` — remove `@y-sweet/client`, add `@hocuspocus/provider`
- `packages/db/src/room.ts` — replace Y-Sweet provider init with Hocuspocus provider:
  ```typescript
  import { HocuspocusProvider } from '@hocuspocus/provider'
  
  // Replace createYjsProvider() with:
  const provider = new HocuspocusProvider({
    url: this.syncServerUrl,
    name: roomId,
    document: ydoc,
    token: authToken, // from auth server
  })
  ```
- `packages/db/src/index.ts` — update auth endpoint paths if changed, rename `refreshYSweetToken` → `refreshSyncToken` (internal method)
- `packages/db/src/utils/serverFetch.ts` — verify request format
- `packages/shared/src/api/` — update types (rename Y-Sweet references)

**Key changes:**
- `HocuspocusProvider` uses standard WebSocket (no connection string pattern)
- Auth token is passed as `token` config — Hocuspocus `onAuthenticate` hook validates it server-side
- Single WebSocket connection can multiplex docs (v4 feature)
- `ySweetUrl`/`ySweetBaseUrl` fields in Room → `syncUrl` (rename in types)

**Tests:**
- SDK `login()` against new auth server
- SDK `syncRegistry()` receives correct room list
- SDK connects to Hocuspocus and syncs documents
- Full flow: login → create room → load room → sync via Hocuspocus
- Offline-first: create docs without sync server → connect later → docs sync

**Done when:** SDK syncs via Hocuspocus instead of Y-Sweet. This IS a published API change (provider swap) — needs a changeset and major version bump.

**Risks:** This is the highest-effort SDK change. The `Room` class properties change (`ySweetUrl` → `syncUrl`). Apps using the SDK will need to update. Mitigate by keeping old property names as deprecated aliases during transition.

---

## Phase 2: Frontend Migration

> Extract auth UI into a React SPA. Update existing apps.

### Run 2.1: Create auth-pages React SPA

**What:** Extract the login/signup/account UI from the Next.js auth-server into a standalone Vite React SPA.

**Current pages to extract:**
- Login page (`/auth/sign-in`)
- Signup page (`/auth/sign-up`)
- Email confirmation page
- Permission grant page (app requesting access)
- Invite acceptance page
- Account/home page
- Sign out action
- Terms of service, privacy policy

**Files:**
- Create `packages/auth-pages/` (new Vite React package)
  - `package.json` — react, react-dom, react-router, tailwind, radix-ui, @better-auth/client
  - `vite.config.ts` — SPA with `base: '/auth/'`
  - `index.html`
  - `src/App.tsx` — React Router routes
  - `src/pages/` — port each page component
  - `src/lib/auth-client.ts` — better-auth client SDK
  - `Dockerfile` — multi-stage: build with Node, serve with Caddy/nginx

**Key change:** Replace Supabase auth client calls with better-auth client SDK:
```typescript
import { createAuthClient } from "better-auth/client"
const authClient = createAuthClient({ baseURL: import.meta.env.VITE_AUTH_API_URL })
```

**Port UI components:**
- Copy existing Radix UI components from auth-server
- Copy Tailwind config
- Replace `next/navigation` with `react-router`
- Replace `next/link` with `<Link>` from react-router

**Tests:** Login flow renders → form submission → API call → redirect. Visual check that styling matches.

**Done when:** All auth pages work as a standalone SPA, talk to Hono auth API.

---

### Run 2.2: Add Caddy reverse proxy to Docker Compose

**What:** Add a Caddy service that routes traffic to auth-api, Y-Sweet, and serves SPAs.

**Files:**
- Create `docker/Caddyfile`
- Update `docker-compose.yml` with Caddy service + SPA build outputs

**Caddyfile:**
```
{$DOMAIN:localhost} {
    handle /api/auth/* {
        reverse_proxy auth-api:3000
    }
    handle /api/* {
        reverse_proxy auth-api:3000
    }
    handle /sync/* {
        reverse_proxy sync-server:8080
    }
    handle /auth/* {
        root * /srv/auth-pages
        try_files {path} /auth/index.html
        file_server
    }
    handle /notes/* {
        root * /srv/ewe-note
        try_files {path} /notes/index.html
        file_server
    }
    handle /* {
        root * /srv/app
        try_files {path} /index.html
        file_server
    }
}
```

**Tests:** Full stack via `docker compose up` → Caddy routes to all services → SPAs load → API calls work.

**Done when:** Single `docker compose up` starts everything behind Caddy.

---

### Run 2.3: Update ewe-note for Docker Compose

**What:** Ensure ewe-note works as a standalone SPA in the Docker Compose stack. Update auth integration to use better-auth client.

**Files:**
- `packages/ewe-note/vite.config.ts` — set `base: '/notes/'`
- `packages/ewe-note/src/` — replace any auth references to point at new API
- `packages/ewe-note/Dockerfile` — multi-stage build

**Done when:** Ewe Note loads at `/notes/`, authenticates via auth-pages, syncs docs via Hocuspocus.

---

### Run 2.4: Update example-basic for Docker Compose

**What:** Update the basic example app to work in the Docker Compose stack.

**Files:**
- `examples/example-basic/vite.config.ts` — set `base: '/'`
- `examples/example-basic/src/` — update auth server URL references
- `examples/example-basic/Dockerfile` — multi-stage build

**Done when:** Example app works at root path, full auth + sync flow.

---

## Phase 3: Aggregator & Search

> Revive the old aggregator pattern with Y-Sweet + PostgreSQL.

### Run 3.1: Create new aggregator package

**What:** Create a new aggregator service that indexes public Yjs documents in PostgreSQL for search. Uses Hocuspocus's webhook extension to receive change notifications.

**Reuse from `old-code/aggregator/`:**
- Architecture pattern: listen to room docs → observe changes → upsert to DB
- Room tracking logic (`rooms.ts` pattern)
- Express/Hono API structure

**Replace:**
- MatrixProvider → Hocuspocus webhook extension (`@hocuspocus/extension-webhook`) fires on `onChange`
- MongoDB → PostgreSQL (Drizzle ORM, same DB as auth)
- Alternatively: Hocuspocus `openDirectConnection()` for server-side doc reading

**Files:**
- Create `packages/aggregator/`
  - `package.json` — hono, drizzle-orm, postgres, yjs
  - `src/index.ts` — Hono server entry
  - `src/webhook-handler.ts` — receive Hocuspocus webhook events on doc change
  - `src/listener.ts` — alternative: connect to Hocuspocus directly and observe docs (port from `old-code/aggregator/src/rooms.ts`)
  - `src/db/schema.ts` — Drizzle schema for indexed documents
  - `src/db/upsert.ts` — port from `old-code/aggregator/src/mongo-helpers.ts`
  - `src/routes/search.ts` — search/query API
  - `Dockerfile`

**Drizzle schema for indexed documents:**
```typescript
export const indexedDocuments = pgTable('indexed_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull(),
  collectionKey: text('collection_key').notNull(),
  userId: text('user_id'),
  documentData: jsonb('document_data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

**Add to docker-compose.yml:**
```yaml
  aggregator:
    build: packages/aggregator
    depends_on: [postgres, sync-server]
    environment: [DATABASE_URL, SYNC_SERVER_URL, SYNC_AUTH_SECRET]
```

**Tests:**
- Aggregator receives webhook events from Hocuspocus on document changes
- Document changes trigger upsert to Postgres
- Search API returns matching documents

**Done when:** Create a doc via SDK → aggregator indexes it → search API finds it.

**Risks:** Webhook payload size for large documents. Mitigate by sending only doc ID + metadata in webhook, then fetching full content via `openDirectConnection()` if needed.

---

### Run 3.2: Search API

**What:** Add a search endpoint to the aggregator for querying indexed documents.

**Endpoints:**
```
GET /api/search?q=<query>&collection=<key>  → full-text search over indexed docs
GET /api/documents/:roomId                  → all docs in a room
```

**Files:**
- `packages/aggregator/src/routes/search.ts` — PostgreSQL full-text search
- Add GIN index on `document_data` for JSONB search performance

**Done when:** Search returns relevant results from indexed documents.

---

## Phase 4: Deploy & Polish

> Production readiness, documentation, templates.

### Run 4.1: Production Docker Compose

**What:** Create a production-ready `docker-compose.prod.yml` with:
- Proper health checks on all services
- Resource limits
- Restart policies
- Volume management for persistence
- Environment variable documentation
- SSL via Caddy auto-HTTPS

**Files:**
- Create `docker-compose.prod.yml`
- Update `.env.example` with all production vars
- Create `docs/deployment.md` — deployment guide

**Done when:** `docker compose -f docker-compose.prod.yml up -d` runs a production stack with HTTPS.

---

### Run 4.2: SEO — Static landing pages

**What:** Create static landing pages served by Caddy for SEO. The apps themselves remain SPAs.

**Approach:** Simple static HTML/CSS landing pages (can be generated from markdown with a simple build step, or handwritten). Caddy serves these at the root while the SPA loads at `/app/`.

**Files:**
- Create `packages/landing/` — static HTML landing pages
  - `index.html` — main landing page (what is EweserDB, features, get started)
  - `docs/` — static docs pages
- Update Caddyfile to serve landing at `/` and SPA at `/app/`

**Done when:** Search engines can crawl the landing page. SPA loads at `/app/`.

---

### Run 4.3: Update all documentation

**What:** Update docs to reflect the new architecture post-migration.

**Files:**
- Rewrite `ARCHITECTURE.md` — remove "migration" framing, document the final state
- Rewrite `LOCAL_DEVELOPMENT.md` — Docker Compose-based setup (much simpler)
- Update `README.md` — new getting started with Docker Compose
- Update `packages/*/README.md` — each package's new role
- Update `.github/copilot-instructions.md` — remove migration notes

**Done when:** A new developer can set up the project from the docs using only `docker compose up`.

---

### Run 4.4: Clean up old code

**What:** Remove old-code directory and deprecated Next.js auth-server.

**Files:**
- Delete `old-code/` (after confirming all reusable code has been ported)
- Delete `packages/auth-server/` (the Next.js version)
- Update `package.json` workspaces
- Update CI/CD workflows

**Done when:** Monorepo only contains active packages. CI passes.

**Risks:** Must be the very last step. Confirm nothing references old packages.

---

### Run 4.5: One-click deploy templates (future)

**What:** Create deploy templates for DigitalOcean App Platform, Railway, etc.

**Files:**
- Create `deploy/digitalocean/` — App Spec YAML
- Create `deploy/railway/` — railway.json
- Document in `docs/deployment.md`

**Done when:** One-click deploy works on at least one cloud provider.

*Note: This run is aspirational and can be deferred.*

---

## Phase 5: Mobile (Capacitor)

> Wrap ewe-note as a native mobile app using Capacitor. `@eweser/db` runs unchanged in the WebView — IndexedDB, WebSocket, Hocuspocus provider all work natively.

### Run 5.1: Add Capacitor to ewe-note

**What:** Initialize Capacitor in the ewe-note package. Capacitor wraps the Vite SPA in a native WebView — the entire `@eweser/db` SDK runs unchanged (IndexedDB for persistence, WebSocket for Hocuspocus sync).

**Files:**
- `packages/ewe-note/package.json` — add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- `packages/ewe-note/capacitor.config.ts` — Capacitor config:
  ```typescript
  import type { CapacitorConfig } from '@capacitor/cli'
  
  const config: CapacitorConfig = {
    appId: 'com.eweser.ewenote',
    appName: 'Ewe Note',
    webDir: 'dist',
    server: {
      // For dev: point to Vite dev server
      // url: 'http://192.168.x.x:5173',
      // cleartext: true,
    },
  }
  
  export default config
  ```
- Run `npx cap add ios` → creates `packages/ewe-note/ios/`
- Run `npx cap add android` → creates `packages/ewe-note/android/`
- Add to `.gitignore`: `ios/App/App/public/`, `android/app/src/main/assets/public/` (built assets)

**Build flow:**
```bash
cd packages/ewe-note
npm run build          # Vite builds to dist/
npx cap sync           # Copies dist/ to native projects + installs plugins
npx cap open ios       # Opens in Xcode
npx cap open android   # Opens in Android Studio
```

**Tests:**
- `npm run build && npx cap sync` completes without errors
- iOS simulator: app opens, login page renders, can authenticate
- Android emulator: same
- Offline: create notes without network → reconnect → notes sync via Hocuspocus

**Done when:** Ewe Note runs as a native app on iOS simulator and Android emulator, with full auth + Hocuspocus sync + offline persistence via IndexedDB in the WebView.

**Risks:**
- WebView IndexedDB storage limits on iOS (default ~50MB, expandable) — fine for notes
- Deep links / OAuth redirect handling in native WebView may need `@capacitor/browser` plugin for OAuth flows
- iOS WKWebView works well with WebSocket; older Android WebViews may need `@capacitor/app` lifecycle handling for background/resume

---

### Run 5.2: Native capabilities (optional)

**What:** Add native plugins for capabilities that improve the mobile experience beyond what a PWA offers.

**Plugins to evaluate:**
- `@capacitor/push-notifications` — notify when shared docs are updated
- `@capacitor/share` — native share sheet for room invite links
- `@capacitor/filesystem` — export notes as files
- `@capacitor/haptics` — tactile feedback
- `@capacitor/status-bar` — style the status bar
- `@capacitor/splash-screen` — app launch screen
- `@capacitor/keyboard` — keyboard behavior for the editor

**Files:**
- `packages/ewe-note/package.json` — add selected plugins
- `packages/ewe-note/src/lib/native.ts` — native capability abstraction (no-op on web)
- `packages/ewe-note/ios/` and `android/` — plugin registration (auto via `cap sync`)

**Done when:** At least splash screen + status bar + share are working. Push notifications are stretch.

*Note: This run is aspirational — the core mobile story is complete after Run 5.1.*

---

### Run 5.3: App Store preparation (future)

**What:** Prepare for App Store (iOS) and Play Store (Android) submission.

**Files:**
- App icons and splash screens (all required sizes)
- `packages/ewe-note/ios/App/App/Info.plist` — permissions, descriptions
- `packages/ewe-note/android/app/src/main/AndroidManifest.xml` — permissions
- Privacy policy URL (already exists from auth-pages)
- Screenshots for store listings

**Done when:** Builds pass App Store / Play Store review.

*Note: Deferred until the app is polished enough for public release.*

---

## What to Keep from old-code/

| Source | Keep | Action |
|--------|------|--------|
| `old-code/aggregator/src/rooms.ts` | ✅ Yjs observe → upsert pattern | Port to Run 3.1 |
| `old-code/aggregator/src/mongo-helpers.ts` | ✅ Upsert logic structure | Adapt for Drizzle/Postgres in Run 3.1 |
| `old-code/aggregator/src/server.ts` | ✅ Express API skeleton | Reference for Hono aggregator API |
| `old-code/*.cy.js` (Cypress tests) | ✅ Test scenarios | Port to updated Cypress tests after Phase 2 |
| `old-code/example-synced-store/` | ❌ @syncedstore unmaintained | Archive |
| `old-code/db copy/` | ❌ Superseded by current SDK | Archive |
| `old-code/example-editor/` | ❌ Replaced by ewe-note | Archive |
| `old-code/example-interop-*/` | ⚠️ Interop test patterns | Reference only — port test scenarios |
| `old-code/example-multi-room/` | ⚠️ Multi-room UI patterns | Reference for ewe-note features |
| `old-code/example-offline-first/` | ❌ Already in current SDK | Archive |

### Cypress test scenarios to port:
1. **Auth flow** — register → login → logout (from `editor.cy.js`, `local-first.cy.js`)
2. **Offline-first** — create docs offline → sign up → docs persist (from `local-first.cy.js`)
3. **Interoperability** — two apps sharing same Yjs doc (from `interoperability.cy.js`)
4. **Multi-room** — create/switch/manage rooms (from `multi-room.cy.js`)

---

## Risks

1. **better-auth session model vs existing JWT access-grant model** — better-auth manages its own sessions. We need to bridge: better-auth for user login sessions, existing JWT system for room-level access grants. These can coexist (different tokens for different purposes).

2. **Hocuspocus provider migration** — Replacing `@y-sweet/client` with `@hocuspocus/provider` in the SDK is the highest-effort change. The Room class properties change (`ySweetUrl` → `syncUrl`). Published API change requires a changeset and major version bump. Mitigate with deprecated aliases.

3. **Data migration for existing users** — Existing deployments using Supabase will need a migration path. Document it, but don't block the refactor on it. Most early deployments will be fresh installs.

4. **Hocuspocus at scale** — Node.js single-threaded. Each active doc is a full Yjs instance in memory (~50-200KB). Fine for <1000 concurrent docs. For larger scale, use Redis extension for multi-instance and/or PostgreSQL persistence extension to reduce memory pressure. This is a config change, not a code change.

5. **Scope creep** — This is a large migration. Each phase should be independently shippable. Don't let Phase 3/4 block Phase 1/2.

6. **Zero third-party mandate** — Every service must be self-hostable in Docker Compose with no external accounts. Validate this at the end of Phase 1: `docker compose up` must work on a fresh machine with only Docker installed.

## Open Questions

1. Should the auth-pages SPA use `@better-auth/react` client or raw fetch? (Recommendation: use the official client SDK for type safety)
2. Should the aggregator share the same Postgres instance as auth, or have its own? (Recommendation: same instance, different schema/tables — simpler for self-hosters)
3. Do we need email sending for verification? If so, which provider? (Recommendation: optional, configurable SMTP — Resend, Postmark, or self-hosted. Default to no email verification for dev.)
4. Should we keep the Supabase migration files as a reference, or clean-delete? (Recommendation: keep in a `docs/legacy/` folder temporarily)

## Execution Order

```
Phase 1 (Foundation):  1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
Phase 2 (Frontend):    2.1 → 2.2 → 2.3 → 2.4  (can start after 1.5)
Phase 3 (Aggregator):  3.1 → 3.2                (can start after 1.2)
Phase 4 (Polish):      4.1 → 4.2 → 4.3 → 4.4 → 4.5 (after Phase 1-3)
Phase 5 (Mobile):      5.1 → 5.2 → 5.3          (can start after 2.3)
```

Phases 2 and 3 can run in parallel after Phase 1 foundation is done.
Phase 5 can start as soon as ewe-note works as a standalone SPA (Run 2.3).

---

## Status

- [ ] Approved by user
