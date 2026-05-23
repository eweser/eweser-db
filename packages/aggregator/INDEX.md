# @eweser/aggregator

## Plain English

This package is the server-side indexing and search service for public EweserDB
room data.

## Owns

- Hocuspocus webhook ingestion for public/shared documents.
- PostgreSQL indexing queries and public search HTTP routes.
- Development token route used by aggregator demos.

## Start Here

- [`README.md`](./README.md): Service overview, environment variables, and API.
- [`GLOSSARY.md`](./GLOSSARY.md): Public aggregation glossary.
- [`package.json`](./package.json): Workspace scripts and dependencies.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/index.ts`](./src/index.ts): Hono app entry point and route wiring.

## Children

- [`src/`](./src/): Runtime service implementation and tests.

## Key Contracts

- Webhook writes must validate the configured webhook secret when present.
- Search routes must not expose private room data outside indexed public data.
- Database access goes through the local DB helpers under `src/db`.

## Update Triggers

- Update when aggregator routes, webhook payload handling, database schema,
  environment variables, Docker behavior, or key scripts change.

## Testing

- `npm test --workspace @eweser/aggregator`: Runs aggregator unit tests.
- `npm run build --workspace @eweser/aggregator`: Builds the service.
- `npm run code-index:check`: Validates index links and headings.
