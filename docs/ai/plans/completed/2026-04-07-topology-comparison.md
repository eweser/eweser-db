# Plan Comparison: Rooms Refactor vs GPT Topology Proposal

## Summary

The original **Rooms Architecture Refactor** plan (Pattern D: meta doc + per-item content docs) and GPT's **v2 Topology Plan** address the same root problem from different angles. They're not incompatible — they operate at different layers. But GPT surfaces a higher-level concern we should resolve _first_, because it changes what the lower-level doc-splitting work needs to do.

---

## What GPT Gets Right

### 1. "Folders ≠ Rooms" — the key insight

GPT's best contribution is naming the core confusion: **ewe-note currently calls rooms "Folders"**, and users are encouraged to create new rooms (via "New Folder" in the sidebar) for organizational purposes. This means personal organization creates real sync/auth boundaries, which is exactly the wrong tradeoff.

**This is real.** The codebase confirms it:

- `app-sidebar.tsx` has a "New Folder" button that calls `db.newRoom()`
- Each room = 1 Y.Doc + 1 IndexedDB + 1 HocuspocusProvider + a rolling sync slot
- Rolling sync takes ~5 sec/room → 10 folders = ~50 sec/cycle

### 2. Canonical private docs per collection type

GPT's proposal for a small fixed set of personal docs (`private-notes`, `private-flashcards`, etc.) maps cleanly to EweserDB's existing `CollectionKey` types. This is essentially: **one default room per collection, personal folders are metadata inside it.**

This dramatically reduces the number of always-connected rooms for personal use, which is the actual performance problem.

### 3. Collection-scoped app consent is the right model

GPT correctly identifies this as one of EweserDB's best ideas and says to keep it. Agreed — the current `generateLoginUrl({ collections: ['notes', 'flashcards'] })` → auth server permission accordion flow is good and should stay.

### 4. Reserve real rooms for sharing/collaboration

"Space = ACL boundary, Folder = organization" is a clean mental model. The current system conflates these.

---

## What GPT Gets Wrong or Misses

### 1. Doesn't address the doc-per-item scaling problem

GPT's entire proposal stays at the **room topology** level. It doesn't address the problem that a single room with 500 notes still has all 500 notes in one Y.Doc. Our original plan's meta-doc + per-item-doc split is still needed regardless of whether we adopt GPT's topology changes.

GPT vaguely mentions "use subdocs only for lazy-loading" but doesn't address that **Hocuspocus doesn't support subdocs** (the whole reason our plan exists). The multiplexed-provider approach from the original plan is the actual engineering solution.

### 2. Underestimates the subdoc problem

GPT says "use subdocs only where a specific boundary has large/heavy content" as if subdocs work fine today. They don't — Hocuspocus v2 doesn't support them. The original plan's multiplexing approach (shared WebSocket, separate HocuspocusProvider per item doc) is the real answer.

### 3. "Start simple, keep note bodies inline" is bad advice for notes

GPT's open question #2 ("Do private docs contain only lightweight metadata, or full note bodies too?") answers itself: "Start simple. If note bodies remain small, keep them inline." This is exactly the approach that created the current scaling problem. Note bodies are XmlFragments with rich text — they are NOT lightweight. 500 inline notes kills memory and initial sync time.

### 4. Doesn't have context on Hocuspocus multiplexing

GPT doesn't know about `HocuspocusProviderWebsocket` (shared WebSocket singleton) + multiple `HocuspocusProvider` instances on the same socket. This is the key technical enabler that makes our original plan viable without subdoc support.

### 5. Cross-collection refs

GPT says the existing `_ref` model "should stay stable enough for interop." This is true but insufficient — it doesn't address the resolution problem (how do you display a linked note's title without loading the entire room?). Our original plan's RefResolver addresses this.

---

## What We Should Change in Our Original Plan

### Change 1: Add a "Run -1" — Room topology refactor (GPT's core idea)

**Before** we do meta doc + per-item doc splitting, we should first restructure the room topology:

1. **One default room per collection type per user** — the canonical `private-notes`, `private-flashcards`, etc.
2. **Folder metadata inside the room** — `Folder` type stored in the meta doc (or a dedicated `folders` Y.Map in the room doc)
3. **New rooms only for sharing** — creating a "shared space" creates a real room; creating a "folder" adds metadata to the existing personal room
4. **UI terminology**: "Folder" for personal org, "Space" for shared rooms

This is a **prerequisite** for the doc-splitting work because it determines _how many rooms_ the RoomDocManager needs to handle. If we split items first but still have 20 personal rooms, we've solved the per-item problem but not the per-room problem.

### Change 2: Adjust RoomDocManager to expect fewer, larger rooms

With GPT's topology, a typical user has:

