# Editor Reference Sweep — April 2026

**Purpose:** Source-level research of OSS PKM/editor projects to inform the ewe-note editor migration decision. Goal: full Obsidian vault compatibility as the product north star.

---

## 1. Notesnook (`@notesnook/editor`)

**Source:** https://github.com/streetwriters/notesnook  
**Editor:** TipTap 2.6.6 (`@notesnook/editor` v2.1.3)  
**Sync:** Custom HTTP/WebSocket — **zero Yjs** (cannot copy their sync patterns)  
**Storage format:** Raw HTML strings — ❌ incompatible with Yjs CRDT merging (must use TipTap JSON)  
**Mobile:** WebView bridge — same web editor running inside React Native WebView via `postMessage`

### What to copy

**Callout as TipTap Node with `content: "heading block*"`:**

```ts
export const Callout = Node.create({
  name: "callout",
  content: "heading block*",   // ← heading IS the title bar, elegant
  addAttributes() {
    return {
      type: { default: "info", parseHTML: el => el.dataset.calloutType },
      collapsed: { default: false },
    };
  },
  addInputRules() {
    return [new InputRule({ find: /^>\s*\[!(.+?)\]\s*(.*)$/, ... })];
  },
});
```

**Internal links as `nn://` custom protocol on standard Link mark:**

