# @eweser/sync-server

## Plain English

This package is the Hocuspocus WebSocket relay for Yjs synchronization with
token authentication and SQLite persistence.

## Owns

- WebSocket sync server startup.
- Sync token authentication.
- SQLite-backed Yjs document persistence.
- Optional webhook forwarding to the aggregator.

## Start Here

- [`README.md`](./README.md): Service overview and authentication flow.
- [`CONTEXT.md`](./CONTEXT.md): Sync relay glossary.
- [`package.json`](./package.json): Workspace scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/index.ts`](./src/index.ts): Hocuspocus server configuration.

## Children

- [`src/`](./src/): Sync server runtime entry point.

## Key Contracts

- JWT sync tokens are verified with `SYNC_AUTH_SECRET`.
- The authenticated token room ID scopes the Hocuspocus connection.
- Webhook forwarding must preserve the aggregator contract when enabled.

## Update Triggers

- Update when authentication, persistence, webhook behavior, environment
  variables, Docker behavior, or scripts change.

## Testing

- `npm test --workspace @eweser/sync-server`: Runs sync-server tests when
  present.
- `npm run build --workspace @eweser/sync-server`: Builds the service.
