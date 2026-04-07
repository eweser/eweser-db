# Plan: Rooms Architecture Refactor — Generalized Doc Split

## Goal

Solve ewe-note's rooms/Y.Doc mismatch by splitting the monolithic single-Y.Doc-per-room into a **metadata doc** + **per-document content docs**, generalized across collection types (notes, flashcards, etc.) with a cross-collection reference resolution layer.

## Context: Current Problems

| Problem | Root Cause |
|---------|-----------|
| Room = folder with permissions, but Y.Doc = the entire room → all notes load into memory | One Y.Doc per room, notes stored as Y.Map entries + separate Y.XmlFragments inside the same doc |
| Subdocs would be ideal but Hocuspocus doesn't support them | Hocuspocus v2 "next-major" feature; not available today |
| Debounced markdown save causes glitches | `editor.onChange` → `blocksToOfm()` → `updateNoteTextDebounced()` writes to the same Y.Map that also syncs via Hocuspocus, creating update storms and race conditions between CRDT syncs and debounced snapshots |
| Too many rooms open = haywire | Each open room = 1 Y.Doc + 1 IndexeddbPersistence + 1 HocuspocusProvider; with all notes' XmlFragments in memory, switching between rooms rapidly compounds memory/connection issues |
| 500 XmlFragments in one Y.Doc don't scale | `Y.encodeStateAsUpdate()` encodes ALL fragments; every keystroke's update includes the full doc state vector; initial sync sends everything |
| Flashcards need structured rich-text too | Flashcard `frontText`/`backText` are plain strings now, but users want formatted content + linked notes. Same room/doc split problem applies. |
| Cross-collection references need resolution | Flashcards have `noteRefs[]`, notes have `flashcardRefs[]` — but resolving a ref like `notes\|roomId\|docId` requires loading that room, which may not be connected |

## Solution Architecture: Pattern D (Hybrid Meta + Content Docs)

### New data model (generalized)

```
Room<T> (unchanged conceptually — folder with permissions, typed by collection)
├── Meta Doc:  Y.Doc (name: "room.{roomId}.meta")
│   └── Y.Map("documents"): { [docId]: DocMeta<T> }
│       DocMeta<Note> = { _id, title, tags, aliases, createdAt, updatedAt, _deleted, refs }
│       DocMeta<Flashcard> = { _id, frontPreview, tags, createdAt, updatedAt, _deleted, noteRefs }
│
├── Item Docs (one per document in the room):
│   Note Doc:      Y.Doc (name: "room.{roomId}.doc.{docId}")
│   │ └── Y.XmlFragment("content"):  TipTap editor state (CRDT)
│   │ └── Y.Text("markdown"):        Plain markdown/text snapshot
│   │
│   Flashcard Doc: Y.Doc (name: "room.{roomId}.doc.{docId}")
│     └── Y.XmlFragment("front"):    Rich-text front side
│     └── Y.XmlFragment("back"):     Rich-text back side
│     └── Y.Map("refs"):             { noteRefs: string[], ... }
│
└── HocuspocusProviderWebsocket: shared WebSocket (1 per server)
    ├── HocuspocusProvider: meta doc (always connected while room is open)
    └── HocuspocusProvider: active item doc (connected only while editing)
```

### Cross-collection reference resolution

```
Flashcard in Room A has noteRefs: ["notes|roomB|noteId123"]
                                     ↓
RefResolver.resolve("notes|roomB|noteId123")
  1. Parse ref → { collectionKey: "notes", roomId: "roomB", docId: "noteId123" }
  2. Check: is Room B's meta doc already loaded? → read title/preview from meta
  3. If not loaded: lazy-load ONLY the meta doc for Room B (lightweight, no content)
  4. For deep reads (show linked note content): load the specific item doc on demand
  5. Cache resolved refs in memory (invalidate on meta doc changes)
```

**Key principle:** Resolving a cross-collection ref should NEVER require loading the full room or all its item docs. The meta doc gives you enough for display (title, preview text). The item doc is only loaded if the user navigates into it.

### Key design decisions

1. **Hocuspocus multiplexing** (not subdocs): All providers share one `HocuspocusProviderWebsocket`. This means 1 actual WebSocket per server, regardless of how many item docs are loaded. Works today with Hocuspocus v2.

