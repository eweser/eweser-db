# Plan: Share Folder UX — Replace "New Shared Space" with Folder Context Menu

## Goal

Replace the explicit "New Shared Space" toolbar button with a **Share** option inside a `...` context menu on each folder, so users never need to understand the room/space concept.

## Scope

- **In:**
  - Add a `MoreHorizontal` (`...`) dropdown to each folder row in the sidebar
  - Menu items: **Rename**, **Share**, **Delete**
  - "Share" converts the selected folder into a shared space (creates a new room named after the folder, moves its notes to that room)
  - Remove the `Share2` toolbar button and the standalone `<Dialog>` for "New Shared Space"
- **Out:**
  - Moving notes between rooms (non-trivial CRDT sync) — see Risks
  - Sharing individual notes
  - Shared rooms getting their own folder grouping (future)

## Runs

### Run 1: Folder context menu (no share logic yet)

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Pure UI work — add `DropdownMenu` to the folder row, wire up existing `renameFolder` / `deleteFolder`, render a disabled "Share" stub.
- [ ] Import `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`
- [ ] Import `MoreHorizontal` from `lucide-react`
- [ ] Replace the folder `<button>` row in `app-sidebar.tsx` with a new `<FolderRow>` that shows `...` on hover
- [ ] Wire Rename → opens existing `FolderDialog` (rename variant)
- [ ] Wire Delete → calls `deleteFolder(folder.id)`
- [ ] Wire Share → stub (console.log / TODO toast for now)
- [ ] Files: `packages/ewe-note/src/components/app-sidebar.tsx`

### Run 2: Share logic — create room from folder

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Needs to orchestrate Yjs CRDT operations: create new room, clone notes, delete originals.
- [ ] In `handleShareFolder(folder: FolderRecord)`:
  1. Create a new room via `db.newRoom<Note>({ collectionKey: 'notes', name: folder.name })`
  2. `await newRoom.load()`
  3. Iterate notes in `notesByRoomId[canonicalRoom.id]` that have `folderIds` containing `folder.id`
  4. For each note: `newRoom.getDocuments().new({ text: note.text, ... })` then mark original as deleted via `canonicalRoom.getDocuments().delete(note._id)`
  5. `deleteFolder(folder.id)` from canonical room
  6. `setSelectedRoom(newRoom)`
- [ ] Show a confirmation dialog before sharing ("This will move all notes in **{name}** into a synced shared space.")
- [ ] Files: `packages/ewe-note/src/components/app-sidebar.tsx` (or extract to `use-share-folder.ts` hook)

### Run 3: Remove toolbar Share button

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Cleanup once Run 1+2 are done.
- [ ] Remove `Share2` import from `lucide-react`
- [ ] Remove `<Dialog>` block for "New Shared Space" from toolbar
- [ ] Remove `creatingSpace`, `newSpaceName` state vars and `handleCreateSpace` function
- [ ] Files: `packages/ewe-note/src/components/app-sidebar.tsx`

## Risks

- **Note migration fidelity**: Copying a note by re-creating it in a new room loses Yjs history. For now this is acceptable (same as current "create note" flow). True CRDT-preserve migration is a future concern.
- **Undo**: There's no undo for sharing. The confirmation dialog (Run 2) mitigates this.
- **Shared rooms currently have no folder concept**: After sharing, notes land at the top level of the shared room. Folders-within-shared-rooms is a future feature.

## Execution Summary

```text
Run 1: Folder context menu UI (Fast)
└── Run 2: Share logic — create room from folder (Smart)
    └── Run 3: Remove toolbar Share button (Fast)
```

Runs 1→2→3 are sequential (each depends on the previous).

## Status

- [ ] Approved by user
