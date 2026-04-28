# Plan: Rooms Topology + Doc-Split — Combined Architecture Refactor

## Goal

Fix the two-level scaling problem in EweserDB's room/document architecture:

1. **Room-level**: Too many personal rooms (folders = rooms = sync overhead)
2. **Doc-level**: Too many documents in one Y.Doc (all notes load into memory)

by restructuring room topology (one canonical room per collection, folders as metadata) AND splitting monolithic room Y.Docs into meta + per-item content docs with multiplexed Hocuspocus providers.

## Context: Current State

### What exists today

| Component            | Current State                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **Room model**       | Room = Y.Doc + IndexedDB + HocuspocusProvider. Each room typed by `CollectionKey`.            |
| **Collections**      | `notes`, `flashcards`, `profiles`, `agentConfigs`, `agentAccessLogs`, `conversations`         |
| **Folder UX**        | ewe-note calls rooms "Folders". "New Folder" button → `db.newRoom()` → real sync boundary     |
| **Document storage** | All docs in one `Y.Map("documents")` per room Y.Doc                                           |
| **Rolling sync**     | Cycles through rooms, 5 sec each. 10 rooms = ~50 sec/cycle                                    |
| **Auth server**      | On signup, creates 2 profile rooms (public + private). Apps create more via access grants.    |
| **Sync server**      | Hocuspocus `onAuthenticate` validates JWT with `roomId` claim. Doc name = room ID.            |
| **Cross-refs**       | `_ref` format: `authServer\|collectionKey\|roomId\|docId`. No resolution layer.               |
| **Note type**        | `{ text: string, flashcardRefs?, sourcePath?, frontmatter?, aliases?, tags? }` + DocumentBase |
| **Flashcard type**   | `{ frontText: string, backText: string, noteRefs? }` + DocumentBase                           |

### The two problems

**Problem 1 — Room explosion (horizontal):** Users create folders for organization, each becoming a real room with its own Y.Doc, IndexedDB, and HocuspocusProvider connection slot. 10 folders = 10 rooms rolling through sync at 5 sec each.

**Problem 2 — Doc gigantism (vertical):** Within a single room, all documents share one Y.Doc. A room with 500 notes means 500 entries in one `Y.Map("documents")`, all loaded into memory on room open. `Y.encodeStateAsUpdate()` touches everything.

These are independent problems requiring solutions at different layers, but the topology fix (Problem 1) must come first because it determines the room shapes the doc-split work will operate on.

## Solution Architecture

### Layer 1: Room Topology (from GPT analysis)

```
Before (current):
  User has 12 notes "folders" → 12 rooms → 12 Y.Docs → 12 rolling sync slots

After:
  User has 1 private-notes room with 12 folders as metadata
  + 2 shared spaces (real rooms for collaboration)
  = 3 rooms total
```

**Rules:**

- **Folder** = organizational metadata inside a room (no sync boundary)
- **Space** = a real room with ACL (sync/share boundary)
- One canonical private room per collection type per user
- Real rooms only for sharing/collaboration

### Layer 2: Doc Split (from original plan)

```
Before (current):
  Room Y.Doc:
    Y.Map("documents"): { note1: {...}, note2: {...}, ..., note500: {...} }
    (all in memory, all synced together)

After:
  Meta Doc (room.{roomId}.meta):
    Y.Map("documents"): { note1: {title, tags, ...}, note2: {title, tags, ...} }
    Y.Map("folders"): { folder1: {name, ...}, folder2: {name, ...} }
    (lightweight, always connected)

  Item Doc (room.{roomId}.doc.{docId}):  — one per note/flashcard
    Y.XmlFragment("content"): TipTap editor state
    Y.Text("markdown"): plaintext snapshot
    (connected only while editing, disconnected when switching)
```

### Combined data model

```
User Account
├── private-notes (canonical room, auto-created at signup)
│   ├── Meta Doc: room.{roomId}.meta
│   │   ├── Y.Map("documents"): { [docId]: NoteMeta }
│   │   └── Y.Map("folders"): { [folderId]: Folder }
│   └── Item Docs: room.{roomId}.doc.{docId}  (one per note)
│       ├── Y.XmlFragment("content")
│       └── Y.Text("markdown")
│
├── private-flashcards (canonical room, auto-created at signup)
│   ├── Meta Doc: room.{roomId}.meta
│   │   ├── Y.Map("documents"): { [docId]: FlashcardMeta }
│   │   └── Y.Map("folders"): { [folderId]: Folder }
│   └── Item Docs: room.{roomId}.doc.{docId}  (one per flashcard)
│       ├── Y.XmlFragment("front")
│       ├── Y.XmlFragment("back")
│       └── Y.Map("refs")
│
├── public-profile (canonical room, auto-created at signup — unchanged)
├── private-profile (canonical room, auto-created at signup — unchanged)
│
├── Shared Space: "Study Group" (real room, created by user)
│   ├── Meta Doc + Item Docs (same pattern as above)
│   └── ACL: readAccess, writeAccess, adminAccess
│
└── HocuspocusProviderWebsocket: 1 shared WebSocket per server
    ├── HocuspocusProvider per meta doc (always connected for active rooms)
    └── HocuspocusProvider per active item doc (connected only while editing)
```

