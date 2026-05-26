# Ewe Note App Shell

## Plain English

This folder contains the redesigned React Router app shell for Ewe Note,
including page routes, note context, and product-specific app components.

## Owns

- Route-level composition for home, editor, and settings screens.
- Redesigned app components that sit above the shared legacy component layer.
- Notes context state used by the redesigned pages.

## Start Here

- [`App.tsx`](./App.tsx): Provider and router root.
- [`routes.tsx`](./routes.tsx): Browser route table.
- [`contexts/NotesContext.tsx`](./contexts/NotesContext.tsx): Redesigned notes
  state provider.
- [`pages/EnhancedEditor.tsx`](./pages/EnhancedEditor.tsx): Editor page
  composition.

## Children

- [`components/`](./components/): Redesigned app-specific UI surfaces.
- [`contexts/`](./contexts/): React context providers for redesigned state.
- [`pages/`](./pages/): Route targets for home, editor, and settings.

## Key Contracts

- Route changes must stay aligned with links and navigation commands in the app
  components.
- Browser routes must honor the configured router base so the app works at both
  the local root path and the deployed `/notes` mount point.
- Notes state should preserve local-first behavior through `@eweser/db` and the
  existing room hooks.
- User-visible workflow changes should keep Cypress selectors stable or update
  E2E coverage in the same change.

## Update Triggers

- Update when routes, page ownership, redesigned app state, command palette
  navigation, or user-visible app workflows change.

## Testing

- `npm test --workspace @eweser/ewe-note`: Runs Ewe Note tests.
- `npm run type-check --workspace @eweser/ewe-note`: Type-checks app source.
