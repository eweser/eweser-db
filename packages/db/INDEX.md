# @eweser/db

## Plain English

This package is the browser SDK for local-first EweserDB rooms, documents,
IndexedDB persistence, and optional Hocuspocus sync.

## Owns

- The public `Database` and `Room` client APIs.
- Yjs document helpers and room lifecycle behavior.
- Local persistence and auth/sync connection helpers.

## Start Here

- [`AGENTS.md`](./AGENTS.md): SDK and shared package rules.
- [`GLOSSARY.md`](./GLOSSARY.md): SDK room/document glossary.
- [`README.md`](./README.md): SDK philosophy and usage examples.
- [`package.json`](./package.json): Workspace scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/index.ts`](./src/index.ts): Public SDK entry point and `Database` class.

## Children

- [`src/`](./src/): SDK implementation and tests.

## Key Contracts

- Use Yjs CRDT operations and document helpers; do not directly mutate
  Yjs-observed objects.
- `@eweser/db` depends on `@eweser/shared`; public API changes require a
  changeset.
- Tests use real Yjs docs and fake IndexedDB where relevant.

## Update Triggers

- Update when public SDK exports, room/document behavior, sync/auth connection
  behavior, local persistence, or test scripts change.

## Testing

- `npm test --workspace @eweser/db`: Runs SDK unit tests.
- `npm run type-check --workspace @eweser/db`: Type-checks SDK code.
- `npm run build --workspace @eweser/db`: Builds package output.
