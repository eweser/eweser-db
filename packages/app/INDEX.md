# @eweser/app

## Plain English

This package is the authenticated Eweser React SPA for sign-in, account
security, connected apps, access grants, and AI connector setup.

## Owns

- Auth/account user interface at the app shell.
- Client calls to the auth API.
- Connect AI and profile management screens.

## Start Here

- [`README.md`](./README.md): App overview and environment variables.
- [`package.json`](./package.json): Workspace scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/App.tsx`](./src/App.tsx): Main app component.

## Children

- [`src/`](./src/): Vite React SPA implementation and tests.

## Key Contracts

- Auth calls go through `src/lib/api.ts` and better-auth client helpers.
- UI must preserve auth-grant and connected-app flows.
- Environment-driven auth URL configuration lives in `src/lib/config.ts`.

## Update Triggers

- Update when routes/pages, auth API calls, Connect AI behavior, env variables,
  or key scripts change.

## Testing

- `npm test --workspace @eweser/app`: Runs app tests.
- `npm run build --workspace @eweser/app`: Builds the Vite SPA.
- `npm run code-index:check`: Validates index coverage.
