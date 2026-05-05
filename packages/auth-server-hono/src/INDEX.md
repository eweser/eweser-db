# Auth Server Source

## Plain English

This source root contains the Hono app, auth setup, route modules, middleware,
Drizzle models, and service helpers for the auth API.

## Owns

- Runtime route composition and auth boundaries.
- User/session, room grant, OAuth, MCP, and agent-token behavior.
- Drizzle model access and auth/security service helpers.

## Start Here

- [`index.ts`](./index.ts): Hono app entry point and route mounting.
- [`auth.ts`](./auth.ts): better-auth configuration.
- [`routes/access-grant.ts`](./routes/access-grant.ts): Room registry sync,
  invite, update, and sync-token routes.
- [`routes/agents.ts`](./routes/agents.ts): Agent token API.
- [`routes/connect-ai.ts`](./routes/connect-ai.ts): Signed-in AI connector API.
- [`routes/files.ts`](./routes/files.ts): S3-compatible attachment
  upload/presign/download routes with room access checks.
- [`routes/mcp.ts`](./routes/mcp.ts): Remote HTTP MCP endpoint.
- [`lib/storage.ts`](./lib/storage.ts): S3-compatible object storage adapter
  used by attachment routes.
- [`services/sync-token.ts`](./services/sync-token.ts): Sync token issuance.

## Children

- [`db/`](./db/): Drizzle connection and migration runner.
- [`middleware/`](./middleware/): Session, JWT, OAuth, agent, rate-limit, and
  hardening middleware.
- [`model/`](./model/): Database access helpers.
- [`routes/`](./routes/): Hono route modules.
- [`services/`](./services/): Route-adjacent domain helpers.

## Key Contracts

- Route modules enforce auth and input validation at the boundary.
- Room access grants remain explicit and auditable.
- Sync tokens are signed for the sync server and scoped to rooms.
- Remote MCP accepts OAuth bearer tokens and legacy agent bearer tokens.
- Attachment routes must keep provider credentials in env/secret storage and
  only expose non-secret object metadata in synced documents.

## Update Triggers

- Update when routes, middleware, model/service boundaries, token semantics,
  OAuth/MCP behavior, or auth tests change.

## Testing

- `npm test --workspace @eweser/auth-server-hono`: Runs route and middleware
  tests.
- `npm run type-check --workspace @eweser/auth-server-hono`: Type-checks auth
  server code.
