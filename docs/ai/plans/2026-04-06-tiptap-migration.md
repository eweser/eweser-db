# Plan: TipTap Migration + Obsidian Feature Build-Out

## Goal

Replace BlockNote with TipTap 2.x directly in ewe-note, then build the Obsidian-compatible feature set (wiki-links, callouts, highlight, frontmatter, slash menu, backlinks index) as proper TipTap extensions.

## Scope

- **In:** `packages/ewe-note` editor layer only — TipTap extension builds, Markdown serialization, Yjs wiring migration
- **In:** Note index for wiki-link resolution and backlinks (client-side, in-memory with IndexedDB persistence)
- **Out:** Graph view (separate plan after backlinks index exists)
- **Out:** ewe-note UX polish (sync status badge, delete/rename, search) — those are downstream of editor stability
- **Out:** Packages outside `ewe-note` (shared schema changes deferred unless required)
- **No changeset required** — ewe-note is an app, not a published package

## Reference Material

[docs/ai/research/2026-04-06-editor-reference-sweep.md](../research/2026-04-06-editor-reference-sweep.md)

---

## Runs

### Run 1: TipTap baseline — replace BlockNote, restore functional editor

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Architectural swap — requires careful Yjs wiring, content migration bridge, and verifying no regressions.

- [ ] Remove `@blocknote/*` packages from `packages/ewe-note/package.json`
- [ ] Install:
  ```
  @tiptap/core @tiptap/react @tiptap/starter-kit
  @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
  @tiptap/extension-placeholder @tiptap/extension-character-count
  ```
- [ ] Rewrite `packages/ewe-note/src/components/editor.tsx`:
  - Replace `useCreateBlockNote` + `BlockNoteView` with `useEditor` + `EditorContent`
  - Wire `Collaboration.configure({ document: ydoc })` and `CollaborationCursor`
  - **Set `StarterKit.configure({ undoRedo: false })`** — critical
  - Keep same `HocuspocusProvider` wiring from `notes-room.tsx`
- [ ] Update Y.Doc fragment name: BlockNote used `blocknote` fragment; raw TipTap uses a different fragment. **Write a migration shim** that checks if the ydoc has BlockNote-format data and converts to TipTap JSON on first load, OR start fresh (preferred — note content is already stored as OFM strings in the eweser-db Y.Map, not in the raw ydoc fragment directly — confirm this assumption).
- [ ] Remove `ofm-serializer.ts` usage from editor.tsx (temporarily) — keep the file, but the editor no longer uses BlockNote's block format
- [ ] Add basic Tailwind prose styling to the editor div
- [ ] Files:
  - `packages/ewe-note/src/components/editor.tsx` (rewrite)
  - `packages/ewe-note/package.json` (dep swap)
  - `packages/ewe-note/src/extensions/` (clean up BlockNote extension files)
- [ ] Tests: Manual smoke test — can create note, type content, collaboration cursor appears

### Run 2: OFM serialization — `==highlight==`, callouts, wiki-link mark

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Custom TipTap Node/Mark authoring with Markdown tokenizer integration — requires ProseMirror API knowledge.

