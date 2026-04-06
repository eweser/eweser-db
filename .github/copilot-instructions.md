# EweserDB — Copilot Instructions

> ⚠️ **REQUIRED READING** before any work in this repo.

## Project Overview

EweserDB is a local-first, user-owned database SDK built on Yjs CRDTs. Users own their data; apps interoperate over shared schemas. See [ARCHITECTURE.md](../ARCHITECTURE.md) for full system design.

## Must-Read Files

1. [ARCHITECTURE.md](../ARCHITECTURE.md) — System design, tech stack, migration plan
2. [LOCAL_DEVELOPMENT.md](../LOCAL_DEVELOPMENT.md) — Dev environment setup
3. [README.md](../README.md) — Project philosophy and API overview

## Hard Stops

- **Never** commit secrets, API keys, or `.env` files
- **Never** push directly to `main` — always use PRs
- **Never** modify published package APIs without a changeset (`npm run changeset`)
- **Never** delete Supabase migrations — only add new ones

## Current State: Migration In Progress

The project is undergoing a major migration:

- **Removing:** Next.js from auth-server
- **Adding:** Docker Compose for all services (auth API, auth pages, ewe-note, example app, Hocuspocus, Caddy, Postgres, aggregator)
- **Auth backend replacement:** Hono + better-auth (decided)
- **Frontend apps:** Converting to React SPAs (Vite)
- **SEO:** Static landing pages + SPA/PWA for app functionality (approach TBD)

When working on auth-server code, be aware it's being migrated away from Next.js. Prefer changes that are framework-agnostic where possible.

## Tech Stack

| Layer           | Tech                                                             |
| --------------- | ---------------------------------------------------------------- |
| **Core SDK**    | TypeScript, Yjs, y-indexeddb, @hocuspocus/provider               |
| **Auth**        | better-auth + Drizzle ORM + PostgreSQL (migrating from Supabase) |
| **Sync Server** | Hocuspocus (TypeScript, SQLite/Postgres persistence)             |
| **Frontend**    | React 18-19, Vite, Tailwind CSS, Radix UI                        |
| **Editor**      | BlockNote (in ewe-note)                                          |
| **Testing**     | Vitest (unit), Cypress (E2E)                                     |
| **Build**       | Vite, tsc, npm workspaces                                        |
| **CI/CD**       | GitHub Actions                                                   |

## Working Rules

1. **Monorepo awareness** — This is an npm workspaces monorepo. Changes in `packages/shared` affect all consumers. Run `npm run build` from root to verify.
2. **Type safety** — All packages use TypeScript. No `any` unless absolutely necessary.
3. **Changesets** — Any change to a published package (`@eweser/db`, `@eweser/shared`, `@eweser/examples-components`) needs a changeset.
4. **Tests** — Run `npm test` before committing. E2E tests via `npm run test:e2e`.
5. **Yjs patterns** — Understand Yjs documents, Y.Map, Y.Array, Y.Text before modifying `packages/db`. Changes are CRDT operations, not direct mutations.
6. **Library Versions** — Always use the latest stable versions of libraries. Ensure versions are unified across all workspace packages to prevent duplicate bundles and type mismatches.

## Package Relationships

```
@eweser/shared          ← types, schemas (no deps)
    ↑
@eweser/db              ← core SDK (depends on shared, yjs)
    ↑
@eweser/examples-components  ← UI components (depends on db)
    ↑
example-basic / ewe-note     ← apps (depend on db, components)

auth-server             ← independent (Supabase, Drizzle, JWT)
```

## Common Commands

```bash
npm install              # Install all workspace deps
npm run dev              # Start all dev servers
npm run build            # Build all packages
npm test                 # Run all tests
npm run test:e2e         # Cypress E2E tests
npm run changeset        # Create a changeset for publishing
npm run release          # Publish changed packages to npm
```

## Agent Architecture

This repo uses a three-phase agent workflow:

1. **@planner** — Research, ask questions, produce a scoped plan
2. **@coder** — Implement the approved plan with tests
3. **@qa** — Run tests, review code, verify quality

See `.github/agents/` for all agent configurations.

## Session Memory

At the end of every coding session, save a session summary using `eweser_save_memory`:

```
"save session: <brief description of what was accomplished>"
```

This calls `eweser_save_memory` with `memoryType: "session"`, `roomId: "ec8a7adb-45ca-4480-8de9-b4d74173f73f"`, and stores it in the conversations room. To recall past decisions and sessions, use `eweser_search`:

```json
{ "tool": "eweser_search", "args": { "query": "your topic", "filters": { "memoryType": ["decision", "session"] } } }
```

See [CLAUDE.md](../CLAUDE.md) for full manual workflow details.
