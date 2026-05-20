# @eweser/auth-server-hono

## Plain English

This package is the Hono + better-auth API for users, sessions, room grants,
sync tokens, OAuth, agent tokens, and remote MCP endpoints.

## Owns

- Auth API runtime and protected route boundaries.
- PostgreSQL auth/grant/OAuth/agent data via Drizzle.
- Sync token issuance and access-grant enforcement.

## Start Here

- [`AGENTS.md`](./AGENTS.md): Package-specific auth and database rules.
- [`GLOSSARY.md`](./GLOSSARY.md): Auth/grant glossary.
- [`README.md`](./README.md): Service overview, routes, and environment
  variables.
- [`package.json`](./package.json): Workspace scripts and DB commands.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/index.ts`](./src/index.ts): Hono app entry point and route mounting.

## Children

- [`src/`](./src/): Auth API implementation.
- [`drizzle/`](./drizzle/): Append-only database migrations.

## Key Contracts

- Validate route inputs before DB operations.
- Use Drizzle query APIs or parameterized SQL; do not interpolate user input.
- Never delete migrations.
- Protected routes must verify sessions, JWTs, OAuth tokens, or agent tokens as
  appropriate.

## Update Triggers

- Update when auth/security behavior, routes, middleware, database models,
  migrations, env variables, or key scripts change.

## Testing

- `npm test --workspace @eweser/auth-server-hono`: Runs auth API tests.
- `npm run type-check --workspace @eweser/auth-server-hono`: Type-checks the
  service.
- `npm run code-index:check`: Validates index and header format.