- [ ] Install `@tiptap/extension-highlight` (for `==highlight==` mark with multicolor support)
- [ ] Rewrite OFM serializer as a set of proper TipTap extensions (`addMarkdown()`) rather than pre/post string processing:

  **a) `==Highlight==` mark** — add custom inline MD tokenizer to the Highlight extension; serializes back to `==text==`

  **b) `WikiLinkNode`** — inline atom Node:
  - Attributes: `{ name: string, alias?: string }` (no UUID — resolve name at render time)
  - `renderHTML`: `<span data-wiki-link="true" data-name="...">[[name]]</span>`
  - Input rule: `[[` opens a suggestion (see Run 3); completed wiki-link inserts the node
  - Markdown tokenizer: `[[Name]]` and `[[Name|Alias]]` → WikiLinkNode; serializes back to `[[name]]` or `[[name|alias]]`
  - Click handler: `options.onWikiLinkClick(name)` — navigate to note (wired later)
  - Reference: `aarkue/tiptap-wikilink-extension` pattern + alias extension

  **c) `CalloutNode`** — block Node (Notesnook `content: "heading block*"` pattern):
  - Attributes: `{ type: 'note'|'tip'|'warning'|'danger'|'info'|'success'|'question'|'bug', collapsed: boolean }`
  - Input rule: `> [!NOTE] Title\n` at start of line → creates callout node
  - Markdown tokenizer: OFM-style `> [!TYPE]\n> content` (see research doc tokenizer code)
  - Serializer: renders back to OFM callout format

  **d) `FrontmatterNode`** — block Node, must be first child of document:
  - Renders as a read-only table/panel showing YAML key-value pairs
  - Stored as a TipTap Node (not stripped out) so it survives Yjs sync
  - Parsed from `---\n...\n---` at document start on initial load
  - Serialized back to `---\n...\n---` on markdown export
  - NOT editable inline initially — show a "Edit Properties" panel (phase 2)

- [ ] Rewrite `ofm-serializer.ts` to use TipTap's JSON↔OFM path via the new extensions
- [ ] Files:
  - `packages/ewe-note/src/extensions/highlight.ts` (new or updated)
  - `packages/ewe-note/src/extensions/wiki-link.ts` (rewrite to TipTap Node)
  - `packages/ewe-note/src/extensions/callout.ts` (new)
  - `packages/ewe-note/src/extensions/frontmatter.ts` (new)
  - `packages/ewe-note/src/extensions/ofm-serializer.ts` (rewrite)
- [ ] Tests: Load an existing Obsidian vault `.md` file (with callouts, wiki-links, frontmatter, highlights) and verify round-trip fidelity

### Run 3: Slash menu + wiki-link autocomplete

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** TipTap `Suggestion` API wiring + React dropdown UI.

- [ ] Install `@tiptap/extension-suggestion` + `tippy.js` (or Radix Popover — already in deps)

- [ ] **Slash menu** (`/` at line start):
  - Use `Suggestion` utility with `char: '/'`, `startOfLine: true`
  - Items: Heading 1/2/3, Bullet List, Ordered List, Task List, Callout (types), Table, Code Block, Divider, Image
  - UI: Radix/shadcn `Command` component for the popover (already in deps — reuse sidebar pattern)

