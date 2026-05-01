# @eweser/example-multi-room

## Plain English

This example shows how one app manages multiple rooms in the same collection.

## Owns

- Room creation, room switching, and room-scoped note CRUD demo behavior.
- Deterministic selectors used by multi-room Cypress specs.

## Start Here

- [`README.md`](./README.md): Teaching objective and selector contract.
- [`package.json`](./package.json): Example scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/App.tsx`](./src/App.tsx): Main multi-room app.

## Children

- [`src/`](./src/): React example source.

## Key Contracts

- Room-specific notes should remain scoped to the selected room.
- `data-cy` selectors documented in the README are E2E contracts.

## Update Triggers

- Update when room creation/switching, selectors, SDK usage, or scripts change.

## Testing

- `npm run build --workspace @eweser/example-multi-room`: Builds the example.
- `npm run test:e2e`: Runs multi-room smoke specs.
