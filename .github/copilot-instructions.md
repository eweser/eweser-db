# EweserDB - Copilot Instructions

> Required reading before work in this repo.

## Project Overview

EweserDB is a local-first, user-owned database SDK built on Yjs CRDTs. Users own their data; apps interoperate over shared schemas and room-scoped access grants. See [ARCHITECTURE.md](../ARCHITECTURE.md) for current system design.

## Must-Read Files

1. [ARCHITECTURE.md](../ARCHITECTURE.md) - Current system design and package layout
2. [LOCAL_DEVELOPMENT.md](../LOCAL_DEVELOPMENT.md) - Dev environment setup
3. [README.md](../README.md) - Project philosophy and API overview
4. [AGENTS.md](../AGENTS.md) - Repo-wide agent rules

## Hard Stops

- Never commit secrets, API keys, cookies, tokens, provider dashboard screenshots, or `.env` files.
- Never push directly to `main`. Use a branch and PR.
- Never delete database migrations. Only add new migrations.
- Never modify a published package API without a changeset.

## Current Architecture

The Next.js/Supabase migration is complete. Do not treat old migration plans as current guidance unless they are explicitly marked current.

| Layer               | Current stack                                                       |
| ------------------- | ------------------------------------------------------------------- |
| Core SDK            | TypeScript, Yjs, `y-indexeddb`, `@hocuspocus/provider`              |
| Shared package      | TypeScript types, schemas, and helpers with no runtime dependencies |
| Auth API            | Hono, better-auth, Drizzle ORM, PostgreSQL                          |
| Auth UI / app shell | `@eweser/app`, React SPA built with Vite                            |
| Sync server         | Hocuspocus relay with persistence                                   |
| Aggregator          | Server-side public indexing and search                              |
| Apps                | React 18-19, Vite, Tailwind CSS, Radix UI                           |
| Editor              | BlockNote in `packages/ewe-note`                                    |
| Testing             | Vitest and Cypress                                                  |
| Build               | npm workspaces, Vite, `tsc`                                         |

## Working Rules

1. Monorepo awareness: changes in `packages/shared` affect downstream packages.
2. Type safety: no `any` unless there is a specific documented reason.
3. Changesets: behavior or API changes to `@eweser/db`, `@eweser/shared`, or `@eweser/examples-components` need `npm run changeset`.
4. Tests: run the narrowest relevant tests first, then `npm run check` when changes cross package boundaries.
5. UI-visible changes require browser testing, screenshots, and qualitative
   assessment of those screenshots. Check spacing, alignment, balance, wrapping,
   overflow, density, responsive fit, and whether the UI looks acceptable; a
   screenshot alone is not sufficient evidence.
6. Yjs patterns: use CRDT operations and room/document helpers; never mutate Yjs-observed objects directly.
7. Dependency hygiene: keep versions unified across workspaces where practical.

## Package Relationships

```text
@eweser/shared
    -> @eweser/db
        -> @eweser/examples-components
            -> examples / packages/ewe-note

packages/auth-server-hono is the Hono + better-auth auth API.
packages/app is the auth/account/access-grant React SPA.
packages/sync-server is the Hocuspocus sync relay.
packages/aggregator indexes public room data.
```

## Common Commands

```bash
npm install
npm run dev:docker
npm run dev
npm run build
npm run check
npm test
npm run test:e2e
npm run changeset
```

## Agent Workflow

Before broad exploration, read the nearest `INDEX.md`.
If you are creating, updating, or reviewing index files or source headers,
also read [`docs/ai/code-indexing.md`](../docs/ai/code-indexing.md) and apply
its contract in the same change.

Use [`GLOSSARY-MAP.md`](../GLOSSARY-MAP.md) and the mapped `GLOSSARY.md` files for
canonical EweserDB domain language. Treat those files as glossaries only; plans
belong in `docs/ai/plans/` and architectural decisions belong in ADRs.

Use the three-phase workflow for substantial or ambiguous work:

1. `01-planner` / `planner` - research and write a scoped plan
2. `02-coder` / `coder` - implement the approved plan with tests
3. `03-quality-assurance` / `qa` - run verification and review the branch

For small, clear fixes, implement directly and summarize the verification.

## Session Memory

At the end of a coding session, save a concise session summary with `eweser_save_memory` when the MCP conversations room is available. Never save secrets, `.env` contents, tokens, cookies, JWTs, or credential-bearing terminal output.
