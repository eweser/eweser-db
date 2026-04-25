# Quality Gates Matrix - EweserDB Monorepo

## Overview

The current quality bar for the repo is the root `npm run check` command:

```bash
npm run check
```

That command runs lint, format check, type-check, and unit tests across the active workspaces. Browser workflows are validated separately with Cypress.

## Gate Definitions

| Gate         | Command                | Scope                     | Purpose                                       |
| ------------ | ---------------------- | ------------------------- | --------------------------------------------- |
| Lint         | `npm run lint`         | All workspaces            | Catch bugs, style issues, and unsafe patterns |
| Format check | `npm run format:check` | All source files          | Ensure Prettier consistency                   |
| Type-check   | `npm run type-check`   | All TypeScript workspaces | Catch static typing regressions               |
| Unit tests   | `npm run test`         | Workspace test suites     | Validate package logic                        |
| E2E tests    | `npm run test:e2e`     | Browser workflows         | Validate auth, sync, and example flows        |

## Active Workspace Matrix

| Workspace                             | Lint | Format     | Type-check | Unit tests | E2E role                 | Notes                                  |
| ------------------------------------- | ---- | ---------- | ---------- | ---------- | ------------------------ | -------------------------------------- |
| `packages/db`                         | Yes  | Root check | Yes        | Yes        | Indirect via examples    | Published package, changesets required |
| `packages/shared`                     | Yes  | Root check | Yes        | Yes        | Indirect via examples    | Published package, changesets required |
| `packages/auth-server-hono`           | Yes  | Root check | Yes        | Yes        | Auth flows               | Current auth API                       |
| `packages/auth-pages`                 | Yes  | Root check | Yes        | Yes        | Auth flows               | Current auth SPA                       |
| `packages/sync-server`                | Yes  | Root check | Yes        | Yes        | Sync backend             | Hocuspocus relay                       |
| `packages/aggregator`                 | Yes  | Root check | Yes        | Yes        | Public-data backend      | Search/indexing service                |
| `packages/examples-components`        | Yes  | Root check | Yes        | Yes        | Example UI support       | Published package, changesets required |
| `packages/ewe-note`                   | Yes  | Root check | Yes        | Yes        | App-level smoke          | Vite SPA / PWA                         |
| `packages/mcp-server`                 | Yes  | Root check | Yes        | Yes        | MCP integration          | Agent access package                   |
| `examples/example-basic`              | Yes  | Root check | Yes        | Yes        | Primary Cypress coverage | Main kitchen-sink demo                 |
| `examples/example-multi-room`         | Yes  | Root check | Yes        | Yes        | Cypress coverage         | Multi-room demo                        |
| `examples/example-interop-notes`      | Yes  | Root check | Yes        | Yes        | Cypress coverage         | Notes-side interop demo                |
| `examples/example-interop-flashcards` | Yes  | Root check | Yes        | Yes        | Cypress coverage         | Flashcards-side interop demo           |
| `examples/example-aggregator`         | Yes  | Root check | Yes        | Yes        | Manual / targeted smoke  | Aggregator demo                        |

## Current Expectations

- `npm run check` should stay green before merge.
- Any change to a published package requires a changeset.
- `npm run test:e2e` should cover the auth API, auth pages, sync server, and the example-basic app.
- Keep `docker-compose.dev.yml` and the workspace scripts in sync with the docs.

## Notes for Maintainers

- `packages/auth-server-hono` is the current auth backend; there is no active Next.js auth-server workspace.
- `packages/auth-pages` and `packages/ewe-note` are frontend apps, so they are built and tested like apps rather than libraries.
- Historical planning docs live in `docs/ai/plans/` and should not be treated as runtime policy unless they are explicitly marked current.
