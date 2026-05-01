# @eweser/example-aggregator

## Plain English

This example demonstrates public search through the aggregator service.

## Owns

- Demo UI for querying indexed public room data.
- Example-specific configuration for aggregator and sync/auth endpoints.

## Start Here

- [`package.json`](./package.json): Example scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/App.tsx`](./src/App.tsx): Main demo UI.

## Children

- [`src/`](./src/): React example source.

## Key Contracts

- The demo depends on aggregator search API behavior and local service URLs.
- It should consume package APIs rather than package internals.

## Update Triggers

- Update when the teaching goal, aggregator API usage, env configuration,
  selectors, or scripts change.

## Testing

- `npm run build --workspace @eweser/example-aggregator`: Builds the example.
- `npm run dev:aggregator-demo`: Starts the demo stack from the root.
