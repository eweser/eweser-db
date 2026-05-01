# Example Basic Source

## Plain English

This source root contains the Vite React code for the single-room notes demo.

## Owns

- Basic note CRUD UI and auth/share demo configuration.

## Start Here

- [`AppBasic.tsx`](./AppBasic.tsx): Main single-room notes component.
- [`config.ts`](./config.ts): Example configuration.
- [`main.tsx`](./main.tsx): Vite React entry point.

## Children

- [`AppBasic.tsx`](./AppBasic.tsx): Main app component.
- [`config.ts`](./config.ts): Config helpers.
- [`main.tsx`](./main.tsx): Browser bootstrap.

## Key Contracts

- Keep README selector contracts stable or update E2E tests together.

## Update Triggers

- Update when CRUD behavior, share-link behavior, config, or selectors change.

## Testing

- `npm run test --workspace @eweser/example-basic`: Runs example tests when
  present.
- `npm run build --workspace @eweser/example-basic`: Builds the example.
