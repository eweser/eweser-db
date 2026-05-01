# DB Source

## Plain English

This source root contains the EweserDB client SDK: the `Database` class,
`Room` class, typed collections, connection methods, Yjs document helpers, and
tests.

## Owns

- Client-side room and document lifecycle.
- Local IndexedDB persistence and optional remote sync setup.
- SDK type exports and collection-to-document typing.

## Start Here

- [`index.ts`](./index.ts): Public SDK entry point and `Database` class.
- [`room.ts`](./room.ts): Room state, providers, and connection lifecycle.
- [`types.ts`](./types.ts): SDK collection and provider types.
- [`utils/getDocuments.ts`](./utils/getDocuments.ts): Yjs-backed document CRUD
  helpers.
- [`methods/newRoom.ts`](./methods/newRoom.ts): Room creation logic.

## Children

- [`examples/`](./examples/): SDK example shapes.
- [`methods/`](./methods/): Database method implementations, including
  connection helpers.
- [`utils/`](./utils/): Yjs, localStorage, and document helper utilities.

## Key Contracts

- `getDocuments()` is the main CRUD surface over Yjs-backed room documents.
- Multi-step Yjs writes should be transactional where needed.
- Remote sync is optional; offline-first behavior is the default.

## Update Triggers

- Update when SDK public exports, room loading, document helper behavior, Yjs
  usage, provider setup, or SDK tests change.

## Testing

- `npm test --workspace @eweser/db`: Runs SDK tests.
- `npm run type-check --workspace @eweser/db`: Type-checks SDK source.
