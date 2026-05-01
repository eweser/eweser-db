# Interop Notes Source

## Plain English

This source root contains the notes-side interop demo.

## Owns

- Shared-room note CRUD, linked flashcard creation, linked metadata display, and
  example config.

## Start Here

- [`App.tsx`](./App.tsx): Main interop notes app.
- [`AppBasic.tsx`](./AppBasic.tsx): Legacy/basic app variant.
- [`config.ts`](./config.ts): Example configuration.
- [`main.tsx`](./main.tsx): Vite React entry point.

## Children

- [`App.tsx`](./App.tsx): Main app component.
- [`AppBasic.tsx`](./AppBasic.tsx): Alternate/basic component.
- [`config.ts`](./config.ts): Config helpers.
- [`main.tsx`](./main.tsx): Browser bootstrap.

## Key Contracts

- `_ref` construction must use shared helpers and remain compatible with the
  flashcards interop example.

## Update Triggers

- Update when note CRUD, flashcard linking, config, or selectors change.

## Testing

- `npm run build --workspace @eweser/example-interop-notes`: Builds the example.