### Sync topology result

| Scenario              | Before                               | After                              |
| --------------------- | ------------------------------------ | ---------------------------------- |
| Personal notes user   | 12 rooms, rolling sync ~60 sec/cycle | 1 room, no rolling sync needed     |
| + 2 shared spaces     | 14 rooms                             | 3 rooms                            |
| Active providers      | 1 per room (14)                      | 1 meta + 1 active item = 2-4 total |
| WebSocket connections | 1 per provider (14)                  | 1 shared WebSocket, multiplexed    |

## Scope

**In:**

- `Folder` type in `@eweser/shared` (changeset needed)
- `folderIds` field on Note and Flashcard types (changeset needed)
- Canonical room auto-creation at signup (auth-server-hono)
- ewe-note UI: "New Folder" → metadata, "New Space" → real room
- `RoomDocManager` in `@eweser/db` (meta doc + per-item content docs)
- Multiplexed Hocuspocus provider management (shared WebSocket singleton)
- Y.Text plaintext layer in item docs
- Cross-collection `RefResolver`
- Sync server doc name parsing
- ewe-note editor wiring
- Migration: consolidate personal rooms + split monolithic docs

**Out:**

- Subdoc support (wait for Hocuspocus)
- Graph view / backlinks index (separate plan)
- Flashcard study/review UI
- Read-only / write-only scopes (v3)
- Collections that don't need rich text (profiles, conversations, agentConfigs) stay on current monolithic pattern

## Runs

---

### Run 1: Folder type + Note/Flashcard schema updates in `@eweser/shared`

**Recommended Agent:** `02-coder` (Fast)
**Reason:** Straightforward type additions — no logic, just schema definitions. But it's a published package so needs a changeset.

**Changeset needed** — modifies `@eweser/shared` public types.

- [x] Add `Folder` type to `packages/shared/src/collections/folder.ts` (new file):

  ```ts
  import type { DocumentBase } from './documentBase';

  export type FolderBase = {
    name: string;
    parentFolderId?: string;
    color?: string;
    icon?: string;
    sortOrder?: number;
    archived?: boolean;
  };

  export type Folder = DocumentBase & FolderBase;
  ```

- [ ] Add `folderIds` to Note type in `packages/shared/src/collections/note.ts`:

  ```ts
  export type NoteBase = {
    text: string;
    flashcardRefs?: string[];
    sourcePath?: string;
    sourceVault?: string;
    frontmatter?: Record<string, unknown>;
    aliases?: string[];
    tags?: string[];
    folderIds?: string[]; // ← new
  };
  ```

- [ ] Add `folderIds` to Flashcard type in `packages/shared/src/collections/flashcard.ts`:

  ```ts
  export type FlashcardBase = {
    frontText: string;
    backText: string;
    noteRefs?: string[];
    folderIds?: string[]; // ← new
  };
  ```

- [ ] Export `Folder` from `packages/shared/src/collections/index.ts`

- [ ] **Do NOT** add `'folders'` to `COLLECTION_KEYS` — folders are not a collection, they're metadata within collection rooms

- [ ] Run `npm run build` in `packages/shared` to verify types compile

- [ ] Create changeset: `npm run changeset` (patch for `@eweser/shared`)

**Files:**

- `packages/shared/src/collections/folder.ts` (new)
- `packages/shared/src/collections/note.ts` (add `folderIds`)
- `packages/shared/src/collections/flashcard.ts` (add `folderIds`)
- `packages/shared/src/collections/index.ts` (export Folder)

**Tests:** Type compilation only — no runtime logic.

---

### Run 2: Canonical room auto-creation at signup

**Recommended Agent:** `02-coder` (Fast)
**Reason:** Small server-side change — extend existing `createNewUserRoomsAndAuthServerAccess()` to create rooms for notes, flashcards, and other collections at signup.

- [ ] Update `packages/auth-server-hono/src/services/account/create-user-rooms.ts`:
  - Currently creates 2 profile rooms (public + private)
  - Add canonical rooms for each collection that benefits from it:
    - `private-notes` (collectionKey: `'notes'`, name: `'Notes'`, publicAccess: `'private'`)
    - `private-flashcards` (collectionKey: `'flashcards'`, name: `'Flashcards'`, publicAccess: `'private'`)
    - `private-agent-config` (collectionKey: `'agentConfigs'`, name: `'Agent Config'`, publicAccess: `'private'`)
    - `private-conversations` (collectionKey: `'conversations'`, name: `'Conversations'`, publicAccess: `'private'`)
  - Add all new room IDs to the access grant's `roomIds` array
  - Use deterministic IDs or store a mapping so the SDK can find canonical rooms by collection key

