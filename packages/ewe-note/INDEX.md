# @eweser/ewe-note

## Plain English

This package is the offline-first Ewe Notes app built with React, Vite,
Tailwind, TipTap, and `@eweser/db`.

## Owns

- Note-taking UI, editor integration, local-first note room behavior, PWA setup,
  and vault import/export CLI helpers.

## Start Here

- [`AGENTS.md`](./AGENTS.md): Frontend/app rules.
- [`README.md`](./README.md): App overview and development setup.
- [`package.json`](./package.json): Workspace scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/App.tsx`](./src/App.tsx): Top-level provider and loading shell.

## Children

- [`src/`](./src/): App, editor, UI, hooks, extensions, and CLI source.
- [`public/`](./public/): Static app assets.
- [`test-fixtures/`](./test-fixtures/): Fixtures for import/export tests.

## Key Contracts

- Note data lives in `@eweser/db` rooms and remains useful offline.
- TipTap/Obsidian import-export behavior must preserve user content.
- Shared example UI changes may require changesets when they affect published
  package APIs.

## Update Triggers

- Update when app routes, note room behavior, editor/import/export behavior,
  PWA behavior, dependencies, or key scripts change.

## Testing

- `npm test --workspace @eweser/ewe-note`: Runs Ewe Note tests.
- `npm run build --workspace @eweser/ewe-note`: Builds the app.
- `npm run test:e2e`: Runs smoke flows that include Ewe Note.
