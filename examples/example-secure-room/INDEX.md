# @eweser/example-secure-room

## Plain English

This example shows how to create, lock, unlock, and recover E2EE (end-to-end
encrypted) rooms in EweserDB.

## Owns

- Secure room lifecycle demonstration: create, lock, unlock, export/import key
  material, and unavailable states for server-side features.
- Deterministic selectors used by secure-room Cypress specs.

## Start Here

- [`README.md`](./README.md): Teaching objective and selector contract.
- [`package.json`](./package.json): Example scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/App.tsx`](./src/App.tsx): Main secure-room demo app.

## Children

- [`src/`](./src/): React example source.

## Key Contracts

- Creating a secure room generates a BIP39 recovery phrase shown to the user.
- Locked rooms display an encrypted placeholder — content is not readable.
- Unlocking with the recovery phrase or imported key restores content access.
- Key export/import is available when the room is unlocked.
- `data-cy` selectors documented in the README are E2E contracts.

## Update Triggers

- Update when secure-room lifecycle, selectors, SDK encryption API, or scripts change.

## Testing

- `npm run build --workspace @eweser/example-secure-room`: Builds the example.
- `e2e/cypress/tests/secure-room.cy.ts`: Cypress E2E spec.

