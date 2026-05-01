# E2E

## Plain English

This folder contains Cypress end-to-end tests and support files for core SDK,
auth, sync, example, and Ewe Note workflows.

## Owns

- Browser-level regression coverage for user-visible flows.
- Cypress support commands and selector usage for examples and apps.

## Start Here

- [`cypress/tests/`](./cypress/tests/): E2E specs by workflow.
- [`cypress/support/`](./cypress/support/): Cypress commands and setup.
- [`../scripts/run-e2e-smoke.mjs`](../scripts/run-e2e-smoke.mjs): Root smoke
  runner used by `npm run test:e2e`.

## Children

- [`cypress/`](./cypress/): Cypress specs, support files, and generated
  screenshots.

## Key Contracts

- Specs depend on deterministic `data-cy` selectors from examples and apps.
- Auth and sync smoke tests require the local Docker backend stack started by
  the smoke runner.

## Update Triggers

- Update when E2E folder layout, support commands, smoke runner behavior,
  deterministic selectors, or Cypress commands change.

## Testing

- `npm run test:e2e`: Runs smoke E2E tests.
- `npm run test:e2e:full`: Runs the full Cypress suite.
