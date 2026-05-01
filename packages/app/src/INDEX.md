# App Source

## Plain English

This source root contains the React app shell, page routing, auth API client,
and UI components for the Eweser authenticated app.

## Owns

- Browser routes and page composition.
- Auth-server API client helpers.
- Profile, connected-apps, Turnstile, and Connect AI UI.

## Start Here

- [`main.tsx`](./main.tsx): Vite browser entry point.
- [`App.tsx`](./App.tsx): Top-level app component.
- [`pages.tsx`](./pages.tsx): Page routing and route-level rendering.
- [`components/connect-ai-page.tsx`](./components/connect-ai-page.tsx): AI
  connector setup UI.
- [`lib/api.ts`](./lib/api.ts): Auth API request helpers.

## Children

- [`components/`](./components/): React UI components and shared app UI.
- [`lib/`](./lib/): API, auth-client, config, and local DB provider helpers.
- [`test/`](./test/): Test setup.

## Key Contracts

- Auth/client URLs must remain configurable through Vite env.
- User-facing security and connected-app flows must stay aligned with auth API
  route contracts.

## Update Triggers

- Update when page structure, route ownership, API client behavior, auth flows,
  or app test commands change.

## Testing

- `npm test --workspace @eweser/app`: Runs app unit tests.
- `npm run type-check --workspace @eweser/app`: Type-checks the SPA.
