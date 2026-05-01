# Sync Server Source

## Plain English

This source root contains the Hocuspocus sync relay entry point.

## Owns

- Hocuspocus server configuration.
- SQLite persistence extension setup.
- JWT token authentication.
- Optional aggregator webhook extension setup.

## Start Here

- [`index.ts`](./index.ts): Complete sync server runtime.

## Children

- [`index.ts`](./index.ts): Hocuspocus server configuration and startup.

## Key Contracts

- Connections without valid sync tokens are rejected.
- Token claims provide room, user, and collection context for sync.
- Plain HTTP health checks rely on Hocuspocus default behavior.

## Update Triggers

- Update when sync authentication, provider extensions, env variables, webhook
  forwarding, or service startup changes.

## Testing

- `npm run type-check --workspace @eweser/sync-server`: Type-checks source.
- `npm run build --workspace @eweser/sync-server`: Builds the service.
