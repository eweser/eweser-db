# Secure Room Source

## Plain English

This source root contains the secure-room E2EE demo app.

## Owns

- Secure room creation, lock/unlock lifecycle, recovery phrase display, key export/import, and unavailable state UI.
- Deterministic selectors used by secure-room Cypress specs.

## Start Here

- [`App.tsx`](./App.tsx): Main secure-room demo app.
- [`config.ts`](./config.ts): Example configuration.
- [`main.tsx`](./main.tsx): Vite React entry point.

## Children

- [`App.tsx`](./App.tsx): Main app component.
- [`config.ts`](./config.ts): Config helpers.
- [`main.tsx`](./main.tsx): Browser bootstrap.

## Key Contracts

- Encrypted rooms show a locked/unlocked badge and toggle.
- Locked rooms display an encrypted placeholder instead of note content.
- Recovery phrase is shown once on creation; key export/import is available when unlocked.
- `data-cy` selectors prefixed with `secure-room-` are E2E test contracts.

## Update Triggers

- Update when encryption lifecycle, selectors, config, or tests change.

## Testing

- `npm run build --workspace @eweser/example-secure-room`: Builds the example.
- `e2e/cypress/tests/secure-room.cy.ts`: Cypress E2E spec.
