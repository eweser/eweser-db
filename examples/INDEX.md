# Examples

## Plain English

This folder contains demo apps that teach EweserDB SDK usage, multi-room flows,
cross-app interop, public aggregation, and React Native support.

## Owns

- Runnable examples and deterministic Cypress test surfaces for common SDK
  workflows.
- Demo-specific Vite and React Native app code.

## Start Here

- [`example-basic/INDEX.md`](./example-basic/): Smallest local-first notes app.
- [`example-multi-room/INDEX.md`](./example-multi-room/): Multiple note rooms in
  one app.
- [`example-interop-notes/INDEX.md`](./example-interop-notes/): Notes side of
  cross-app references.
- [`example-interop-flashcards/INDEX.md`](./example-interop-flashcards/):
  Flashcards side of cross-app references.
- [`example-aggregator/INDEX.md`](./example-aggregator/): Public search demo.
- [`react-native/INDEX.md`](./react-native/): React Native example.

## Children

- [`example-basic/`](./example-basic/): Basic CRUD and share-link teaching app.
- [`example-multi-room/`](./example-multi-room/): Room creation and switching.
- [`example-interop-notes/`](./example-interop-notes/): Notes creating linked
  flashcards.
- [`example-interop-flashcards/`](./example-interop-flashcards/): Flashcards
  resolving linked notes.
- [`example-aggregator/`](./example-aggregator/): Aggregator search flows.
- [`react-native/`](./react-native/): Mobile SDK integration surface.

## Key Contracts

- Examples are local-first and should keep working without network access where
  the scenario allows.
- Deterministic `data-cy` selectors documented in example READMEs are Cypress
  test contracts.
- Examples consume package APIs rather than reaching into package internals.

## Update Triggers

- Update when examples are added, removed, renamed, or their teaching objective,
  selector contract, key scripts, or SDK usage changes.

## Testing

- `npm run build-examples`: Builds Vite examples.
- `npm run test:e2e`: Runs the smoke E2E workflow.
- `npm run code-index:check`: Validates example indexes.