2. **Markdown/text as `Y.Text` not a `string` field**: Instead of debounce-serializing to a string and writing it to a Y.Map entry (current pattern), store the text snapshot as a `Y.Text` node in the item doc. Updates are CRDT operations — no race condition, no debounce needed for the write itself.

3. **Item lifecycle = doc lifecycle**: Creating an item = creating an item doc + inserting metadata into the meta doc. Deleting = soft-deleting in meta. Opening = connecting the item doc's provider. Closing = disconnecting, freeing memory.

4. **Permissions unchanged**: Hocuspocus `onAuthenticate` validates JWT containing `roomId`. The server hook parses `room.{roomId}.doc.{docId}` names to extract `roomId` and validates access at the room level.

5. **Migration strategy**: Run both patterns during transition. The SDK checks if a room has the old monolithic format and migrates on first load.

6. **Generalized across collection types**: The same `RoomDocManager` pattern works for notes, flashcards, and future types. Each collection type defines which Y.XmlFragments/Y.Text/Y.Map fields go in its item doc. Simple collections (profiles, conversations) can stay on the current monolithic pattern if they don't need per-item rich text editing.

7. **Cross-collection refs are lazy**: A flashcard's `noteRefs` are resolved by loading the target room's meta doc (not the full room). The meta doc is lightweight (~100KB for 500 items) and can be cached. Full item content is only fetched when the user navigates into the linked document.

## Scope

- **In:**
  - Generalized `RoomDocManager` in `@eweser/db` SDK (works for any collection type)
  - Multiplexed Hocuspocus provider management (shared WebSocket singleton)
  - Meta doc + per-item content doc split
  - Y.Text plaintext layer in item docs (notes get markdown, flashcards get front/back text)
  - Cross-collection `RefResolver` for lazy ref lookups
  - Flashcard item doc schema (Y.XmlFragment for front/back rich text)
  - Migration path from current monolithic format
  - Sync server hooks for doc name parsing
  - ewe-note editor wiring to new pattern

- **Out:**
  - Subdoc support (wait for Hocuspocus)
  - Graph view / backlinks index (separate plan, builds on top of this)
  - Flashcard study/review UI (just the data layer — UI is a separate plan)
  - Collections that don't need rich text (profiles, conversations, agentConfigs) stay on current monolithic pattern

## Runs

### Run 0: Spike — validate Hocuspocus multiplexing with per-note docs

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Must confirm the multiplexing pattern works end-to-end before committing to the architecture. Small scope, high-risk validation.

- [ ] Write a minimal test script (outside ewe-note) that:
  1. Creates a `HocuspocusProviderWebsocket` with one URL
  2. Creates 2+ `HocuspocusProvider` instances on the same socket for different doc names
  3. Confirms both sync independently, server persists them, and disconnecting one doesn't affect the other
  4. Measures: connection handshake time, update propagation latency, memory footprint with 10 concurrent providers
- [ ] Test with the existing Hocuspocus sync server in docker-compose
- [ ] Confirm: when a note doc is disconnected and reconnected, it picks up remote changes
- [ ] Document naming convention: `room.{roomId}.meta` and `room.{roomId}.doc.{docId}`
- [ ] Files: `scripts/spike-multiplexed-docs.ts` (throw-away)
- [ ] Tests: Manual verification, console output

### Run 1: SDK — RoomDocManager in `@eweser/db`

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Core SDK architectural change — needs careful Y.Doc lifecycle, provider management, and backward compat.

- [ ] Add `HocuspocusProviderWebsocket` as a shared singleton per server URL (new field on Database class)
- [ ] New class: `RoomDocManager<T extends EweDocument>` (generic over collection type):
  ```ts
  class RoomDocManager<T extends EweDocument> {
    collectionKey: CollectionKey
    roomId: string
    metaDoc: Y.Doc       // document list/titles/tags
    metaProvider: HocuspocusProvider
    activeItemDoc: Y.Doc | null   // currently edited document
    activeItemProvider: HocuspocusProvider | null
    
    openItem(docId: string): ItemDocHandle<T>  // type-specific fragments
    closeItem(): void
    getItemList(): DocMeta<T>[]
    createItem(data: Partial<T>): { docId: string }
    deleteItem(docId: string): void
    updateItemMeta(docId: string, meta: Partial<DocMeta<T>>): void
  }

  // Type-specific item doc handles:
  type NoteDocHandle = {
    content: Y.XmlFragment    // TipTap editor state
    markdown: Y.Text          // plaintext snapshot
    provider: HocuspocusProvider
  }
  type FlashcardDocHandle = {
    front: Y.XmlFragment      // rich-text front
    back: Y.XmlFragment       // rich-text back
    refs: Y.Map               // { noteRefs: string[] }
    provider: HocuspocusProvider
  }
  ```
