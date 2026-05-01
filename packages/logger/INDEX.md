# @eweser/logger

## Plain English

This package provides shared logging and telemetry setup used by EweserDB
services.

## Owns

- Logger creation helpers and telemetry initialization.

## Start Here

- [`package.json`](./package.json): Workspace scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/index.ts`](./src/index.ts): Logger public entry point.

## Children

- [`src/`](./src/): Logger and telemetry source.

## Key Contracts

- Services import logger helpers from this package rather than duplicating
  telemetry setup.
- Logging must avoid leaking secrets or credential-bearing payloads.

## Update Triggers

- Update when logger exports, telemetry behavior, dependencies, or service
  integration expectations change.

## Testing

- `npm run type-check --workspace @eweser/logger`: Type-checks logger source.
- `npm run build --workspace @eweser/logger`: Builds package output.