- 1 `private-notes` room (maybe with 500 notes across many folders)
- 1 `private-flashcards` room
- 1 `profiles` room
- 0-5 shared spaces

Instead of:

- 20 personal notes rooms (one per "folder")
- 3 shared rooms

This means the meta doc per room gets larger (500 entries vs 50), but the total number of always-connected rooms drops from ~23 to ~3-5. The doc-splitting work becomes _more_ important (because rooms are larger) but the rolling sync problem largely disappears.

### Change 3: Folder type in shared package

Add to `@eweser/shared`:

```typescript
type Folder = {
  _id: string;
  name: string;
  parentFolderId?: string; // nested folders
  color?: string;
  icon?: string;
  sortOrder?: number;
  archived?: boolean;
};
```

Notes (and flashcards) get `folderIds?: string[]` for multi-folder membership.

This is a schema change to `@eweser/shared` → needs a changeset.

### Change 4: Migration consolidates personal rooms → single room

Run 6 (migration) needs to handle two migrations:

1. **Room consolidation**: merge all private-only rooms per collection into one canonical room, preserving room names as folders
2. **Doc splitting**: existing monolithic doc → meta doc + per-item docs

Order: room consolidation first, then doc splitting.

---

## What We Should NOT Change

### 1. Keep the multiplexed HocuspocusProvider approach

GPT doesn't mention this — it's still the right solution for per-item doc splitting within a room. The spike (Run 0) should still happen.

### 2. Keep RoomDocManager and per-item content docs

GPT's suggestion to "keep note bodies inline" is wrong for our scale. The meta-doc + per-item-doc pattern from the original plan is still correct.

### 3. Keep RefResolver

Cross-collection lazy resolution is still needed and GPT doesn't provide an alternative.

### 4. Keep the Y.Text markdown layer

The debounced-markdown-to-string race condition is a real bug. Y.Text as a CRDT-native plaintext layer is still the right fix.

### 5. Keep real rooms for shared spaces

This is where GPT and our plan already agree. Rooms with ACL for collaboration stay.

---

## Revised Run Sequence

```
NEW Run -1: Room topology refactor (Smart)
  - Add Folder type to @eweser/shared (changeset)
  - Refactor ewe-note to use one default room per collection
  - "New Folder" creates metadata, not a room
  - "New Space" creates a real shared room
  - Consolidation migration for existing personal rooms
  ↓
TipTap Run 1: Swap BlockNote → TipTap (Smart)
├── Rooms Run 0: Spike multiplexing (Smart) [Parallel]
│
└── Rooms Run 1: RoomDocManager SDK (Smart)
    ├── Rooms Run 2: Sync server auth (Fast) [Parallel]
    │
    └── Rooms Run 3: Y.Text markdown layer (Smart)
        └── Rooms Run 4: ewe-note wiring (Smart)
            │
            ├── TipTap Runs 2–5 [Parallel]
            ├── Rooms Run 5: RefResolver (Smart) [Parallel]
            │
            └── Rooms Run 6: Doc-split migration (Smart)
```

**Key change:** Run -1 happens first because it determines the room topology that everything else builds on. The doc-splitting runs (1-6) then operate on the simplified topology.

---

## Revised Decision Record

| Decision                                                 | Source   | Rationale                                        |
| -------------------------------------------------------- | -------- | ------------------------------------------------ |
| One default room per collection (canonical private docs) | GPT      | Eliminates room explosion for personal use       |
| Folders = metadata, Spaces = real rooms                  | GPT      | Separates organization from sync/auth            |
| Collection-scoped app consent (keep as-is)               | Both     | Already implemented, best UX idea                |
| Meta doc + per-item content docs                         | Original | Solves 500-notes-in-one-Y.Doc problem            |
| Multiplexed HocuspocusProvider (no subdocs)              | Original | Hocuspocus doesn't support subdocs               |
| Y.Text for markdown layer                                | Original | Fixes debounced-write race conditions            |
| RefResolver for cross-collection refs                    | Original | GPT doesn't address resolution mechanics         |
| Room topology migration before doc split                 | Combined | Must know final room shape before splitting docs |

---

## Open Questions

1. **Should the canonical private rooms be created automatically at signup, or lazily on first use?** Leaning toward signup — the auth server can create them when the account is created.

2. **Can a user opt into multiple personal rooms for the same collection?** (e.g., two separate notes vaults for work/personal that they don't want to share with the same apps). This is a valid use case but adds complexity. Suggestion: not in v2, but don't close the door.

3. **Should Folder support be generic across all collections, or notes-first?** Flashcards could use folders too (decks). Start with notes, but put the Folder type in `@eweser/shared` so it's reusable.

4. **How do we handle the "profile" collection?** Profiles are already naturally single-room (one public profile, one private profile). These don't need the folder concept — they stay as-is.

## Status

- [ ] Approved by user