- [ ] Add a helper to identify canonical rooms:
  - Option A: Name convention — canonical rooms always named `'Notes'`, `'Flashcards'`, etc.
  - Option B: Flag in DB schema — add `isCanonical: boolean` to room table (preferred for reliability)
  - Option C: The SDK just picks the first room of each collectionKey as the "default". Simplest. **Start with this.**

- [ ] Update the `/api/access-grant/sync-registry` response to include all canonical rooms

- [ ] Ensure existing users who already have profile rooms don't get duplicate rooms on next bootstrap call

**Files:**

- `packages/auth-server-hono/src/services/account/create-user-rooms.ts` (extend room creation)
- `packages/auth-server-hono/src/routes/account.ts` (no change expected — bootstrap already returns rooms)

**Tests:** Unit test: `createNewUserRoomsAndAuthServerAccess` creates rooms for all collection types. Integration test: bootstrap endpoint returns notes + flashcards rooms.

---

### Run 3: Spike — validate Hocuspocus multiplexing

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Must confirm the multiplexing pattern works end-to-end before committing to the doc-split architecture. Small scope, high-risk validation.

- [x] Write a minimal test script that:
  1. Creates a `HocuspocusProviderWebsocket` with one URL pointing at the dev sync server
  2. Creates 3+ `HocuspocusProvider` instances on the same socket for different doc names:
     - `room.test-room.meta`
     - `room.test-room.doc.note1`
     - `room.test-room.doc.note2`
  3. Writes data to each doc independently
  4. Confirms all three sync independently to the server
  5. Disconnects `doc.note1`, modifies it server-side (via second client), reconnects — confirms it picks up changes
  6. Measures: connection handshake, update latency, memory footprint with 10 concurrent providers

- [x] Test with the existing Hocuspocus sync server in docker-compose (need a way to bypass auth for the spike OR generate a valid JWT)

- [x] Confirm: disconnecting one provider does NOT close the shared WebSocket (other providers stay connected)

- [x] Document findings in `docs/ai/research/multiplexing-spike-results.md`

**Files:**

- `scripts/spike-multiplexed-docs.ts` (throw-away)

**Tests:** Manual verification, console output, documented results.

---

### Run 4: ewe-note topology — folders as metadata, spaces as rooms

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Significant UI + state management rework in ewe-note. Must change how the sidebar works, how new folders are created, and how notes are organized — all without breaking existing functionality during transition.

**Depends on:** Run 1 (Folder type), Run 2 (canonical rooms exist at signup)

- [x] Update `packages/ewe-note/src/db.tsx`:
  - Change `initialRooms` from creating a device-named room to expecting the canonical `private-notes` room from the registry
  - If the canonical room doesn't exist in registry (pre-migration user), create it as the initial room
  - Remove `collectionKeysForRollingSync` — with 1 personal room, rolling sync is unnecessary for notes
  - App stays connected to the canonical notes room for the session

- [x] Update `packages/ewe-note/src/components/app-sidebar.tsx`:
  - **"New Folder" button** → creates a `Folder` document inside the current room's Y.Map, NOT a new room via `db.newRoom()`
  - **"New Space" button** (new) → creates a real shared room via `db.newRoom()` for collaboration
  - **Sidebar structure** changes from:
    ```
    [Room 1 (collapsible)]
      Note A
      Note B
    [Room 2 (collapsible)]
      Note C
    ```
    to:
    ```
    My Notes
      [Folder 1 (collapsible)]
        Note A
        Note B
      [Folder 2 (collapsible)]
        Note C
      [Unfiled]
        Note D
    Shared Spaces
      [Study Group (collapsible)]
        Note E
    ```
  - Notes without `folderIds` appear under "Unfiled" or at root level
  - Folder CRUD: create, rename, delete (soft-delete), reorder
  - Drag-and-drop note into folder (stretch — can defer)

- [x] Add folder state management in `packages/ewe-note/src/notes-room.tsx`:
  - `useFolders()` hook: reads `Y.Map("folders")` or stores Folder objects in the existing documents Y.Map
  - **Decision: where to store folders?**
    - Option A: Folders as regular documents in the same room's Y.Map (simplest — they have `_id`, `_ref`, etc.)
    - Option B: Separate Y.Map("folders") in the room's Y.Doc
    - **Recommendation: Option A** — treat Folders as documents with `collectionKey: 'notes'` but a discriminator field. Actually, simpler: just store them in the same `Y.Map("documents")` with a `type: 'folder'` discriminator. **Wait — this pollutes the Note type.**
    - **Better: store folder assignments on the notes themselves** (`folderIds` field) and **folder definitions in a separate Y.Map**. For now, before the meta-doc split, store folder definitions as a JSON string in a well-known document ID (e.g., `_folders`). After the meta-doc split, they move to the meta doc's `Y.Map("folders")`.
    - **Simplest approach for now:** Folders are a `Record<string, Folder>` stored as a single entry in the room's documents Y.Map under key `__folders__`. Not elegant but works pre-split.

