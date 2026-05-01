# Interop Flashcards Source

## Plain English

This source root contains the flashcards-side interop demo.

## Owns

- Flashcard room UI, linked note display, reveal-answer flow, and example
  config.

## Start Here

- [`App.tsx`](./App.tsx): Main interop flashcards app.
- [`AppBasic.tsx`](./AppBasic.tsx): Legacy/basic app variant.
- [`config.ts`](./config.ts): Example configuration.
- [`main.tsx`](./main.tsx): Vite React entry point.

## Children

- [`App.tsx`](./App.tsx): Main app component.
- [`AppBasic.tsx`](./AppBasic.tsx): Alternate/basic component.
- [`config.ts`](./config.ts): Config helpers.
- [`main.tsx`](./main.tsx): Browser bootstrap.

## Key Contracts

- `_ref` resolution must stay compatible with shared ref helpers and the notes
  interop example.

## Update Triggers

- Update when flashcard CRUD, linked note display, config, or selectors change.

## Testing

- `npm run build --workspace @eweser/example-interop-flashcards`: Builds the
  example.
