# ADR-0007: Rooms Topology + Doc-Split Combined Architecture

**Status:** Accepted — Not Yet Implemented (decision documented; implementation not started)  
**Date:** 2026-04-07

## Context

Two independent scaling problems:

1. **Room explosion**: Users create folders → real rooms → rolling sync overhead
2. **Doc gigantism**: 500 notes in one Y.Doc → memory/initial-sync issues

GPT analysis correctly identified "Folders ≠ Rooms" as the key insight.

## Decision

### Layer 1: Room Topology (from GPT analysis)

**Before:** User has 12 note "folders" → 12 rooms → 12 Y.Docs → rolling sync overhead

**After:**

- One **canonical private room per collection type** (e.g., `private-notes`)
- **Folders = organizational metadata inside rooms** (not sync boundaries)
- **Spaces = real rooms with ACL** (only for sharing/collaboration)
- New rooms only for sharing; folders add metadata to existing personal room

### Layer 2: Doc Split (Pattern D — Hybrid Meta + Content Docs)

```
Room<T> (unchanged conceptually — folder with permissions)
├── Meta Doc: Y.Doc (name: "room.{roomId}.meta")
│   └── Y.Map("documents"): { [docId]: DocMeta<T> }
│   └── Y.Map("folders"): { [folderId]: Folder }
│
├── Item Docs: Y.Doc (name: "room.{roomId}.doc.{docId}") — one per note/flashcard
│   ├── Y.XmlFragment("content"): TipTap editor state
│   └── Y.Text("markdown"): plaintext snapshot
```

### Key enabler: Hocuspocus multiplexing

`HocuspocusProviderWebsocket` (shared WebSocket singleton) + multiple `HocuspocusProvider` instances — one WebSocket per server regardless of item docs loaded.

### Cross-collection refs

`RefResolver` lazily loads only meta docs (not full rooms) to resolve `[[notes|roomB|docId]]` style references.

## What Was Rejected

- Subdocs (Hocuspocus doesn't support them yet)
- Keeping note bodies inline in meta doc (creates same scaling problem)
- GPT's vague "start simple" approach that led to original problem

## Consequences

- Personal use: 3-5 always-connected rooms instead of 20+
- Doc-splitting more important (rooms are larger) but rolling sync problem largely disappears
- Migration path: both patterns run during transition; SDK migrates on first load

## Related

- [2026-04-07-rooms-topology-and-doc-split.md](../plans/2026-04-07-rooms-topology-and-doc-split.md)
- [2026-04-07-topology-comparison.md](../plans/2026-04-07-topology-comparison.md)
- [2026-04-06-rooms-architecture-refactor.md](../plans/2026-04-06-rooms-architecture-refactor.md)
