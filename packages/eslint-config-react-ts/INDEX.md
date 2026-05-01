# @eweser/eslint-config-react-ts

## Plain English

This package holds the shared React TypeScript ESLint configuration workspace.

## Owns

- Shared lint configuration for React TypeScript packages.

## Start Here

- [`package.json`](./package.json): Package metadata.

## Children

- [`package.json`](./package.json): Workspace metadata and config entry points.

## Key Contracts

- Changes can affect lint behavior across React workspaces that consume this
  config.

## Update Triggers

- Update when shared React lint rules, exports, package metadata, or consumers
  change.

## Testing

- `npm run lint`: Runs root lint with shared config consumers.
