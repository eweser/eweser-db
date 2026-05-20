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
- Auth and sync smoke tests require the local Docker backend stack, but the
  smoke runner does not start Docker. Start or verify `npm run dev:docker`
  first.
- `npm run test:e2e` starts `@eweser/example-basic` on `38110` and
  `@eweser/app` on `38111` unless `CYPRESS_BASE_URL` or
  `AUTH_PAGES_BASE_URL` points at already-running servers.

## Update Triggers

- Update when E2E folder layout, support commands, smoke runner behavior,
  deterministic selectors, or Cypress commands change.

## Testing

- `npm run test:e2e`: Runs smoke E2E tests.
- `npm run test:e2e:full`: Runs the full Cypress suite.

Fast smoke path:

```bash
npm run dev:docker
curl -fsS http://127.0.0.1:38101/health
curl -fsS http://127.0.0.1:38190/health
npm run test:e2e
```

If the example app is already listening on `38110`, avoid a strict-port failure
by reusing it:

```bash
CYPRESS_BASE_URL=http://127.0.0.1:38110 npm run test:e2e
```
