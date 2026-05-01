# Cypress Root

## Plain English

This top-level Cypress folder is reserved for Cypress-managed downloads and
global artifacts. Active E2E specs live under `e2e/cypress`.

## Owns

- Cypress-managed downloads and any top-level Cypress artifacts.

## Start Here

- [`../e2e/INDEX.md`](../e2e/): Active E2E navigation map.
- [`../cypress.config.ts`](../cypress.config.ts): Cypress configuration.

## Children

- [`downloads/`](./downloads/): Cypress download artifacts.

## Key Contracts

- Do not place source E2E specs here unless the Cypress config and `e2e` index
  are updated together.

## Update Triggers

- Update if active Cypress specs, support files, or artifact ownership moves
  into this top-level folder.

## Testing

- `npm run test:e2e`: Runs configured Cypress smoke tests.