- [x] Update note filtering: sidebar groups notes by `folderIds`. Notes with no `folderIds` go to "Unfiled".

- [x] **Keep existing multi-room support working** for shared spaces — the sidebar still shows shared rooms as collapsible groups under "Shared Spaces".

**Files:**

- `packages/ewe-note/src/db.tsx` (canonical room logic)
- `packages/ewe-note/src/components/app-sidebar.tsx` (folder UI, sidebar restructure)
- `packages/ewe-note/src/notes-room.tsx` (folder hooks, folder-filtered note lists)
- `packages/ewe-note/src/components/folder-dialog.tsx` (new — create/rename folder dialog)

**Tests:**

- Create folder, assign note to folder, verify sidebar grouping
- Create shared space, verify it appears under "Shared Spaces"
- "New Folder" does NOT create a new room (verify `db.newRoom` is not called)

---

### Run 5: Personal room consolidation migration

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Data migration — must merge multiple personal rooms per collection into the canonical room without data loss. Critical for existing users.

**Depends on:** Run 1 (Folder type), Run 2 (canonical rooms), Run 4 (folder metadata working)

- [ ] Migration logic in `@eweser/db` SDK (runs on login for existing users):
  1. After `syncRegistry()`, check: does user have multiple rooms for `'notes'` collection?
  2. If yes, identify the canonical room (first room, or the one marked canonical)
  3. For each non-canonical personal room (where user is sole admin, no other read/write access):
     a. Load the room's Y.Doc
     b. Read all documents from `Y.Map("documents")`
     c. Create a `Folder` entry named after the old room's `name`
     d. Copy each document into the canonical room's Y.Doc, adding the folder's ID to `folderIds`
     e. Update each document's `_ref` to point to the canonical room
     f. Soft-delete the old room (mark `_deleted: true` in registry)
  4. Rooms with multiple users (shared rooms) are NOT migrated — they stay as rooms
  5. Persist migration state: once a room has been consolidated, mark it so it doesn't re-migrate

- [ ] Handle edge cases:
  - Duplicate document IDs across rooms (generate new IDs for conflicts)
  - `_ref` strings in `flashcardRefs`/`noteRefs` that pointed to old rooms need updating
  - Documents in-flight on other devices (old room syncs → but room is marked deleted → those peers will get the deletion flag and find their docs in the canonical room on next sync)

- [ ] This migration runs **before** the doc-split migration (Run 9). Room consolidation first, then doc splitting within the canonical room.

**Files:**

- `packages/db/src/migrations/consolidate-personal-rooms.ts` (new)
- `packages/db/src/methods/connection/login.ts` (call migration after syncRegistry)

**Tests:**

- User with 3 notes rooms → after migration, 1 canonical room with 3 folders
- Shared room is NOT consolidated
- Document `_ref` values are updated
- Duplicate IDs handled

---

### Run 6: SDK — RoomDocManager in `@eweser/db`

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Core SDK architectural change — needs careful Y.Doc lifecycle, provider management, and backward compat. This is the heart of the doc-split.

**Depends on:** Run 3 (spike validates multiplexing works), Run 1 (types)

**Changeset needed** — changes `@eweser/db` public API.

- [ ] Add `HocuspocusProviderWebsocket` as a shared singleton per server URL (new field on Database class):

  ```ts
  // packages/db/src/index.ts
  private sharedWebSockets: Map<string, HocuspocusProviderWebsocket> = new Map();

  getSharedWebSocket(url: string): HocuspocusProviderWebsocket {
    if (!this.sharedWebSockets.has(url)) {
      this.sharedWebSockets.set(url, new HocuspocusProviderWebsocket({ url }));
    }
    return this.sharedWebSockets.get(url)!;
  }
  ```

- [ ] New class `RoomDocManager<T extends EweDocument>`:

  ```ts
  class RoomDocManager<T extends EweDocument> {
    collectionKey: CollectionKey;
    roomId: string;
    metaDoc: Y.Doc; // Y.Map("documents") = DocMeta[], Y.Map("folders") = Folder[]
    metaProvider: HocuspocusProvider;
    metaIndexedDb: IndexeddbPersistence;
    activeItemDoc: Y.Doc | null;
    activeItemProvider: HocuspocusProvider | null;
    activeItemIndexedDb: IndexeddbPersistence | null;

    // Meta doc operations
    getItemList(): DocMeta<T>[];
    getFolders(): Folder[];
    createItem(data: Partial<T>): { docId: string; meta: DocMeta<T> };
    deleteItem(docId: string): void;
    updateItemMeta(docId: string, updates: Partial<DocMeta<T>>): void;
    createFolder(folder: Partial<Folder>): Folder;
    updateFolder(folderId: string, updates: Partial<Folder>): void;
    deleteFolder(folderId: string): void;

    // Item doc operations
    openItem(docId: string): Promise<ItemDocHandle<T>>;
    closeItem(): void;

    // Lifecycle
    connect(): Promise<void>; // connect meta doc
    disconnect(): void; // disconnect everything
  }
  ```