- [ ] **Wiki-link autocomplete** (`[[` trigger):
  - Use `Suggestion` utility with `char: '[['` (double bracket — configure `startOfLine: false`)
  - Items: all note names from current room (from `useNotesRoom` hook — export note list)
  - Support `|` for alias: `[[PageName|Display Text]]`
  - Smart double-close prevention (don't add `]]` if already typed)
  - On selection → insert `WikiLinkNode` via `editor.commands.insertContent`

- [ ] Files:
  - `packages/ewe-note/src/extensions/slash-commands.ts` (new)
  - `packages/ewe-note/src/extensions/wiki-link-suggestion.ts` (new)
  - `packages/ewe-note/src/components/slash-menu.tsx` (new UI component)
  - `packages/ewe-note/src/components/wiki-link-picker.tsx` (new UI component)
  - `packages/ewe-note/src/components/editor.tsx` (wire new extensions)

### Run 4: Note index + backlinks panel

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Requires designing and implementing an in-memory/IndexedDB index of all notes' wiki-link references, plus a backlinks sidebar panel.

- [ ] **Note index service** (`src/lib/note-index.ts`):
  - Maintain: `Map<noteId, { outboundLinks: string[], title: string }>`
  - Maintained by: scanning OFM content of all notes in the current room on load + on save
  - Reverse index: `Map<noteTitle, noteId[]>` (for wiki-link resolution)
  - Backlinks: `Map<noteId, noteId[]>` (notes that link TO this note)
  - Persistence: store in `sessionStorage` (rebuild on reload — fast enough for <1000 notes; add IndexedDB later for larger vaults)
  - Expose via React context: `useNoteIndex()`

- [ ] **Wiki-link resolution** — when a `WikiLinkNode` is clicked:
  - Look up `noteTitle` in reverse index
  - Navigate to that note (select it in sidebar)
  - If not found: show toast "Note not found — create it?"

- [ ] **Backlinks panel** — new sidebar section below the notes list:
  - Shows: `{N} notes link here` when a note is selected
  - Expand to list linking note titles (clickable)
  - Source: `useNoteIndex().getBacklinks(selectedNoteId)`

- [ ] Files:
  - `packages/ewe-note/src/lib/note-index.ts` (new)
  - `packages/ewe-note/src/components/backlinks-panel.tsx` (new)
  - `packages/ewe-note/src/components/app-sidebar.tsx` (add backlinks section)
  - `packages/ewe-note/src/notes-room.tsx` (expose note content list to index)

### Run 5: UX polish wave

**Recommended Agent:** `02-coder` (Fast)  
**Reason:** Mechanical wiring of features that already have all underlying hooks implemented — mostly component/UI work.

- [ ] **Sync status badge** — wire `connectionStatus` from `useNotesRoom` to a visible indicator in the editor header or breadcrumb
- [ ] **Offline indicator** — listen to `eweser:pwa-offline-ready` event in a component, show persistent "Offline" badge when triggered
- [ ] **Delete note** — add context menu (right-click or `...` button) to note items in sidebar, wire `deleteNote()` from `useNotesRoom`
- [ ] **Inline rename** — double-click note title → editable input, saves on blur/Enter
- [ ] **Sidebar search/filter** — uncomment + implement `SearchForm`, filter notes by title (simple string match for now)
- [ ] **Non-blocking load** — instead of full-screen spinner, show sidebar immediately with skeleton notes list; spinner only in editor pane

---

## Risks

1. **Y.Doc fragment migration** — BlockNote may have written content to a specific ydoc fragment (`blocknote`). If existing notes have synced content in that fragment, raw TipTap won't read it. Mitigation: the current ewe-note likely stores note content as OFM strings in the Y.Map (not in the raw ydoc fragment), so a clean start on the TipTap collab fragment may work. **Confirm before Run 1.**

2. **TipTap 2.x vs 3.x** — TipTap 3.x is in beta and has breaking changes + Markdown extension behind Pro license. Stick to **2.x LTS** for all runs.

3. **ProseMirror duplicate instance** — multiple packages importing different versions of `prosemirror-view` causes silent failures. **Pin `prosemirror-*` to exact versions** in `package.json` (Notesnook pins to `1.34.2`). Run `npm ls prosemirror-view` to check after installing.

4. **`@tiptap/extension-collaboration` and undo history** — must set `StarterKit.configure({ history: false })` (or `undoRedo: false`). Missing this causes double-undo bugs with Yjs.

5. **Callout OFM syntax in existing notes** — if users have existing notes with `> [!NOTE]` callouts, the current OFM serializer silently converts them to blockquotes. The new callout extension will correctly parse them — this is an upgrade, but the ydoc stored content (if in block format) would need the same migration care as risk #1.

6. **`@tiptap/markdown` Pro requirement in v3** — do NOT upgrade to TipTap 3 to get the built-in Markdown extension. Write custom tokenizers on 2.x (the `addMarkdown()` hook is available via `@tiptap/markdown` on 2.x without Pro).

---

## Execution Summary

```
Run 1: TipTap baseline (Smart) — swap BlockNote, restore functional collab editor
└── Run 2: OFM extension suite (Smart) — wiki-link Node, callout, highlight, frontmatter
    └── Run 3: Slash menu + wiki autocomplete (Smart) — needs wiki-link Node from Run 2
        └── Run 4: Note index + backlinks (Smart) — needs wiki-link Node + full note list
            └── Run 5: UX polish (Fast) — polish after core editor is stable
```

All runs are sequential (each depends on the previous). Estimated total effort: 2–3 weeks of focused coding.

---

## Status

- [ ] Approved by user
