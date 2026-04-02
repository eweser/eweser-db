# Phase 1: Foundation

> **Plan:** [Big Refactor Index](./2026-04-02-big-refactor.md)
> **Goal:** Get Docker Compose running with Postgres, Hocuspocus, and a new Hono auth API with better-auth. Unblocks everything.

## Progress

- [ ] Run 1.1 — Docker Compose skeleton + PostgreSQL + Hocuspocus
- [ ] Run 1.2 — Initialize Hono auth API server
- [x] Run 1.3 — Port database schema + migrations
- [x] Run 1.4 — Integrate better-auth
- [x] Run 1.5 — Port API routes from Next.js to Hono
- [x] Run 1.6 — Update SDK — replace Y-Sweet client with Hocuspocus provider

## Agent Scratchpad

> Use this section to track decisions, blockers, and notes during implementation.

- 2026-04-02 decision: hard cutover. App is not live, so no backwards compatibility layer and no legacy user-data migration path are required.
- 2026-04-02 result: Run 1.6 completed. `@eweser/db` now uses `@hocuspocus/provider`, shared room and refresh-token contracts use `syncUrl` and `syncToken`, db tests passed, and `packages/shared`, `packages/db`, and `packages/auth-server-hono` builds were verified.

---

## Run 1.1: Docker Compose skeleton + PostgreSQL + Hocuspocus

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Initial infrastructure setup and Docker networking require high precision.

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
import { Server } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';

const server = Server.configure({
  port: 8080,
  extensions: [new SQLite({ database: '/data/sync.sqlite' })],
});

server.listen();
```

**Docker Compose services:**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment: [POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB]
    ports: ['5432:5432']
    healthcheck: pg_isready

  sync-server:
    build: packages/sync-server
    volumes: [sync-data:/data]
    ports: ['8080:8080']
    environment: [SYNC_AUTH_SECRET]
```

**Tests:** `docker compose up -d` → Postgres accepts connections → Hocuspocus WebSocket responds on :8080

**Done when:** Both services start, are healthy, and can be connected to from host. Zero external dependencies.

**Risks:** Low — Hocuspocus is pure TypeScript, well-documented, actively maintained.

---

## Run 1.2: Initialize Hono auth API server

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Setting up the new Hono + Drizzle foundation for the entire auth system.

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
  ports: ['3000:3000']
```

**Tests:** Docker compose up → auth-api healthy → Drizzle connects to Postgres → `GET /health` returns 200.

**Done when:** Hono server starts in Docker, connects to Postgres via Drizzle.

**Risks:** Drizzle postgres driver compatibility with connection string format.

---

## Run 1.3: Port database schema + migrations

**Recommended Agent:** `02-coder` (Fast)
**Reason:** Mostly moving existing Drizzle code and SQL migrations.

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

**Risks:** Minimal. Fresh-install migration path only.

---

## Run 1.4: Integrate better-auth

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Critical security implementation and session management logic.

**What:** Set up better-auth with Drizzle adapter for email/password + OAuth (GitHub, Google).

**Files:**

- Create `packages/auth-server-hono/src/auth.ts` — better-auth config
- Create `packages/auth-server-hono/src/routes/auth.ts` — mount better-auth handler on Hono
- Update `packages/auth-server-hono/src/model/` with better-auth generated tables
- Create `packages/auth-server-hono/src/middleware/auth.ts` — session validation middleware

**better-auth config:**

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});
```

**Tests:**

- Sign up with email/password → user created in DB → session token returned
- Sign in with email/password → session token returned
- Invalid credentials → 401
- OAuth flow initiation (mock callback)

**Done when:** Can create account, sign in, get session — all without Supabase.

**Risks:** better-auth session model vs existing JWT access-grant model — may need to bridge the two (better-auth for login sessions, existing JWT system for room access grants).

---

## Run 1.5: Port API routes from Next.js to Hono

**Recommended Agent:** `02-coder` (Fast)
**Reason:** Repetitive task of converting Next.js handlers to Hono handlers.

