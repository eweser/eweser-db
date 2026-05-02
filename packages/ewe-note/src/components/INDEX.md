# Ewe Note Components

## Plain English

This folder contains the main Ewe Note UI components, including the editor
bridge, layout chrome, sidebar, dialogs, theme controls, and local UI primitives.

## Owns

- The BlockNote editor wrapper used for room-backed note editing.
- Layout, sidebar, search, folder, frontmatter, and theme surfaces.
- Local shadcn-style primitives under `ui/`.

## Start Here

- [`editor.tsx`](./editor.tsx): BlockNote, Yjs collaboration, and save bridge.
- [`layout.tsx`](./layout.tsx): App chrome, topbar, sidebar, and focus layout.
- [`app-sidebar.tsx`](./app-sidebar.tsx): Main navigation and room/note sidebar.
- [`layout-shortcuts.ts`](./layout-shortcuts.ts): Keyboard layout state rules.

## Children

- [`ui/`](./ui/): Local UI primitives used by app components.

## Key Contracts

- Editor writes should flow through `useNotesRoom()` and `@eweser/db` document
  helpers.
- Layout controls must keep mobile and desktop sidebar state coherent.
- UI changes should preserve existing `data-cy` selectors or update E2E tests.

## Update Triggers

- Update when editor integration, layout chrome, sidebar workflows, theme
  controls, UI primitives, or Cypress-facing selectors change.

## Testing

- `npm test --workspace @eweser/ewe-note -- layout-shortcuts`: Runs layout
  shortcut tests.
- `npm test --workspace @eweser/ewe-note`: Runs broader Ewe Note tests.
