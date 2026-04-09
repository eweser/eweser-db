# Plan: Remove Legacy Code

## Goal

Delete all pre-migration legacy code (Next.js auth-server, Supabase, Y-Sweet, y-webrtc, old-code/ directory) and update CI to use the Docker backend for E2E tests.

## Scope

- **In:** Remove `packages/auth-server`, `old-code/`, abandoned CI workflow, stale `package.json` scripts, y-webrtc type reference in `packages/db`
- **Out:** `packages/auth-server-hono`, `packages/auth-pages`, `packages/ewe-note` (all active, keep)

## What Was Found

### 1. `packages/auth-server/` — REMOVE (entire directory)

The legacy **Next.js 16 + Supabase + Y-Sweet** auth server. Fully replaced by:

- API: `packages/auth-server-hono` (Hono + better-auth + Drizzle)
- UI: `packages/auth-pages` (React SPA, served statically by Caddy)

Contains: Next.js app, Supabase migration files, Y-Sweet token service, `supabase/config.toml`, `vercel.json`.

### 2. `old-code/` — REMOVE (entire directory)

Pre-Hocuspocus era code using **Matrix + y-webrtc + MongoDB**. Includes:

- `old-code/aggregator/` — Matrix+MongoDB aggregator (replaced by `packages/aggregator`)
- `old-code/db copy/` — Old DB with `y-webrtc` and `matrix-crdt`
- `old-code/example-*/` — 6 old example apps
- `old-code/*.cy.js` — Old Cypress tests (Matrix-era, completely obsolete)

### 3. `.github/workflows/auth-sever-sdb-deploy.yaml` — REMOVE

Deploys Supabase migrations from `packages/auth-server/supabase/migrations/`. No longer needed.

### 4. `package.json` scripts — UPDATE (remove stale)

Scripts that reference the old Next.js auth-server:

```json
"dev:auth-server": "cd packages/auth-server && npm run dev",        // REMOVE
"build-auth-server": "cd packages/auth-server && npm run build",    // REMOVE
"run-auth-server": "cd packages/auth-server; npm run start",        // REMOVE
"ci-start": "run-p run-auth-server run-example-previews",           // FIX (see below)
```

The `build` script also includes `build-auth-server` in the chain — remove that item.

### 5. `.github/workflows/quality.yaml` e2e-smoke step — UPDATE

Currently starts legacy auth-server (`npm run dev:auth-server`) as a dependency and waits on port `38100`. The current E2E tests are **local-only** (no auth server calls required for basic/kitchen-sink tests), so the fix is:

- Replace `npm run dev:auth-server` with `docker compose -f docker-compose.dev.yml up -d`
- Wait on Docker services (port `38101` for auth-api health, or skip if tests are truly offline)
- Update `ci-start` script accordingly

### 6. `packages/db` — MINOR UPDATE

`packages/db/src/room.ts` has `import type { WebrtcProvider } from 'y-webrtc'` — only a type import, never instantiated. Removing the type import and `webRtcProvider` field from the `Room` type is a **breaking API change** (published package), so it needs a changeset. Alternatively, keep the type import as deprecated until a major release.

### 7. `packages/db/package.json` — `y-webrtc` dependency

The `y-webrtc` package is listed as a dependency but is only used for the type import. Pair with the type removal above.

---

## Runs

### Run 1: Delete `packages/auth-server` and `old-code/`

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Pure deletion, no logic changes
- [ ] `rm -rf packages/auth-server`
- [ ] `rm -rf old-code`
- Tests: `npm run type-check` to confirm nothing imports from them

### Run 2: Remove stale `package.json` scripts

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Simple string removals in one file
- [ ] Remove `dev:auth-server` script
- [ ] Remove `build-auth-server` script
- [ ] Remove `run-auth-server` script
- [ ] Remove `build-auth-server` from `build` script chain
- [ ] Update `ci-start` to use `docker compose` or drop entirely (assess if still needed)
- Tests: `npm run build` from root should still work

### Run 3: Remove Supabase deploy workflow

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Single file deletion
- [ ] `rm .github/workflows/auth-sever-sdb-deploy.yaml`

### Run 4: Update CI e2e-smoke to use Docker backend

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Requires understanding which tests need backend and how to start Docker in CI
- [ ] Replace `npm run dev:auth-server` with `docker compose -f docker-compose.dev.yml up -d`
- [ ] Wait on auth-api health (`localhost:38101/health`) instead of port 38100
- [ ] Update env var: example-basic should point to `VITE_AUTH_SERVER=http://localhost:38101`
- [ ] Update `examples/example-basic/example.env` if needed
- Tests: CI should pass on the PR

### Run 5: Remove `y-webrtc` (optional — needs changeset)

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Breaking change to published API — needs careful changeset, removal of `webRtcProvider` from Room type and `y-webrtc` from `packages/db/package.json`
- [ ] Remove `import type { WebrtcProvider } from 'y-webrtc'` from `packages/db/src/room.ts`
- [ ] Remove `webRtcProvider` field from `RoomOptions` and `Room` types
- [ ] Remove `y-webrtc` from `packages/db/package.json`
- [ ] Run `npm run changeset` (patch or minor depending on whether any external apps use `webRtcProvider`)
- Tests: `npm run type-check -w @eweser/db`

---

## Risks

- **CI auth requirement:** The E2E tests currently start the legacy auth-server. We need to verify whether example-basic actually makes auth calls during the test run (from the test code, it looks like it doesn't — tests are offline-only). If it does, the Docker backend must be running in CI.
- **Docker in CI:** GitHub Actions runners have Docker pre-installed on `ubuntu-latest`, so `docker compose up -d` will work. First run will build images which adds ~3-5 min to CI time. Can be mitigated with caching.
- **y-webrtc removal:** Only a `type` import. Removing it is low risk but it's a published API change. If any downstream apps pass `webRtcProvider` to Room options, they'd break.
- **auth-server supabase migrations:** Once deleted, they're gone from git history (accessible via `git log` if ever needed). Not a functional risk since we're on the new stack.

## Execution Summary

```text
Run 1: Delete auth-server + old-code/ (Fast)
Run 2: Clean package.json scripts (Fast)       ← can run parallel with Run 1
Run 3: Delete Supabase workflow (Fast)         ← can run parallel with Run 1
    └── Run 4: Update CI e2e-smoke (Smart)     ← depends on Run 2 knowing what scripts exist
        └── Run 5: Remove y-webrtc (Smart)     ← independent, but save for after rest is confirmed
```

## Status

- [ ] Approved by user
