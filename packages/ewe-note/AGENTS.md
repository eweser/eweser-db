# Frontend & Apps — Agent Instructions

Applies to: `packages/ewe-note/`, `packages/examples-components/`, `examples/`

## Stack

- React 18-19, Vite, Tailwind CSS, Radix UI
- BlockNote editor (in ewe-note only)
- `@eweser/db` for all data operations
- `@eweser/examples-components` for shared UI components

## Patterns

- Apps are Vite-powered React SPAs — no SSR
- Handle offline state gracefully — local-first means the app works without network
- Connect to auth server via env var (`VITE_AUTH_SERVER` or similar)
- Use `useDb()` hook from DbProvider for database access

## ewe-note Usage Pattern

```typescript
const { db, selectedRoom, selectedNoteId } = useDb();
const Notes = selectedRoom.getDocuments();

// Create
Notes.new({ text: 'content' });
// Update
Notes.set({ ...note, text: 'updated' });
// Delete
Notes.delete(note._id, ttlMs);
// Listen
Notes.onChange(() => setNotes(Notes.getUndeleted()));
```

## `examples-components` Package

- Shared UI components used across example apps
- Exports ESM + UMD + CSS
- Peer depends on `@eweser/db` and React
- Changes require changeset: `npm run changeset`

## Development

```bash
npm run dev               # from package dir
# or from repo root for all:
npm run dev
```