- [ ] `openItem()` flow:
  1. If another item is open, disconnect its provider
  2. Create new Y.Doc + HocuspocusProvider (using shared WebSocket)
  3. Wait for local sync (IndexeddbPersistence per item doc, keyed `room.{roomId}.doc.{docId}`)
  4. Wait for remote sync (if online)
  5. Return type-specific handle (NoteDocHandle or FlashcardDocHandle based on collectionKey)
- [ ] `closeItem()` flow:
  1. Disconnect HocuspocusProvider
  2. Destroy IndexeddbPersistence
  3. Null out activeItemDoc (GC can free)
- [ ] Meta doc lifecycle:
  - Connected when room is "open" in the UI
  - Disconnected when room is "closed" or during rolling sync cycle
- [ ] **Item doc schema registry** — a config map that tells the manager what Y.* types to create per collection:
  ```ts
  const ITEM_DOC_SCHEMAS: Record<CollectionKey, ItemDocSchema> = {
    notes: { fragments: ['content'], texts: ['markdown'] },
    flashcards: { fragments: ['front', 'back'], maps: ['refs'] },
    // Simple collections don't use RoomDocManager at all
  };
  ```
- [ ] Files:
  - `packages/db/src/room-doc-manager.ts` (new)
  - `packages/db/src/item-doc-schemas.ts` (new — type-specific schemas)
  - `packages/db/src/index.ts` (add shared WebSocket management)
  - `packages/db/src/types.ts` (update types)
- [ ] Tests: Unit tests for RoomDocManager lifecycle (connect/disconnect/create/delete) with both notes and flashcards
- [ ] **Changeset needed** — this changes `@eweser/db` public API

### Run 2: Sync server — doc name parsing + auth

**Recommended Agent:** `02-coder` (Fast)  
**Reason:** Small, focused server-side change — parse doc names and validate room-level permissions.

- [ ] Update `packages/sync-server/src/index.ts` `onAuthenticate`:
  - Parse doc name: `room.{roomId}.meta` or `room.{roomId}.doc.{docId}`
  - Extract `roomId` from the name
  - Validate against JWT's `roomId` claim (existing logic)
  - Allow any `doc.{docId}` under a room the user has access to
  - Collection type doesn't matter at the server level — it's just Y.Doc persistence
- [ ] Consider: `onLoadDocument` — should the server do anything special for meta docs vs item docs? (Probably not — SQLite persistence handles both transparently.)
- [ ] Files:
  - `packages/sync-server/src/index.ts` (update auth hook)
- [ ] Tests: Add test for doc name parsing edge cases

### Run 3: Y.Text markdown layer

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Novel CRDT pattern — Y.Text for markdown snapshots. Needs careful integration with the TipTap editor to avoid feedback loops.

- [ ] In the note item doc, alongside the Y.XmlFragment("content"), add `Y.Text("markdown")`
- [ ] On editor changes (TipTap `onUpdate`):
  1. Serialize editor state to OFM markdown
  2. Diff against current Y.Text("markdown") content
  3. Apply minimal Y.Text operations (delete range + insert) — NOT full replace
  4. This is a **local operation** — remote peers get it via normal Yjs sync
