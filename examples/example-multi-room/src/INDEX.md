# Multi Room Source

## Plain English

This source root contains the multi-room notes demo.

## Owns

- Multiple-room UI, selected-room note CRUD, and example config.

## Start Here

- [`App.tsx`](./App.tsx): Main multi-room app.
- [`AppBasic.tsx`](./AppBasic.tsx): Legacy/basic app variant.
- [`config.ts`](./config.ts): Example configuration.
- [`main.tsx`](./main.tsx): Vite React entry point.

## Children

- [`App.tsx`](./App.tsx): Main app component.
- [`AppBasic.tsx`](./AppBasic.tsx): Alternate/basic component.
- [`config.ts`](./config.ts): Config helpers.
- [`main.tsx`](./main.tsx): Browser bootstrap.

## Key Contracts

- Notes are scoped by room and selectors must remain deterministic for Cypress.

## Update Triggers

- Update when room behavior, config, selectors, or tests change.

## Testing

- `npm run build --workspace @eweser/example-multi-room`: Builds the example.