- [ ] Type-specific `ItemDocHandle`:

  ```ts
  type NoteItemDocHandle = {
    doc: Y.Doc;
    content: Y.XmlFragment; // TipTap editor state
    markdown: Y.Text; // plaintext snapshot
    provider: HocuspocusProvider;
  };

  type FlashcardItemDocHandle = {
    doc: Y.Doc;
    front: Y.XmlFragment; // rich-text front
    back: Y.XmlFragment; // rich-text back
    refs: Y.Map; // { noteRefs: string[] }
    provider: HocuspocusProvider;
  };
  ```

- [ ] Item doc schema registry:

  ```ts
  // packages/db/src/item-doc-schemas.ts
  export const ITEM_DOC_SCHEMAS = {
    notes: { fragments: ['content'], texts: ['markdown'] },
    flashcards: { fragments: ['front', 'back'], maps: ['refs'] },
  } as const;
  ```

- [ ] `openItem(docId)` flow:
  1. If another item is open, call `closeItem()` first
  2. Create new Y.Doc
  3. Create IndexeddbPersistence (keyed `room.{roomId}.doc.{docId}`)
  4. Wait for local load
  5. Create HocuspocusProvider on shared WebSocket (doc name: `room.{roomId}.doc.{docId}`, token from room's syncToken)
  6. Wait for remote sync (if online)
  7. Return type-specific handle

- [ ] `closeItem()` flow:
  1. Disconnect HocuspocusProvider
  2. Destroy IndexeddbPersistence
  3. Null out `activeItemDoc`, `activeItemProvider`, `activeItemIndexedDb`
  4. GC can free the Y.Doc

- [ ] Meta doc lifecycle:
  - Connected when `connect()` is called (room is "open" in UI)
  - Disconnected when `disconnect()` is called
  - Meta doc name: `room.{roomId}.meta`

- [ ] `DocMeta<T>` type (stored in meta doc, lightweight):

  ```ts
  type DocMetaBase = {
    _id: string;
    _ref: string;
    _created: number;
    _updated: number;
    _deleted?: boolean;
    folderIds?: string[];
    tags?: string[];
  };

  type NoteDocMeta = DocMetaBase & {
    title: string; // first line / heading of note
    aliases?: string[];
  };

  type FlashcardDocMeta = DocMetaBase & {
    frontPreview: string; // first ~100 chars of front
  };
  ```

**Files:**

- `packages/db/src/room-doc-manager.ts` (new)
- `packages/db/src/item-doc-schemas.ts` (new)
- `packages/db/src/types.ts` (DocMeta types, ItemDocHandle types)
- `packages/db/src/index.ts` (shared WebSocket management, expose RoomDocManager)

**Tests:** Unit tests for:

- RoomDocManager lifecycle (connect/disconnect)
- `createItem()` → meta doc entry + item doc created
- `openItem()`/`closeItem()` → provider connected/disconnected
- `getItemList()` returns current meta
- `deleteItem()` soft-deletes in meta
- Test with both notes and flashcards collection schemas

---

### Run 7: Sync server — doc name parsing + auth

**Recommended Agent:** `02-coder` (Fast)
**Reason:** Small, focused server-side change. Parse new doc names and validate room-level permissions.

**Depends on:** Run 6 (doc naming convention finalized)

- [ ] Update `packages/sync-server/src/index.ts` `onAuthenticate`:
  - Current: JWT has `roomId`, doc name = room ID directly
  - New: doc name can be `room.{roomId}.meta` or `room.{roomId}.doc.{docId}`
  - Parse the room ID from the doc name
  - Validate against JWT's `roomId` claim
  - Allow any `doc.{docId}` under a room the user has access to
  - **Backward compat**: if doc name doesn't match the new pattern, treat it as the old format (doc name = room ID)

- [ ] Helper function:

  ```ts
  function parseDocName(docName: string): {
    roomId: string;
    type: 'meta' | 'item' | 'legacy';
    docId?: string;
  } {
    const metaMatch = docName.match(/^room\.(.+)\.meta$/);
    if (metaMatch) return { roomId: metaMatch[1], type: 'meta' };

    const itemMatch = docName.match(/^room\.(.+)\.doc\.(.+)$/);
    if (itemMatch)
      return { roomId: itemMatch[1], type: 'item', docId: itemMatch[2] };

    // Legacy: doc name IS the room ID
    return { roomId: docName, type: 'legacy' };
  }
  ```

- [ ] Token refresh: the SDK currently gets one token per room. That same token should work for all doc names under that room. Verify the JWT `roomId` claim is checked against the parsed room ID, not the full doc name.

**Files:**

- `packages/sync-server/src/index.ts` (update onAuthenticate, add parseDocName)

**Tests:**

- `parseDocName('room.abc.meta')` → `{ roomId: 'abc', type: 'meta' }`
- `parseDocName('room.abc.doc.xyz')` → `{ roomId: 'abc', type: 'item', docId: 'xyz' }`
- `parseDocName('old-room-id')` → `{ roomId: 'old-room-id', type: 'legacy' }`
- Auth: token for room `abc` grants access to `room.abc.meta` and `room.abc.doc.*`
- Auth: token for room `abc` does NOT grant access to `room.def.meta`

---

### Run 8: Y.Text markdown layer + ewe-note wiring

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Combines the Y.Text markdown change with the ewe-note editor rewiring. These are tightly coupled — the editor must use the new item doc structure.

**Depends on:** Run 6 (RoomDocManager), TipTap migration Run 1 (editor uses TipTap, not BlockNote)

- [ ] In the note item doc, alongside `Y.XmlFragment("content")`, the `Y.Text("markdown")` is already defined by the schema in Run 6. This run implements the write logic.

- [ ] Markdown write logic (in editor or a dedicated hook):
  1. TipTap `onUpdate` fires
  2. Debounce the serialization (CPU-bound, ~50-100ms for large notes)
  3. Serialize editor content to OFM markdown string
  4. Get current `Y.Text("markdown")` content via `.toString()`
  5. Compute diff (or just: `doc.transact(() => { markdownText.delete(0, markdownText.length); markdownText.insert(0, newMarkdown); })`)
  6. Y.Text ops are CRDT-native — merge cleanly across peers
  7. **Also update meta doc**: extract title (first heading or first line) and update `DocMeta.title`

- [ ] Update `packages/ewe-note/src/notes-room.tsx` → `useNotesRoom` hook rewrite:
  - Replace `room.getDocuments()` with `RoomDocManager<Note>`
  - `getItemList()` from meta doc → populates sidebar with note titles
  - `openItem(id)` when a note is selected → returns `NoteItemDocHandle`
  - `closeItem()` when switching notes or unmounting
  - `createNote()` → `manager.createItem({ text: '# New Note' })`
  - `deleteNote()` → `manager.deleteItem(id)`
  - `updateNoteText()` → writes to `Y.Text("markdown")` + updates meta title
  - Remove `updateNoteFrontmatter()` — frontmatter is derived from markdown content

- [ ] Update `packages/ewe-note/src/components/editor.tsx`:
  - Receive `NoteItemDocHandle` (with `content: Y.XmlFragment`, `provider: HocuspocusProvider`)
  - TipTap `Collaboration.configure({ fragment: handle.content })` (NOT `document: ydoc` — use fragment)
  - `CollaborationCursor` uses the item-level provider for awareness
  - `onUpdate` → debounced markdown serialization → write to `handle.markdown`
  - When `handle` changes (note switch), editor re-initializes with new fragment

- [ ] Update `packages/ewe-note/src/components/app-sidebar.tsx`:
  - Note list comes from `manager.getItemList()` instead of room documents
  - Note title display uses `meta.title` instead of `removeMarkdown(note.text)`
  - Folder grouping uses `meta.folderIds`

- [ ] Note switching UX:
  1. User clicks different note in sidebar
  2. `closeItem()` disconnects current note's provider
  3. `openItem(newId)` connects new note
  4. Editor receives new `NoteItemDocHandle` → re-renders
  5. Brief loading state in editor pane while item doc syncs

- [ ] Update `packages/ewe-note/src/db.tsx`:
  - Create `RoomDocManager<Note>` for the canonical notes room
  - Expose via context provider
  - Remove direct `room.getDocuments()` calls

**Files:**

- `packages/ewe-note/src/notes-room.tsx` (rewrite to use RoomDocManager)
- `packages/ewe-note/src/components/editor.tsx` (fragment source + markdown write)
- `packages/ewe-note/src/components/app-sidebar.tsx` (meta-based note list + folder grouping)
- `packages/ewe-note/src/db.tsx` (RoomDocManager integration)

**Tests:**

- Open note, type content → Y.Text("markdown") updated
- Switch note → previous item doc disconnected, new one connected
- Create note → appears in sidebar from meta doc
- Delete note → removed from sidebar
- Two editors on same note → collaboration works via item-level provider

---

### Run 9: Cross-collection RefResolver

**Recommended Agent:** `02-coder` (Smart)
**Reason:** New abstraction for lazy cross-room, cross-collection ref resolution. Must handle caching, permissions, and connection lifecycle without flooding the server.

**Depends on:** Run 6 (RoomDocManager and meta docs exist)

- [ ] New class `RefResolver` on the Database instance:

  ```ts
  class RefResolver {
    constructor(private db: Database) {}

    parse(ref: string): ParsedRef;
    // → { authServer, collectionKey, roomId, docId }

    async resolveMeta(ref: string): Promise<DocMeta | null>;
    // Loads target room's meta doc (if not already loaded), reads entry
    // Returns null for inaccessible rooms (no throw)

    async resolveContent(ref: string): Promise<ResolvedContent | null>;
    // Opens the specific item doc, reads Y.Text/Y.XmlFragment, disconnects
    // For notes: returns { markdown: string }
    // For flashcards: returns { front: string, back: string }

    async resolveMany(refs: string[]): Promise<Map<string, DocMeta>>;
    // Batch resolve — groups by room, loads each room's meta doc once

    private metaDocCache: Map<
      string,
      { doc: Y.Doc; items: Map<string, DocMeta> }
    >;
  }
  ```

- [ ] Lazy meta doc loading:
  - When resolving a ref to a room not currently connected, create a temporary `HocuspocusProvider` for `room.{roomId}.meta`
  - Sync it, read the entry, cache in memory
  - Keep the IndexedDB persistence so future resolves are fast (offline-first)
  - Disconnect the provider after reading (no long-lived connection for read-only meta)

- [ ] Permission boundary:
  - Cross-room refs may point to rooms the user doesn't have access to
  - `resolveMeta()` returns `null` for inaccessible refs
  - UI shows "Link to inaccessible note" or similar

- [ ] Cache invalidation:
  - When a room's meta doc is connected (room is open), the cache for that room auto-updates via Yjs sync
  - For disconnected rooms, cache is stale — accept this for display purposes; re-resolve on navigation

- [ ] Wire into Database class:
  ```ts
  // packages/db/src/index.ts
  refResolver: RefResolver; // initialized in constructor
  ```

**Files:**

- `packages/db/src/ref-resolver.ts` (new)
- `packages/db/src/index.ts` (add RefResolver to Database)
- `packages/shared/src/utils/documents.ts` (ensure `parseRef()` exists — it does as `buildRef`)

**Tests:**

- Resolve ref within same room → returns meta from cached meta doc
- Resolve ref across rooms → loads target meta doc, returns entry
- Resolve ref to inaccessible room → returns null
- Batch resolve 5 refs across 2 rooms → only 2 meta doc loads
- Resolve content → opens item doc, reads markdown, disconnects

**Changeset needed** — new public API on `@eweser/db`.

---

### Run 10: Migration — monolithic docs → meta + item docs

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Data migration with backward compat. Must not lose existing users' data. Runs after all new architecture is stable.

**Depends on:** Run 5 (room consolidation done), Run 6 (RoomDocManager), Run 8 (ewe-note wired to new arch)

- [ ] Migration logic in `RoomDocManager.connect()`:
  1. Load the room's existing Y.Doc (old monolithic format)
  2. Check: does `Y.Map("documents")` have entries AND does `meta` doc exist?
  3. If old format detected and no meta doc:
     a. Create the meta doc (`room.{roomId}.meta`)
     b. For each document in old `Y.Map("documents")`:
     - Extract metadata → write to meta doc's `Y.Map("documents")`
     - Create an item doc (`room.{roomId}.doc.{docId}`)
     - For notes: copy XmlFragment (if any) to item doc's `Y.XmlFragment("content")`; serialize text to `Y.Text("markdown")`
     - For flashcards: copy `frontText`/`backText` to `Y.XmlFragment("front")`/`Y.XmlFragment("back")` + `Y.Map("refs")`
     - Copy `folderIds` from the document to the meta entry
       c. Set migration flag in meta doc: `Y.Map("_migration").set("v2", true)`
  4. After migration, old doc remains readable but is no longer written to

- [ ] Copying Y.XmlFragment between Y.Docs:
  - This is non-trivial. Options:
    - A: `Y.encodeStateAsUpdate(oldDoc)` → apply to new doc (copies everything, not just the fragment)
    - B: Serialize XmlFragment to HTML/JSON → parse into new doc (lossy for CRDT history)
    - C: For notes that only have `text` (string), no XmlFragment → just write the text to the new Y.Text and let TipTap initialize a fresh XmlFragment
  - **Recommendation: Option C for most cases.** The current codebase stores note content as the `text` string field. The XmlFragment is the editor's working state, not the source of truth. For migration, write `text` → `Y.Text("markdown")` and let TipTap initialize the XmlFragment from the markdown on first open.

- [ ] Handle peer compat:
  - An old SDK peer might write to the old monolithic doc after migration
  - Add a `Y.Map("documents")` observer on the old doc that forwards new/updated entries to the meta + item doc system
  - This bridge can be removed in a future version

- [ ] Folder migration (from Run 5's room consolidation):
  - Old room names → folder names (already done in Run 5)
  - Ensure folder IDs are carried over to meta doc entries

**Files:**

- `packages/db/src/migrations/migrate-to-item-docs.ts` (new)
- `packages/db/src/room-doc-manager.ts` (call migration in `connect()`)

**Tests:**

- Create 10 notes in old format, migrate, verify all 10 appear in meta doc + have item docs
- Create flashcards in old format, migrate, verify front/back text preserved
- Markdown round-trip: old `text` → `Y.Text("markdown")` → read back matches
- Migration is idempotent (running twice doesn't duplicate)
- Migration flag prevents re-migration

---

## Risks

1. **Hocuspocus multiplexing stability** — Officially supported but less battle-tested than single-doc usage. Run 3 exists to validate this before committing.

2. **Y.Text markdown drift** — If `Y.Text("markdown")` and `Y.XmlFragment("content")` get out of sync (crash during serialization), markdown becomes stale. Mitigation: on note open, always re-derive markdown from XmlFragment. Y.Text is a derived artifact, not source of truth.

3. **Room consolidation data loss** — Merging rooms is destructive. Mitigation: soft-delete old rooms (not hard-delete), keep old Y.Docs in IndexedDB for rollback. Migration is reversible for 30 days.

4. **IndexedDB handle limits** — Each open doc = one IndexeddbPersistence instance. With meta + 1 active item = 2 concurrent handles per room. Browser limit ~50-100. We're well within bounds.

5. **Changeset required** — `@eweser/shared` (Folder type, folderIds) and `@eweser/db` (RoomDocManager, RefResolver) both need changesets.

6. **Migration ordering** — Room consolidation (Run 5) MUST complete before doc splitting (Run 10). Running them in wrong order loses the folder-from-room-name mapping.

7. **XmlFragment copy** — Copying Y.XmlFragment between Y.Docs preserves content but loses CRDT history. Acceptable — the CRDT state starts fresh in the new item doc. Future edits build new history.

8. **Backward compat with old SDK versions** — Old SDK peers will write to the monolithic room doc. The migration bridge (observer on old doc → forward to new docs) handles this but adds complexity. Set a sunset date for old format support.

9. **Cross-room ref `_ref` invalidation** — Room consolidation changes room IDs for migrated documents. All `_ref` strings, `flashcardRefs`, and `noteRefs` pointing to old room IDs must be updated. Run 5 handles this but it's error-prone.

## Relationship to TipTap Migration Plan

The doc-split runs (6–10) depend on TipTap Run 1 being complete (editor uses TipTap, not BlockNote). The topology runs (1–5) are independent of the TipTap migration and can proceed in parallel.

## Execution Summary

```text
Run 1: Folder type + schema updates (Fast)
├── Run 2: Canonical room auto-creation (Fast) [Parallel with Run 1]
├── Run 3: Spike multiplexing (Smart) [Parallel with Runs 1-2]
│
└── Run 4: ewe-note topology — folders as metadata (Smart) [Depends on 1, 2]
    └── Run 5: Personal room consolidation migration (Smart) [Depends on 4]
        │
        TipTap Run 1: Swap BlockNote → TipTap (Smart) [Parallel with Runs 1-5]
        │
        └── Run 6: RoomDocManager SDK (Smart) [Depends on 3 spike results, 1 types]
            ├── Run 7: Sync server doc name parsing (Fast) [Parallel with Run 6]
            │
            └── Run 8: Y.Text + ewe-note wiring (Smart) [Depends on 6, TipTap Run 1]
                │
                ├── Run 9: RefResolver (Smart) [Parallel with Run 8]
                │
                ├── TipTap Runs 2-5: OFM extensions, slash menu, backlinks (Smart/Fast) [Parallel]
                │
                └── Run 10: Doc-split migration (Smart) [Last — after architecture is stable]
```

### Parallelization opportunities

| Parallel Group                      | Runs                              | Notes                                                                |
| ----------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| **Group A** (can start immediately) | Run 1, Run 2, Run 3, TipTap Run 1 | All independent                                                      |
| **Group B** (after Group A)         | Run 4, Run 5                      | Depend on Runs 1-2, independent of Run 3 and TipTap                  |
| **Group C** (after spike + types)   | Run 6, Run 7                      | Run 6 depends on Run 3 results + Run 1 types. Run 7 parallel with 6. |
| **Group D** (after SDK + TipTap)    | Run 8, Run 9                      | Run 8 depends on Run 6 + TipTap Run 1. Run 9 parallel with 8.        |
| **Group E** (last)                  | Run 10                            | After everything is stable and tested                                |

## Status

- [ ] Approved by user
