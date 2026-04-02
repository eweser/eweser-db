# Plan: Big Refactor — Remove Next.js + Supabase, Docker Compose Everything

> **Created:** 2026-04-02
> **Status:** Draft — awaiting approval

## Goal

Remove Next.js and Supabase as dependencies so EweserDB can be fully self-hosted via a single Docker Compose, with custom auth, a revived aggregator, and all apps as React SPAs.

Hard-cutover assumption (2026-04-02): the app is not live, so this refactor does not include backward-compatibility shims or legacy user-data migration.

---

## Research Decisions

### Framework: **Hono**

- Web Standard `Request`/`Response` — Next.js App Router handlers port nearly 1:1
- Zero deps, <14KB — smallest Docker footprint
- Built-in middleware: JWT, CORS, body parsing, bearer auth
- First-class TypeScript with typed routes

### Auth: **better-auth**

- Native Drizzle adapter with PostgreSQL (`provider: "pg"`)
- Built-in email/password + social sign-on (GitHub, Google — one-liner config)
- CLI generates Drizzle schema: `npx @better-auth/cli generate`
- Hono integration documented (mount as handler)
- Plugin ecosystem: 2FA, passkeys, magic links, orgs (future extensibility)

### CRDT Sync: **Hocuspocus**

- MIT licensed (Tiptap GmbH), ~5-8K LOC TypeScript — fully maintainable by a TS team
- Actively developed — v3.4.4 stable (Jan 2026), v4.0.0-rc.5 (Mar 2026)
- Extension architecture: SQLite, Postgres, Redis, S3, Webhook, Logger
- 20+ lifecycle hooks: `onAuthenticate`, `onLoadDocument`, `onChange`, etc.
- Auth via `onAuthenticate` hook — integrates directly with better-auth sessions
- Webhook extension fires on `onChange` — perfect for the aggregator
- **Tiered storage (no third-party accounts needed):**
  - Default: SQLite (`@hocuspocus/extension-sqlite`) — single file in Docker volume
  - Durable: PostgreSQL (`@hocuspocus/extension-database`) — same DB as auth
  - Scalable: Redis pub/sub (`@hocuspocus/extension-redis`) for multi-instance

### SPA Serving: **Caddy**

- Auto HTTPS, HTTP/3, simple Caddyfile config
- Reverse-proxies to auth API + Hocuspocus
- Serves all SPA static files from different base paths

### Library Versions & Unification

- **Latest Stable:** Use the most recent stable versions of all libraries (Hono, better-auth, Hocuspocus, Drizzle, React, Vite).
- **Monorepo Unification:** All packages must use the same version of shared dependencies (React 19, Yjs, Drizzle, etc.).
- **Audit:** Run `npm audit` and `npm outdated` at the start of each phase.
- **Peer Dependencies:** Ensure `@eweser/db` and `@eweser/shared` have correct peer dependency ranges to avoid version duplication in consumer apps.

---

## Scope

### In

- Replace Next.js auth-server backend with Hono + better-auth
- Replace Supabase PostgreSQL with self-hosted Docker Postgres
- Replace `@y-sweet/client` with `@hocuspocus/provider` in the SDK
- Create Docker Compose for full stack
- Extract auth UI pages into React SPA (Vite)
- Port ewe-note to SPA + PWA (ewe-note only — example-basic does not need PWA)
- Revive aggregator (Hocuspocus webhooks + Postgres)
- Update all documentation and AI agent instructions for the new architecture

### Out

- Native mobile SDKs initially — Capacitor wraps the PWA (Phase 5)
- Third-party hosting accounts — zero required to self-host

---

## Phases

