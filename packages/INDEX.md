# Packages

## Plain English

This folder contains all npm workspace packages for the SDK, shared contracts,
services, apps, logger, and development-only lint configs.

## Owns

- Package-level ownership and dependency orientation for EweserDB workspaces.
- Navigation from package names to source roots and package-specific policy.

## Start Here

- [`shared/INDEX.md`](./shared/): Shared types, schemas, API payloads, and pure
  helpers.
- [`db/INDEX.md`](./db/): Browser SDK for rooms, documents, local persistence,
  and sync.
- [`examples-components/INDEX.md`](./examples-components/): Shared React UI for
  examples.
- [`auth-server-hono/INDEX.md`](./auth-server-hono/): Auth API, room grants,
  OAuth, and agent-token backend.
- [`app/INDEX.md`](./app/): Auth/account/access-grant React SPA.
- [`sync-server/INDEX.md`](./sync-server/): Hocuspocus relay and persistence.
- [`aggregator/INDEX.md`](./aggregator/): Public indexing and search service.
- [`mcp-server/INDEX.md`](./mcp-server/): Local stdio MCP server package.

## Children

- [`shared/`](./shared/): Foundation types and schemas consumed by all packages.
- [`db/`](./db/): Core SDK consumed by UI packages and examples.
- [`examples-components/`](./examples-components/): UI layer consumed by
  examples and Ewe Note.
- [`auth-server-hono/`](./auth-server-hono/): Hono + better-auth auth API.
- [`app/`](./app/): Auth and account web app.
- [`sync-server/`](./sync-server/): Sync relay.
- [`aggregator/`](./aggregator/): Search/indexing service.
- [`mcp-server/`](./mcp-server/): Agent data access over MCP.
- [`ewe-note/`](./ewe-note/): BlockNote note-taking app.
- [`landing/`](./landing/): Marketing/landing web app.
- [`logger/`](./logger/): Shared logger and telemetry setup.
- [`eslint-config-ts/`](./eslint-config-ts/): Shared TypeScript ESLint config.
- [`eslint-config-react-ts/`](./eslint-config-react-ts/): Shared React ESLint
  config.

## Key Contracts

- Dependency chain: `@eweser/shared -> @eweser/db ->
@eweser/examples-components -> examples / packages/ewe-note`.
- `packages/auth-server-hono`, `packages/sync-server`, `packages/aggregator`,
  and `packages/mcp-server` are service packages with explicit auth and runtime
  boundaries.
- Keep dependency versions unified across workspaces when practical.

## Update Triggers

- Update when packages are added, removed, renamed, repurposed, or their public
  entry points and key scripts change.
- Update when package dependency relationships or published package status
  changes.

## Testing

- `npm run type-check --workspaces --if-present`: Type-checks workspaces.
- `npm run test:unit:workspaces`: Runs workspace unit tests.
- `npm run code-index:check`: Validates package and source indexes.
