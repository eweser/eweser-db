# Ewe Note Source

## Plain English

This source root contains the Ewe Notes React app, BlockNote editor surfaces,
room hooks, Obsidian/vault CLI import-export code, theme/UI components, and PWA
helpers.

## Owns

- Note app composition and route shell.
- Notes room CRUD hooks over `@eweser/db`.
- Editor extensions and Obsidian-compatible import/export utilities.

## Start Here

- [`App.tsx`](./App.tsx): Top-level provider and load gate.
- [`app/App.tsx`](./app/App.tsx): Redesigned app shell.
- [`notes-room.tsx`](./notes-room.tsx): React hook for note room state and CRUD.
- [`components/editor.tsx`](./components/editor.tsx): BlockNote editor wrapper.
- [`cli/import-vault.ts`](./cli/import-vault.ts): Vault import entry point.
- [`cli/export-vault.ts`](./cli/export-vault.ts): Vault export entry point.

## Children

- [`app/`](./app/): App shell and routes.
- [`cli/`](./cli/): Vault import/export and sync CLI code.
- [`components/`](./components/): App UI and editor components.
- [`extensions/`](./extensions/): BlockNote and Markdown extensions.
- [`hooks/`](./hooks/): React hooks.
- [`imports/`](./imports/): Static imported image assets.
- [`lib/`](./lib/): UI primitives, icons, themes, and utilities.
- [`utils/`](./utils/): Attachment resolver and utility exports.

## Key Contracts

- UI reads and writes notes through `useNotesRoom()` and `@eweser/db`
  document helpers.
- Import/export code is user-data sensitive and should avoid lossy transforms.
- App loading waits until a selected room, note, and Yjs document are ready.

## Update Triggers

- Update when route layout, room hooks, editor extensions, import/export flows,
  PWA behavior, or E2E selectors change.

## Testing

- `npm test --workspace @eweser/ewe-note`: Runs app and CLI tests.
- `npm run type-check --workspace @eweser/ewe-note`: Type-checks app source.
