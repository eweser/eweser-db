# Core SDK — Agent Instructions

Applies to: `packages/db/` and `packages/shared/`

## Yjs Patterns

- Use CRDT operations: `yMap.set(key, value)`, `yArray.push([item])`, `yText.insert(pos, text)`
- **Never** directly mutate Yjs-observed objects
- Wrap multi-step changes in `yDoc.transact(() => { ... })` for atomicity
- Subscribe to changes via `yMap.observe()`, `yArray.observe()`

## @eweser/shared

- Contains all shared types and schemas — **no runtime dependencies**
- Changes here affect every downstream package
- Always rebuild after changes: `cd packages/shared && npm run build`
- Run root build to verify: `npm run build` from repo root

## @eweser/db

- Core SDK — manages rooms, documents, sync, and local persistence
- Uses `y-indexeddb` for local storage, `@hocuspocus/provider` for remote sync
- Test with `fake-indexeddb` and `jsdom` environment
- Any public API changes require a changeset: `npm run changeset`

## Testing

- Framework: Vitest
- Run: `cd packages/db && npm test` or `npm test` from root
- Use `fake-indexeddb` — import at top of test files: `import 'fake-indexeddb/auto'`
- Use `jsdom` environment for DOM-dependent tests
- Test actual Yjs operations with real `Y.Doc` instances — do not mock Yjs

## Type Safety

- Strict TypeScript — no `any` types
- Export types from `@eweser/shared`, import in `@eweser/db`
- Use generics for collection-typed operations

## CollectionKeys

```typescript
type CollectionKey = 'notes' | 'flashcards' | 'profiles' | 'agentConfigs' | 'agentAccessLogs' | 'conversations'
```

## _ref Format

`${authServer}|${collectionKey}|${roomId}|${documentId}`
Use `buildRef()` from `@eweser/shared`.
