# Examples Components Source

## Plain English

This source root contains shared React UI components and styles for example
apps.

## Owns

- Eweser icon, login button, status bar, component helpers, and shared CSS.

## Start Here

- [`components/index.ts`](./components/index.ts): Public component exports.
- [`components/LoginButton.tsx`](./components/LoginButton.tsx): Auth/login UI.
- [`components/StatusBar.tsx`](./components/StatusBar.tsx): Connection/status
  UI.
- [`components/styles.ts`](./components/styles.ts): Shared inline style
  helpers.

## Children

- [`components/`](./components/): Shared UI components and helpers.

## Key Contracts

- Exported components are part of the example components public API.
- Keep styling compatible with the example apps that consume this package.

## Update Triggers

- Update when component exports, component responsibilities, styling contracts,
  or tests change.

## Testing

- `npm run type-check --workspace @eweser/examples-components`: Type-checks
  source.
- `npm run build --workspace @eweser/examples-components`: Builds package
  output.
