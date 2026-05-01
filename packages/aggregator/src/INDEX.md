# Aggregator Source

## Plain English

This source root contains the Hono app, webhook handler, PostgreSQL schema and
queries, and search routes for public document indexing.

## Owns

- Public search API wiring.
- Hocuspocus webhook ingestion and document upserts.
- Indexed document schema management and query helpers.

## Start Here

- [`index.ts`](./index.ts): Service entry point and route composition.
- [`webhook-handler.ts`](./webhook-handler.ts): Hocuspocus webhook validation
  and payload conversion.
- [`db/queries.ts`](./db/queries.ts): Search and room query helpers.
- [`routes/search.ts`](./routes/search.ts): Public search route.
- [`routes/agent-search.ts`](./routes/agent-search.ts): Agent-facing search
  route.

## Children

- [`db/`](./db/): PostgreSQL client, schema, query, and upsert helpers.
- [`routes/`](./routes/): Hono route factories for search and dev-token flows.

## Key Contracts

- `index.ts` exports `app` for tests and starts the server only outside test.
- Webhook payloads are normalized before DB upsert.
- Search behavior depends on indexed PostgreSQL rows, not direct client room
  access.

## Update Triggers

- Update when route files, webhook contracts, DB schema/query behavior, or
  service environment variables change.

## Testing

- `npm test --workspace @eweser/aggregator`: Runs route, webhook, and DB helper
  tests.
- `npm run type-check --workspace @eweser/aggregator`: Type-checks service code.
