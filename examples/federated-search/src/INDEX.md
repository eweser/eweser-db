# Federated Search Example Source

## Plain English

This source root contains a minimal Hono server that acts as a trusted peer in
the federated search demo, receiving and responding to search fan-out requests.

## Owns

- Hono server bootstrap and route registration.
- Federated search demo handler returning mock results.

## Start Here

- [`server.ts`](./server.ts): Hono app creation and server start.

## Children

- [`server.ts`](./server.ts): Federated search peer server.

## Key Contracts

- The `GET /federation/search` route must accept signed headers from the
  aggregator.
- Response format must match the FederatedSearchResult contract in
  `@eweser/aggregator`.

## Update Triggers

- Update when the server bootstrap, route paths, or federated search response
  shape change.

## Testing

- `npm run dev --workspace federated-search-example`: Starts the server locally.
- `npm run type-check --workspace federated-search-example`: Validates types.
