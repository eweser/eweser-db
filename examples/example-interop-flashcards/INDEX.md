# @eweser/example-interop-flashcards

## Plain English

This example demonstrates app-to-app interoperability from the flashcards side.

## Owns

- Flashcard CRUD in a shared interop room.
- Linked note reference display and reveal-answer behavior.
- Deterministic selectors used by interop Cypress specs.

## Start Here

- [`README.md`](./README.md): Teaching objective and selector contract.
- [`package.json`](./package.json): Example scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/App.tsx`](./src/App.tsx): Main flashcards app.

## Children

- [`src/`](./src/): React example source.

## Key Contracts

- Linked note references use shared `_ref` contracts.
- `data-cy` selectors documented in the README are E2E contracts.

## Update Triggers

- Update when interop behavior, reference handling, selectors, or scripts
  change.

## Testing

- `npm run build --workspace @eweser/example-interop-flashcards`: Builds the
  example.
- `npm run test:e2e`: Runs interop smoke specs.