```ts
// No dedicated wiki-link mark needed — reuse Link
export function createInternalLink(noteId: string) {
  return `nn://note/${noteId}`;
}
export function isInternalLink(href: string) {
  return href?.startsWith('nn://');
}
```

**Block IDs via `addGlobalAttributes()`:**

```ts
// Adds data-block-id to ALL block nodes — essential for deep-link anchors
editor.commands.addGlobalAttributes([
  { types: allBlockTypes, attributes: { blockId: { default: null } } },
]);
```

**Custom `ReactNodeView` base class** — wrote their own instead of using `@tiptap/react` nodeView. Useful pattern for complex interactive nodes.

**ProseMirror version pinning:** `prosemirror-view` pinned to exact `1.34.2` — mismatched versions cause duplicate ProseMirror instance bugs. **Pin all ProseMirror deps.**

### What NOT to copy

- HTML string storage (raw HTML, not TipTap JSON) — breaks Yjs
- WebView mobile bridge strategy for a PWA (postMessage overhead)
- No `==highlight==` input rule — they use a color-picker only

---

## 2. Noteriv

**Source:** https://github.com/AlexanderElias/noteriv  
**Desktop editor:** **CodeMirror 6** — NOT TipTap  
**Phone editor:** Raw `TextInput` + custom markdown renderer  
**Graph:** WebView with D3-like physics simulation

### What to copy

**Wiki-link autocomplete trigger pattern:**

```ts
// CodeMirror extension — but the PATTERN is portable to TipTap Suggestion
// Triggers on [[, fuzzy-match against note names, smart double-close prevention
// ([[PageName]] → does not double-bracket when ] is typed)
```

**Callout decoration approach (CodeMirror ViewPlugin):**

```ts
// Match > [!type] Title pattern in blockquote
// → Apply CSS class to the first line for the label
// → Wrap block in a styled container
// Portability: reproduce as a TipTap callout Node with Obsidian-syntax input rule
```

**Frontmatter: hand-rolled YAML parser** — parses `---\n key: value \n---` at top of doc, no `gray-matter` dep dependency. ~50 lines. Useful for keeping bundle lean.

**Embed widget pattern (`![[Note]]`):**

```ts
// CodeMirror widget: hides when cursor is on that line (re-shows as text)
// Reads target file async, renders first 30 lines
// → Port to TipTap: custom NodeView that's read-only within the note
```

**Slash commands:** `/` at line start → DOM overlay at cursor position. Replaces the trigger text + space with the block type. Clean, no external library.

### What NOT to copy

- Linear scan wiki-link resolution (no index, only 5s TTL cache) — won't scale to large vaults
- Hand-rolled CodeMirror editor from scratch — too much custom event handling
- Phone RN `TextInput` renderer — ewe-note is PWA-first

---

## 3. AFFiNE / BlockSuite

**Source:** https://github.com/toeverything/blocksuite  
**Architecture:** Block-per-editor model — each block is its own inline TipTap-like editor instance (`@blocksuite/inline`). Native Yjs data layer — every Doc IS a Yjs subdocument.  
**Releases:** Canary-only (nightly master builds, no stable semver)

### Verdict: ❌ Do NOT use for ewe-note

| Criterion                | Assessment                                                |
| ------------------------ | --------------------------------------------------------- |
| OFM / Obsidian wikilinks | ❌ No — internal links are UUID block refs, no round-trip |
| YAML frontmatter         | ❌ No evidence                                            |
| Obsidian import          | ❌ Open feature request since 2025                        |
| React-native components  | ❌ Lit web components — shadow DOM, can't use Tailwind    |
| Customizability          | 🔴 Community reports it's impossible outside AFFiNE       |
| Stable release           | 🔴 Canary-only                                            |
| Bundle size              | 🔴 60+ sub-packages + canvas renderer + full Lit runtime  |

**Root cause of coupling (from community discussion #8005):** The `@blocksuite/presets` layer assumes AFFiNE's exact block schema, keyboard maps, and toolbar widgets. 0 maintainer replies to embeddability questions.

**What IS worth noting architecturally:**

- Block-per-editor model solves large document performance (no single contenteditable monolith)
- Yjs-native was the right call for collaboration — but we already have this with Hocuspocus
- ForceAtlas2 physics (from SiYuan research too) is a solid graph layout algorithm

---

## 4. SiYuan

**Source:** https://github.com/siyuan-note/siyuan  
**Editor:** Fully custom `contenteditable` (Protyle class, 3,257 lines) — NOT a library  
**Backend:** Go (Gin) + SQLite — every keystroke calls Go lute WASM via `/api/lute/spinBlockDOM`  
**Embeddability:** ❌ Not extractable — requires full Go kernel  
**License:** AGPL-3.0

### What to copy (architecture patterns only)

**Block ID strategy:** 20-char timestamp-based IDs (`20230101120000-abc123`) — sortable, globally unique, encode creation time. Much better than UUIDs for on-disk storage.

**SQLite as query layer pattern:**

```
Store documents as Markdown files on disk
+
Maintain a SQLite index of all blocks (id, parent_id, root_id, content, markdown, refs)
→ O(1) backlink lookup via SQL (no file traversal at query time)
→ Fast full-text search via FTS5 virtual table
→ SQL embeds: query blocks like a database
```

This is the right backlinks architecture for any Obsidian clone. SiYuan's schema:

```sql
blocks (id, parent_id, root_id, box, path, hpath, content, markdown, type, subtype, ial, refs)
refs  (id, def_block_id, def_block_root_id, block_id, ...)
```

**vis-network for graph view** (v9.1.13, `forceAtlas2Based` physics):

```ts
physics: {
  solver: "forceAtlas2Based",
  forceAtlas2Based: {
    gravitationalConstant: -600,
    centralGravity: 0.01,
    springConstant: 0.08,
    springLength: 400,
    damping: 0.4,
    avoidOverlap: 0.5,
  },
  stabilization: { iterations: 64 }
}
```

Incremental node batching for large graphs (add nodes in intervals to avoid blocking).

**Wikilink import pipeline pattern:**

```ts
// SiYuan's Obsidian import steps (kernel/model/import.go)
1. parseStdMd(data)                         // parse .md files with lute
2. convertMdHyperlinks2WikiLinks()           // [text](file.md) → [[file]]
3. convertWikiLinksAndTags0()               // [[...]] → internal block refs
4. convertTags()                             // #tag → tag syntax
5. reassignBlockIDs()                        // new IDs for all nodes
6. writeToFiles() + indexSQLite()            // persist + index
```

**Transaction model for undo/redo:**

```go
type Operation struct {
  Action     string // "insert", "update", "delete", "move"
  Data       string // block DOM HTML
  ID         string // block ID
  PreviousID string
}
```

Every edit is an operation in a transaction — cleaner than event-sourcing full document state.

### What NOT to copy

- Custom contenteditable Protyle (3,200+ lines, 5+ year investment)
- Proprietary `.sy` / Kramdown IAL format (not interoperable)
- Go WASM round-trip on every keystroke (latency, complexity)
- Paid sync (even self-hosted S3/WebDAV has startup-blocking sync issues)
- `((blockID 'text'))` block ref syntax instead of `[[PageName]]`

---

## 5. TipTap Extension API

**Source:** https://tiptap.dev + https://github.com/aarkue/tiptap-wikilink-extension  
**Version:** 2.x (stable) — **do NOT use 3.x** (breaking API changes, requires TipTap Pro for Markdown extension)  
**Collaboration:** `@tiptap/extension-collaboration` + Hocuspocus — server side unchanged from BlockNote

### OFM feature effort estimates

| Feature                        | TipTap Native                         | Effort     |
| ------------------------------ | ------------------------------------- | ---------- |
| Bold, italic, strike, code     | ✅ StarterKit                         | Zero       |
| Headings H1–H6                 | ✅ StarterKit                         | Zero       |
| Bullet/ordered/task lists      | ✅ StarterKit + TaskList              | Zero       |
| Code blocks + syntax highlight | ✅ + CodeBlockLowlight                | Zero       |
| Blockquotes                    | ✅ StarterKit                         | Zero       |
| Tables                         | ✅ Table extension                    | Zero       |
| `==Highlight==`                | ✅ Highlight extension + MD tokenizer | ~2h        |
| Math (`$...$`)                 | ✅ Mathematics extension              | ~2h        |
| Yjs collab migration from BN   | ✅ extension-collaboration            | ~4h        |
| Floating toolbar               | ✅ BubbleMenu (headless)              | ~4h        |
| Slash menu (`/`)               | ⚠️ Suggestion utility                 | ~1 day     |
| `[[Wiki-links]]`               | ❌ Custom atom Node                   | ~1–2 days  |
| `![[Embeds]]`                  | ❌ Custom block Node                  | ~2–3 days  |
| Callouts `> [!NOTE]`           | ❌ Custom Node + MD tokenizer         | ~1–2 days  |
| YAML frontmatter               | ❌ Pre/post processing                | ~2–3 days  |
| `#tags` inline                 | ❌ Custom Mark or Node                | ~1 day     |
| Backlinks panel                | ❌ External (requires note index)     | ~3–5 days  |
| Graph view                     | ❌ External (vis-network + index)     | ~1–2 weeks |

