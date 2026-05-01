# @eweser/example-interop-notes

## Plain English

This example demonstrates app-to-app interoperability from the notes side.

## Owns

- Note CRUD in a shared interop room.
- Creation of linked flashcard references.
- Deterministic selectors used by interop Cypress specs.

## Start Here

- [`README.md`](./README.md): Teaching objective and selector contract.
- [`package.json`](./package.json): Example scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/App.tsx`](./src/App.tsx): Main notes interop app.

## Children

- [`src/`](./src/): React example source.

## Key Contracts

- Linked flashcard references use shared `_ref` contracts.
- `data-cy` selectors documented in the README are E2E contracts.

## Update Triggers

- Update when interop behavior, reference creation, selectors, or scripts
  change.

## Testing

- `npm run build --workspace @eweser/example-interop-notes`: Builds the example.
- `npm run test:e2e`: Runs interop smoke specs.
