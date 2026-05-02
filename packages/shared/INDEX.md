# @eweser/shared

## Plain English

This package contains shared TypeScript types, collection schemas, API payload
types, and pure helpers for the EweserDB ecosystem.

## Owns

- Cross-package data contracts for collections, rooms, documents, and API
  payloads.
- Pure utilities shared by SDK, services, apps, and examples.

## Start Here

- [`../db/AGENTS.md`](../db/AGENTS.md): Shared package rules live with SDK
  rules.
- [`README.md`](./README.md): Package overview and design principles.
- [`package.json`](./package.json): Workspace scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/index.ts`](./src/index.ts): Public package entry point.

## Children

- [`src/`](./src/): Shared types, schemas, API contracts, and utilities.

## Key Contracts

- No runtime dependencies.
- Changes affect all downstream consumers.
- Public API changes require a changeset.

## Update Triggers

- Update when collection keys, document schemas, API payload contracts, utility
  exports, package dependencies, or test scripts change.

## Testing

- `npm test --workspace @eweser/shared`: Runs shared package tests.
- `npm run build --workspace @eweser/shared`: Builds shared package output.
- `npm run type-check --workspace @eweser/shared`: Type-checks source.