| Phase                       | File                                                     | Prerequisite | Status         |
| --------------------------- | -------------------------------------------------------- | ------------ | -------------- |
| **1 — Foundation**          | [phase-1-foundation](./2026-04-02-phase-1-foundation.md) | Nothing      | ⬜ Not started |
| **2 — Frontend Migration**  | [phase-2-frontend](./2026-04-02-phase-2-frontend.md)     | Phase 1      | ⬜ Not started |
| **3 — Aggregator & Search** | [phase-3-aggregator](./2026-04-02-phase-3-aggregator.md) | Run 1.2      | ⬜ Not started |
| **4 — Deploy & Polish**     | [phase-4-deploy](./2026-04-02-phase-4-deploy.md)         | Phases 1–3   | ⬜ Not started |
| **5 — Mobile (Capacitor)**  | [phase-5-mobile](./2026-04-02-phase-5-mobile.md)         | Run 2.3      | ⬜ Not started |

Phases 2 and 3 can run **in parallel** after Phase 1 is done.
Phase 5 can start as soon as Run 2.3 (ewe-note SPA + PWA) is complete.

---

## Execution Order

```
Phase 1:  1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
Phase 2:  2.1 → 2.2 → 2.3 → 2.4       ← starts after 1.5
Phase 3:  3.1 → 3.2                    ← starts after 1.2 (parallel with Phase 2)
Phase 4:  4.1 → 4.2 → 4.3 → 4.4 → 4.5 ← after Phases 1–3
Phase 5:  5.1 → 5.2 → 5.3             ← starts after 2.3
```

---

## Local Dev Strategy

- **Docker Compose** (`docker-compose.dev.yml`): Postgres + Hocuspocus + Caddy — stateless services
- **Host** (`npm run dev`): Vite dev servers for all apps — fast HMR requires direct filesystem access
- **Auth API (Hono)**: Run on host during active dev, Docker when testing integration
- **WSL2:** Repo must stay on Linux filesystem (`/home/`, not `/mnt/c/`) for acceptable I/O

---

## Risks

1. **better-auth session model vs existing JWT access-grant model** — better-auth manages its own sessions. Bridge: better-auth for user login sessions, existing JWT system for room-level access grants. These can coexist.

2. **Hocuspocus provider migration** — `@y-sweet/client` → `@hocuspocus/provider` is the highest-effort change. Room class properties change (`ySweetUrl` → `syncUrl`). Requires changeset and major version bump.

3. **No legacy user migration in scope** — This is a fresh-install cutover. Existing Supabase-user migration is explicitly out of scope for this refactor.

4. **Hocuspocus at scale** — Node.js single-threaded; fine for <1000 concurrent docs. For larger scale: Redis extension for multi-instance, PostgreSQL extension for memory pressure. Config change only.

5. **Scope creep** — Each phase is independently shippable. Don't let Phase 3/4 block Phase 1/2.

---

## Open Questions

1. Should auth-pages SPA use `@better-auth/react` client or raw fetch? (Recommendation: official client SDK)
2. Should aggregator share the same Postgres instance as auth? (Recommendation: yes — same instance, different tables)
3. Do we need email sending for verification? (Recommendation: optional configurable SMTP — default off for dev)
4. Keep Supabase migration files as reference? (Recommendation: yes, as historical reference only; not part of runtime path)

---

## What to Keep from old-code/

| Source                                     | Keep                            | Action                          |
| ------------------------------------------ | ------------------------------- | ------------------------------- |
| `old-code/aggregator/src/rooms.ts`         | ✅ Yjs observe → upsert pattern | Port to Run 3.1                 |
| `old-code/aggregator/src/mongo-helpers.ts` | ✅ Upsert logic structure       | Adapt for Drizzle/Postgres      |
| `old-code/aggregator/src/server.ts`        | ✅ API skeleton                 | Reference for Hono aggregator   |
| `old-code/*.cy.js` (Cypress tests)         | ✅ Test scenarios               | Port after Phase 2              |
| `old-code/example-synced-store/`           | ❌ @syncedstore unmaintained    | Archive                         |
| `old-code/db copy/`                        | ❌ Superseded                   | Archive                         |
| `old-code/example-editor/`                 | ❌ Replaced by ewe-note         | Archive                         |
| `old-code/example-interop-*/`              | ⚠️ Test patterns                | Reference only                  |
| `old-code/example-multi-room/`             | ⚠️ Multi-room UI                | Reference for ewe-note features |

---

## Status

- [ ] Approved by user