**What:** Port all required auth-server API endpoints from Next.js App Router to Hono routes as the new canonical API contract. Do not preserve legacy response shapes or route aliases.

**Existing routes to port:**

| Next.js Route                                  | Method | Hono Route                                     | Notes                              |
| ---------------------------------------------- | ------ | ---------------------------------------------- | ---------------------------------- |
| `/access-grant/sync-registry`                  | POST   | `/api/access-grant/sync-registry`              | Protected — returns rooms for user |
| `/access-grant/get-rooms`                      | POST   | `/api/access-grant/get-rooms`                  | Public — JWT-based room lookup     |
| `/access-grant/create-room-invite`             | POST   | `/api/access-grant/create-room-invite`         | Public — generate invite JWT       |
| `/access-grant/update-room/[roomId]`           | POST   | `/api/access-grant/update-room/:roomId`        | Protected — rename room            |
| `/access-grant/refresh-y-sweet-token/[roomId]` | GET    | `/api/access-grant/refresh-sync-token/:roomId` | Protected — sync token refresh     |
| `/auth/callback`                               | GET    | `/api/auth/callback`                           | OAuth redirect handler             |
| `/auth/confirm`                                | GET    | `/api/auth/confirm`                            | Email OTP confirmation             |

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

**Done when:** The Hono API contract is fully implemented and SDK `serverFetch()` calls succeed against the new server.

**Risks:** Subtle behavior differences in error handling between Next.js and Hono response objects. Test each endpoint against the SDK.

---

## Run 1.6: Update SDK — replace Y-Sweet client with Hocuspocus provider

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Core SDK changes involving CRDT providers and WebSocket logic.

**What:** Replace `@y-sweet/client` with `@hocuspocus/provider` in `@eweser/db`. Update the SDK to connect to Hocuspocus instead of Y-Sweet. Also verify auth server integration.

**Files:**

- `packages/db/package.json` — remove `@y-sweet/client`, add `@hocuspocus/provider`
- `packages/db/src/room.ts` — replace Y-Sweet provider init with Hocuspocus provider:

  ```typescript
  import { HocuspocusProvider } from '@hocuspocus/provider';

  // Replace createYjsProvider() with:
  const provider = new HocuspocusProvider({
    url: this.syncServerUrl,
    name: roomId,
    document: ydoc,
    token: authToken, // from auth server
  });
  ```

- `packages/db/src/index.ts` — update auth endpoint paths if changed, rename `refreshYSweetToken` → `refreshSyncToken` (internal method)
- `packages/db/src/utils/serverFetch.ts` — verify request format
- `packages/shared/src/api/` — update types (rename Y-Sweet references)

**Key changes:**

- `HocuspocusProvider` uses standard WebSocket (no connection string pattern)
- Auth token is passed as `token` config — Hocuspocus `onAuthenticate` hook validates it server-side
- Single WebSocket connection can multiplex docs (v4 feature)
- `ySweetUrl`/`ySweetBaseUrl` fields in Room → `syncUrl` (rename in types)
- No deprecated aliases for old Y-Sweet names; SDK and apps move to the new names directly

**Tests:**

- SDK `login()` against new auth server
- SDK `syncRegistry()` receives correct room list
- SDK connects to Hocuspocus and syncs documents
- Full flow: login → create room → load room → sync via Hocuspocus
- Offline-first: create docs without sync server → connect later → docs sync

**Done when:** SDK syncs via Hocuspocus instead of Y-Sweet. This is an intentional published API breaking change (provider swap) and needs a changeset and major version bump.

**Risks:** This is the highest-effort SDK change. The `Room` class properties change (`ySweetUrl` → `syncUrl`) and apps using the SDK must update in lockstep.

## Execution Summary

```text
Run 1.1: Docker Compose skeleton (Smart)
└── Run 1.2: Initialize Hono auth API (Smart) [Parallel with 1.1]
    └── Run 1.3: Port DB schema (Fast)
        └── Run 1.4: Integrate better-auth (Smart)
            └── Run 1.5: Port API routes (Fast)
                └── Run 1.6: Update SDK (Smart)
```

## Status

- [ ] Approved by user
