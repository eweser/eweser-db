# Shared Source

## Plain English

This source root contains shared collection schemas, document types, API request
and response types, and pure utility helpers.

## Owns

- Collection/document type definitions consumed across packages.
- API contracts for auth, room invites, sync tokens, and registry sync.
- Shared pure helpers such as refs and Markdown conversion.

## Start Here

- [`index.ts`](./index.ts): Public shared package entry point.
- [`collections/index.ts`](./collections/index.ts): Collection keys and
  document union contracts.
- [`collections/note.ts`](./collections/note.ts): Note schema.
- [`collections/file-attachment.ts`](./collections/file-attachment.ts):
  Attachment metadata schema for local and future remote file sync.
- [`collections/agent-config.ts`](./collections/agent-config.ts): Agent config
  and access log schemas.
- [`api/index.ts`](./api/index.ts): API contract exports.
- [`utils/index.ts`](./utils/index.ts): Utility exports.

## Children

- [`api/`](./api/): Auth and sync API payload types.
- [`collections/`](./collections/): Shared document and collection schemas.
- [`utils/`](./utils/): Pure helper functions.

## Key Contracts

- `COLLECTION_KEYS` defines interoperable collection names.
- `_ref` values must be built with shared helpers and use the documented
  auth-server, collection, room, and document format.
- Keep this package dependency-free.

## Update Triggers

- Update when collection schemas, API payloads, ref helpers, exported types, or
  shared utilities change.

## Testing

- `npm test --workspace @eweser/shared`: Runs shared package tests.
- `npm run type-check --workspace @eweser/shared`: Type-checks source.
