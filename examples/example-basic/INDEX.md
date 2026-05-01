# @eweser/example-basic

## Plain English

This example is the smallest local-first notes app using `@eweser/db` with one
default room.

## Owns

- Note create/edit/delete teaching flow.
- Room rename and share-link demo behavior.
- Deterministic selectors used by basic Cypress specs.

## Start Here

- [`README.md`](./README.md): Teaching objective and selector contract.
- [`package.json`](./package.json): Example scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/AppBasic.tsx`](./src/AppBasic.tsx): Main example component.

## Children

- [`src/`](./src/): React example source.

## Key Contracts

- `data-cy` selectors documented in the README are E2E contracts.
- The example should demonstrate public SDK usage, not internals.

## Update Triggers

- Update when the teaching objective, selectors, SDK usage, or scripts change.

## Testing

- `npm run build --workspace @eweser/example-basic`: Builds the example.
- `npm run test:e2e`: Runs smoke tests including basic flows.