### Key TipTap Yjs wiring (replaces BlockNote)

```ts
// TipTap + Hocuspocus — server side unchanged
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

const editor = useEditor({
  extensions: [
    StarterKit.configure({ undoRedo: false }), // ← MUST disable, Collaboration adds its own
    Collaboration.configure({ document: ydoc }),
    CollaborationCursor.configure({ provider, user: { name, color } }),
  ],
});
```

**Critical:** `undoRedo: false` in StarterKit or you get double-undo behavior.

### Best wiki-link extension reference

**`tiptap-wikilink-extension`** (github.com/aarkue/tiptap-wikilink-extension) — ~150 lines:

```ts
// WikiLinkNode — inline atom (not splittable)
const WikiLinkNode = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      id: { parseHTML: (el) => el.getAttribute('data-id') },
      name: { parseHTML: (el) => el.getAttribute('data-name') },
    };
  },
  addNodeView() {
    return ({ node }) => {
      const el = document.createElement('button');
      el.className = 'wikilink';
      el.textContent = node.attrs.name;
      el.addEventListener('click', () =>
        options.onWikiLinkClick(node.attrs.id, node.attrs.name)
      );
      return { dom: el };
    };
  },
});
```

**Note:** This library doesn't have alias support (`[[Page|Alias]]`) or Markdown serialization. Roll your own from this pattern.

### Markdown tokenizer for `==highlight==`

```ts
const highlightTokenizer: MarkdownTokenizer = {
  name: 'highlight',
  level: 'inline',
  start: (src) => src.indexOf('=='),
  tokenize(src) {
    const match = /^==([^=]+)==/.exec(src);
    if (match) return { type: 'highlight', raw: match[0], text: match[1] };
  },
};
```

### Callout tokenizer for `> [!NOTE]` (OFM style)

The TipTap docs show `:::type` (Pandoc style). For OFM (`> [!NOTE] Title\n> content`):

```ts
const calloutTokenizer: MarkdownTokenizer = {
  name: 'callout',
  level: 'block',
  start: (src) => src.indexOf('> [!'),
  tokenize(src, tokens, lexer) {
    const match = /^> \[!(\w+)\](?: (.+))?\n((?:> [^\n]*\n?)*)/.exec(src);
    if (match) {
      const [, type, title, body] = match;
      const innerMarkdown = body.replace(/^> /gm, '');
      return {
        type: 'callout',
        raw: match[0],
        calloutType: type.toLowerCase(),
        title: title ?? '',
        tokens: lexer.blockTokens(innerMarkdown),
      };
    }
  },
};
```

---

## Summary: Architecture Decisions

### Editor foundation recommendation: TipTap 2.x directly

| Approach                   | Obsidian compat    | Yjs support      | React native | Bundle     | Extension API          |
| -------------------------- | ------------------ | ---------------- | ------------ | ---------- | ---------------------- |
| **Stay on BlockNote 0.23** | ❌ Hacks only      | ✅               | ✅           | Medium     | Limited                |
| **TipTap 2.x directly**    | ✅ Build it all    | ✅               | ✅           | Medium     | Full ProseMirror       |
| **BlockSuite**             | ❌ None            | ✅✅             | ❌ Lit       | Very heavy | Locked to AFFiNE       |
| **CodeMirror 6**           | ⚠️ Would need port | ❌ No Yjs collab | ✅           | Light      | Full but different API |

**Decision: Migrate to TipTap 2.x directly.** Remove the BlockNote abstraction layer. Keep Hocuspocus/Yjs wiring intact (server unchanged). Build Obsidian features as proper TipTap extensions.

### Backlinks indexing: SQLite (SiYuan pattern)

For backlinks to be fast, maintain a SQLite/IndexedDB index (or leveraging the eweser-db CRDT layer) of `(noteId, referencedNoteTitle)` pairs updated on note save. Linear file scan (Noteriv approach) won't scale past ~200 notes.

### Graph view: vis-network

`vis-network` (used in production by SiYuan, 42k stars) is the best ratio of effort:quality for a force-directed backlinks graph. ForceAtlas2 physics parameters from SiYuan are a good starting point.

### Mobile: Same web editor in a PWA

ewe-note is a PWA. The Notesnook WebView bridge approach is the right mental model — the same TipTap editor works on mobile web. Add mobile-specific CSS (`@media (hover: none)`) and toolbar changes rather than building a separate mobile editor.
