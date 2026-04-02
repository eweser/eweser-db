---
description: 'Plan the big refactor: remove Next.js + Supabase, Docker Compose everything, custom auth, revive aggregator'
---

# Big Refactor Planning Prompt

You are planning the major EweserDB migration. This is a large, multi-phase refactor. Your job is to produce a comprehensive, phased plan that can be executed run-by-run.

## Read First

1. `ARCHITECTURE.md` — current system design and migration targets
2. `.github/copilot-instructions.md` — project rules
3. `LOCAL_DEVELOPMENT.md` — current dev setup (what we're replacing)
4. `packages/auth-server/src/` — current auth implementation (Next.js + Supabase)
5. `packages/db/src/` — SDK auth integration (Room class, Database class)
6. `packages/shared/src/` — shared types and schemas
7. `old-code/aggregator/src/` — old aggregator (Matrix + MongoDB pattern, worth reviving)
8. `old-code/` — scan all subdirectories for reusable patterns, tests, or code

## Migration Goals

### 1. Remove Next.js

The auth server (`packages/auth-server`) currently uses Next.js. Replace with a lightweight Node backend:

- **Investigate:** Express vs Hono vs Fastify — recommend one with rationale
- **Port:** All API routes from Next.js App Router handlers to the chosen framework
- **Port:** Middleware (CORS, auth guards, JWT refresh)
- Auth pages (login, signup, account) become a separate React SPA (Vite)

### 2. Remove Supabase Auth Dependency

Users should NOT need a Supabase account to self-host. Replace with:

- **Self-hosted PostgreSQL** in Docker (Drizzle ORM stays — just change the connection)
- **Custom auth system** replacing Supabase Auth:
  - Email/password registration with bcrypt/argon2 password hashing
  - JWT session tokens (we already issue JWTs — extend this)
  - OAuth support (GitHub, Google) via Passport.js or similar
  - Email verification (optional, configurable)
- **Migration path:** Existing Supabase users should be able to keep using Supabase as an external DB if they want, but it's no longer required

### 3. Docker Compose — One-Image Deploy

Create a `docker-compose.yml` at repo root with all services:

- **auth-api** — Node server (the new auth backend)
- **auth-pages** — Static serve of the auth React SPA
- **ewe-note** — Static serve of the note app SPA
- **y-sweet** — Self-hosted Y-Sweet CRDT sync server
- **postgres** — PostgreSQL database
- **aggregator** — Server-side data indexing (revived from old-code)
- Eventually: one-click deploy on DigitalOcean, Railway, etc.

### 4. Revive the Aggregator

The old aggregator (`old-code/aggregator/`) used Matrix + MongoDB to index public Yjs rooms. Revive the pattern with modern tech:

- Replace Matrix provider with Y-Sweet provider
- Replace MongoDB with PostgreSQL (same DB as auth, or separate)
- Keep the core pattern: observe Yjs doc changes → upsert to searchable store
- Expose search/query API

### 5. SEO Strategy

Apps need to be findable. Investigate and recommend:

- Static landing pages (served by auth-api or nginx)
- SPA/PWA for app functionality
- Pre-rendering or SSG for key pages

## What to Keep from old-code/

Inspect `old-code/` thoroughly and identify:

- **Aggregator:** Core indexing pattern (observe → store → query). What can be directly reused vs needs rewrite?
- **Example apps:** Any patterns, components, or test scenarios worth preserving?
- **Cypress tests:** `old-code/*.cy.js` — any test scenarios to port to the new setup?
- **@syncedstore patterns:** From `example-synced-store/` — useful reactive wrapper?
- **db copy:** Any SDK patterns from the older version worth comparing?

## Key Constraints

- `@eweser/db` SDK talks to auth server via `serverFetch()` — it never imported Supabase directly. The SDK's auth interface (`login`, `loginWithToken`, `getToken`, `refreshYSweetToken`) should remain stable. Internal implementation changes only.
- Drizzle ORM and the existing schema (users, rooms, access_grants, apps) should survive with minimal changes. Add new tables for custom auth (sessions, password hashes, etc.)
- Y-Sweet client code in the SDK doesn't need to change — only the server hosting changes.
- Published packages (`@eweser/db`, `@eweser/shared`) API changes need changesets.

## Output Format

Produce a phased plan:

### Phase 1: Foundation (do first, unblocks everything)

- Docker Compose with Postgres + Y-Sweet
- Custom auth system (replace Supabase Auth)
- Auth API server (replace Next.js backend)

### Phase 2: Frontend Migration

- Auth pages as React SPA
- Ewe Note as standalone SPA
- Example app updates

### Phase 3: Aggregator & Search

- Revive aggregator with Y-Sweet + Postgres
- Search API

### Phase 4: Deploy & Polish

- One-image Docker build
- DigitalOcean/Railway deploy templates
- SEO (static landing pages)
- Documentation updates

For each phase, break down into numbered runs with:

- **What:** Description
- **Files:** Specific files to create/modify/delete
- **Tests:** What to verify
- **Done when:** Acceptance criteria
- **Risks:** What could go wrong

## Research Questions to Answer

Before finalizing the plan, investigate and answer:

1. Express vs Hono vs Fastify — which is best for this use case? (bundle size, middleware ecosystem, TypeScript support, Docker friendliness)
2. What's the simplest custom auth that covers email/password + OAuth? (Passport.js? Lucia? Roll our own with bcrypt + JWT?)
3. Can Y-Sweet be self-hosted in Docker easily? What's the official image?
4. What's the lightest way to serve multiple React SPAs from one Docker Compose? (nginx? each app in its own container? single static server?)
5. What Supabase-specific code exists in the auth server that needs replacing? (RLS policies, auth hooks, realtime subscriptions?)
