# Logger Source

## Plain English

This source root contains the shared logger entry point and telemetry setup.

## Owns

- Logger factory exports.
- Telemetry initialization behavior used by services.

## Start Here

- [`index.ts`](./index.ts): Public logger exports.
- [`telemetry.ts`](./telemetry.ts): Telemetry setup.

## Children

- [`index.ts`](./index.ts): Logger entry file.
- [`telemetry.ts`](./telemetry.ts): Telemetry implementation.

## Key Contracts

- Logger output should be structured enough for service logs.
- Secret-bearing values must not be intentionally logged.

## Update Triggers

- Update when logger exports, telemetry setup, or service logging contracts
  change.

## Testing

- `npm run type-check --workspace @eweser/logger`: Type-checks source.