- [ ] **No debounce needed** — Y.Text operations are CRDT-native; they merge cleanly across peers
- [ ] Actually, still debounce the serialization itself (it's CPU-bound, ~50-100ms for large notes) — but the write to Y.Text is instant and conflict-free
- [ ] For non-Yjs consumers (search, export, CLI vault sync): read `itemDoc.getText("markdown").toString()` — always up-to-date, always valid markdown
- [ ] Files:
  - `packages/ewe-note/src/components/editor.tsx` (replace debounced updateNoteText with Y.Text write)
  - `packages/db/src/room-doc-manager.ts` (expose markdownText getter)
- [ ] Tests: Write markdown snapshot, verify it round-trips cleanly; verify two concurrent editors produce a merged markdown

### Run 4: ewe-note wiring — editor + sidebar on new architecture

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Rewiring the entire note loading/editing/switching flow across multiple components.

- [ ] Update `useNotesRoom` hook to use `RoomDocManager<Note>`:
  - `getItemList()` from meta doc → populates sidebar
  - `openItem(id)` when a note is selected → returns fragment for editor
  - `closeItem()` when switching notes or unmounting
- [ ] Update `editor.tsx`:
  - Receive Y.XmlFragment from `openItem()` instead of `doc.getXmlFragment(selectedNoteId)`
  - Provider comes from the item-level HocuspocusProvider (for awareness/cursors)
  - Markdown serialization writes to Y.Text instead of Y.Map entry
- [ ] Update `db.tsx`:
  - Remove direct `room.getDocuments()` calls for notes
  - Use `RoomDocManager` for all note CRUD
- [ ] Note switching UX: when user clicks a different note in the sidebar:
  1. Current note's fragment is detached from Editor
  2. `closeItem()` disconnects the provider
  3. `openItem(newId)` connects the new note
  4. Editor receives new fragment → re-renders
  5. Brief loading indicator in editor pane (not full-screen spinner)
- [ ] Files:
  - `packages/ewe-note/src/notes-room.tsx` (rewrite to use RoomDocManager)
  - `packages/ewe-note/src/components/editor.tsx` (fragment source change)
  - `packages/ewe-note/src/db.tsx` (RoomDocManager integration)
  - `packages/ewe-note/src/components/app-sidebar.tsx` (note list from meta doc)
- [ ] Tests: Open note, switch note, verify no memory leak (previous note doc is freed)

### Run 5: Cross-collection RefResolver

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** New abstraction — must handle lazy loading, caching, and cross-room access patterns without opening excessive connections.

- [ ] New class: `RefResolver` on the Database instance:
  ```ts
  class RefResolver {
    // Parse a _ref string → { authServer, collectionKey, roomId, docId }
    parse(ref: string): ParsedRef
    
    // Get metadata for a referenced doc (loads meta doc if needed)
    resolveMeta(ref: string): Promise<DocMeta | null>
    
    // Get full content (loads item doc on demand, disconnects after read)
    resolveContent(ref: string): Promise<{ markdown?: string, front?: string, back?: string } | null>
    
    // Batch resolve (for flashcard review showing all linked notes)
    resolveMany(refs: string[]): Promise<Map<string, DocMeta>>
    
    // Cache: meta docs stay in memory once loaded for the session
    private metaDocCache: Map<string, Y.Doc>
  }
  ```
- [ ] **Lazy meta doc loading**: When resolving a ref to a room that's not currently open, create a read-only HocuspocusProvider for just the meta doc, sync it, read the entry, then disconnect. Cache the meta doc locally in IndexedDB.
- [ ] **Content reads**: When a flashcard wants to display a linked note's full text, the RefResolver opens the specific item doc, reads the Y.Text("markdown"), and returns it. The item doc provider is disconnected after reading (no long-lived connection for reads).
- [ ] **Permission boundary**: Cross-collection refs may point to rooms the user doesn't have access to. `resolveMeta()` returns `null` (not throws) for inaccessible refs. The UI shows "Link to inaccessible note" gracefully.
- [ ] Files:
  - `packages/db/src/ref-resolver.ts` (new)
  - `packages/db/src/index.ts` (add RefResolver to Database)
  - `packages/shared/src/utils/documents.ts` (ensure `parseRef()` utility exists)
- [ ] Tests: Resolve ref within same room, across rooms, to inaccessible room, batch resolve
- [ ] **Changeset needed** — new public API on Database

### Run 6: Migration — monolithic room doc → meta + item docs

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Data migration with backward compat — must not lose existing users' data.

- [ ] Migration logic in `RoomDocManager.init()`:
  1. Check if the old monolithic Y.Doc has `getMap("documents")` with entries
  2. For each document in the old format:
     a. Create an item doc (`room.{roomId}.doc.{docId}`)
     b. Copy the Y.XmlFragment (if any) from the old doc to the new item doc
     c. For notes: serialize text to Y.Text("markdown")
     d. For flashcards: copy frontText/backText to Y.XmlFragments + Y.Map refs
     e. Insert metadata into the meta doc's Y.Map
  3. Mark the old doc as migrated (set a flag in the meta doc)
  4. Old doc remains readable but is no longer written to
- [ ] Handle: documents created on a peer that hasn't migrated yet (old format arrives via sync → detect and migrate)
- [ ] Files:
  - `packages/db/src/room-doc-manager.ts` (add migration logic)
  - `packages/db/src/utils/migrate-room-to-item-docs.ts` (new)
- [ ] Tests: Create notes + flashcards in old format, migrate, verify all content preserved

## Risks

1. **Hocuspocus multiplexing stability** — This is officially supported but less battle-tested than single-doc usage. Run 0 exists to validate this.

2. **Y.Text markdown drift** — If Y.Text("markdown") and Y.XmlFragment("content") get out of sync (e.g., crash during serialization), the markdown becomes stale. Mitigation: on note open, always re-serialize the XmlFragment to markdown. The Y.Text is a derived artifact, not the source of truth.

3. **Migration complexity** — Copying Y.XmlFragment between Y.Docs is not a standard Yjs operation. May need to `Y.encodeStateAsUpdate(fragment) → Y.applyUpdate(newDoc)` or serialize/reparse the content. Test thoroughly in Run 5.

4. **IndexedDB handle limits** — Each note doc gets its own IndexeddbPersistence, but only the active note's persistence is open at a time. The meta doc's persistence is always open. Browser limit is ~50-100 simultaneous databases — should be fine since we only have 1 active note + 1 meta.

5. **Changeset required** — `@eweser/db` public API changes (new NoteDocManager, modified Room for notes). Needs changeset.

6. **Flashcard rich text migration** — Converting `frontText`/`backText` strings to Y.XmlFragments is a one-way transformation. If a user downgrades to an older SDK version, they'll see the old string values but not the new rich text. Acceptable tradeoff.

7. **Cross-room ref resolution latency** — Lazy-loading a meta doc for a ref in a different room adds ~200-500ms on first access. Mitigation: prefetch meta docs for rooms referenced by the current note/flashcard during idle time.

8. **Simple collections stay simple** — Profiles, conversations, agentConfigs don't need per-item docs. They stay on the current monolithic Y.Doc pattern. The `RoomDocManager` is opt-in per collection type.

## Relationship to TipTap Migration Plan

This plan is **complementary** to [2026-04-06-tiptap-migration.md](2026-04-06-tiptap-migration.md). Their runs interleave:

```
TipTap Plan Run 1: Swap BlockNote → TipTap (editor layer only)
    ↓
Rooms Plan Run 0: Spike multiplexing validation
Rooms Plan Run 1: RoomDocManager in SDK (generic over collection type)
Rooms Plan Run 2: Sync server auth updates  
    ↓ (these 3 can overlap with TipTap Run 1)
Rooms Plan Run 3: Y.Text markdown layer  ← depends on TipTap Run 1 (needs TipTap onUpdate)
Rooms Plan Run 4: ewe-note wiring        ← depends on both
    ↓
TipTap Plan Run 2-5: OFM extensions, slash menu, backlinks, UX
Rooms Plan Run 5: RefResolver             ← can parallel with TipTap Runs 2-5
    ↓ (depend on stable doc architecture)
Rooms Plan Run 6: Migration from old format
    ↓ (should happen after new architecture is stable)
```

**Recommended sequencing:**
1. TipTap Run 1 (swap editor) + Rooms Run 0 (spike) — parallel
2. Rooms Runs 1–2 (SDK + server)
3. Rooms Runs 3–4 (markdown layer + ewe-note wiring)
4. TipTap Runs 2–5 (OFM extensions, slash menu, backlinks, UX) + Rooms Run 5 (RefResolver) — parallel
5. Rooms Run 6 (migration — last, after everything is stable)

## Execution Summary

```
TipTap Run 1: Swap BlockNote → TipTap (Smart)
├── Rooms Run 0: Spike multiplexing (Smart) [Parallel with TipTap Run 1]
│
└── Rooms Run 1: RoomDocManager SDK (Smart)
    ├── Rooms Run 2: Sync server auth (Fast) [Parallel with Run 1]
    │
    └── Rooms Run 3: Y.Text markdown layer (Smart)
        └── Rooms Run 4: ewe-note wiring (Smart)
            │
            ├── TipTap Run 2: OFM extensions (Smart)
            │   └── TipTap Run 3: Slash menu + wiki autocomplete (Smart)
            │       └── TipTap Run 4: Note index + backlinks (Smart)
            │           └── TipTap Run 5: UX polish (Fast)
            │
            ├── Rooms Run 5: RefResolver (Smart)
            │
            └── Rooms Run 6: Migration (Smart) [After architecture is stable]
```

## Status

- [ ] Approved by user
