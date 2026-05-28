# @eweser/federated-search-example

## Plain English

This example is a standalone Hono HTTP server that demonstrates how a peer can
receive and handle federated search requests from an aggregator.

## Owns

- Federated search request handler demonstrating signed-headers verification.
- Lightweight demo endpoint that returns mock search results for a trusted peer.

## Start Here

- [`package.json`](./package.json): Example scripts and dependencies.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/server.ts`](./src/server.ts): Hono server entry point.

## Children

- [`src/`](./src/): Example source.

## Key Contracts

- Must respond to `GET /federation/search` with the peer search contract.
- Headers verification demo must align with `@eweser/aggregator` request-signing.

## Update Triggers

- Update when the request-signing contract, federated search response shape, or
  example scripts/environment change.

## Testing

- `npm run dev --workspace federated-search-example`: Starts the example server.
- `npm run type-check --workspace federated-search-example`: Type-checks the
  example.
