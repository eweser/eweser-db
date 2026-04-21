# EweserDB — AI Agent Instructions

> ⚠️ **REQUIRED READING** before any work in this repo.

## Project Overview

EweserDB is a local-first, user-owned database SDK built on Yjs CRDTs. Users own their data; apps interoperate over shared schemas.

- See [ARCHITECTURE.md](ARCHITECTURE.md) for full system design.
- See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for dev environment setup.
- See [README.md](README.md) for project philosophy and API overview.

## Hard Stops

- **Never** commit secrets, API keys, or `.env` files
- **Never** push directly to `main` — always use PRs
- **Never** modify published package APIs without a changeset (`npm run changeset`)
- **Never** delete database migrations — only add new ones

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

1. **Monorepo awareness** — npm workspaces monorepo. Changes in `packages/shared` affect all consumers. Run `npm run build` from root to verify.
2. **Type safety** — All packages use TypeScript. No `any` unless absolutely necessary.
3. **Changesets** — Any change to a published package (`@eweser/db`, `@eweser/shared`, `@eweser/examples-components`) needs a changeset: `npm run changeset`.
4. **Tests** — Run `npm test` before committing. E2E tests via `npm run test:e2e`.
5. **Yjs patterns** — Use CRDT operations (`Y.Map.set`, `Y.Array.push`), never direct mutation. Wrap multi-step changes in `yDoc.transact(() => { ... })`.
6. **Library Versions** — Always use the latest stable versions. Unify versions across workspace packages to prevent duplicate bundles.

## Package Relationships

```
@eweser/shared          ← types, schemas (no deps)
    ↑
@eweser/db              ← core SDK (depends on shared, yjs)
    ↑
@eweser/examples-components  ← UI components (depends on db)
    ↑
example-basic / ewe-note     ← apps (depend on db, components)

auth-server-hono        ← independent (Hono, better-auth, Drizzle, PostgreSQL)
```

## Key Locations

| Location                            | Purpose                                    |
| ----------------------------------- | ------------------------------------------ |
| `packages/db/src/`                  | Core SDK — rooms, documents, sync          |
| `packages/shared/src/`              | Shared types & schemas (no runtime deps)   |
| `packages/auth-server-hono/`        | Auth server (Hono + better-auth + Drizzle) |
| `packages/ewe-note/src/`            | Note-taking app                            |
| `packages/sync-server/src/`         | Hocuspocus sync server                     |
| `packages/examples-components/src/` | Shared UI components                       |
| `examples/example-basic/src/`       | Demo app                                   |
| `packages/mcp-server/src/`          | MCP server for AI agent access             |
| `docs/ai/plans/`                    | Implementation plans                       |
| `e2e/cypress/tests/`                | E2E test suite                             |

## Common Commands

```bash
npm install              # Install all workspace deps
npm run dev              # Start all dev servers
npm run build            # Build all packages
npm test                 # Run all tests
npm run test:e2e         # Cypress E2E tests
npm run changeset        # Create a changeset for publishing
npm run release          # Publish changed packages to npm
docker compose -f docker-compose.dev.yml up   # Start backend services
```

## Agent Workflow (Plan → Code → QA)

This repo uses a three-phase workflow:

1. **eweser-planner** — Research, ask questions, produce a scoped plan saved in `docs/ai/plans/`
2. **eweser-coder** — Implement the approved plan with tests, one run at a time
3. **eweser-qa** — Run tests, review code, verify quality; hand off to create-pr

### Plan File Format (`docs/ai/plans/YYYY-MM-DD-<slug>.md`)

```markdown
## Goal

## Scope (In / Out)

## Runs

### Run N: <Title>

- Recommended Agent: coder (strong/fast)
- Steps / Files / Tests

## Execution Summary (table with parallelization)
```

## Yjs / CRDT Patterns

```typescript
// Read
const docs = room.getDocuments();
docs.get(id); // single doc
docs.getUndeleted(); // non-deleted array

// Write — always through CRDT helpers
docs.new({ text: 'hello' }); // create
docs.set(doc); // update
docs.delete(id, ttlMs); // soft delete

// Never direct mutation of Y.Map entries
// Wrap multi-step writes:
yDoc.transact(() => {
  yMap.set('a', 1);
  yMap.set('b', 2);
});
```

## \_ref Format (Cross-Document References)

```
${authServer}|${collectionKey}|${roomId}|${documentId}
// e.g.: https://www.eweser.com|notes|room-uuid-123|doc-uuid-456
```

Use `buildRef()` from `@eweser/shared` to construct refs.

## Session Memory

At the end of every session, save a summary using the eweser MCP tool:

```
eweser_save_memory({ title: "Session: ...", summary: "...", memoryType: "session" })
```
