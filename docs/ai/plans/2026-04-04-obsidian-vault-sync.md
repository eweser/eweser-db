# Plan: Obsidian Vault Import & Bidirectional Sync

## Goal

Make ewe-note 1:1 compatible with Obsidian vaults — import existing vaults, render all Obsidian Flavored Markdown, and maintain bidirectional sync so Obsidian Sync continues working alongside EweserDB.

## Scope

- **In:**
  - Complete Obsidian Flavored Markdown (OFM) syntax reference and test vault
  - Note schema update to support vault metadata (source path, frontmatter, folder hierarchy)
  - CLI import tool to ingest Obsidian vaults into EweserDB rooms
  - BlockNote custom extensions for OFM-specific syntax (wiki-links, highlights, callouts, comments)
  - Vault export tool (EweserDB → .md files)
  - Bidirectional file watcher daemon for ongoing sync
  - Image/attachment handling (import, storage, rendering)
  - Multi-vault support (4 vaults → 4 rooms or room groups)

- **Out:**
  - Obsidian plugin development (community plugin for Obsidian itself)
  - Mermaid diagram rendering in BlockNote (use code block fallback — already works)
  - Embedded search queries (`\`\`\`query` blocks — Obsidian-only runtime feature)
  - Block reference links (`[[Note#^block-id]]` — deferred, requires block ID tracking)
  - PDF/audio embed rendering (show as download links initially)
  - Mobile/React Native vault sync (desktop-first, mobile gets notes via Hocuspocus)

## Obsidian Flavored Markdown — Complete Syntax Reference

### Standard Markdown (CommonMark + GFM) — Already handled by BlockNote

| Feature          | Syntax                      | BlockNote Support           |
| ---------------- | --------------------------- | --------------------------- |
| Headings         | `# H1` through `###### H6`  | ✅ Native                   |
| Bold             | `**text**` or `__text__`    | ✅ Native                   |
| Italic           | `*text*` or `_text_`        | ✅ Native                   |
| Bold+Italic      | `***text***`                | ✅ Native                   |
| Strikethrough    | `~~text~~`                  | ✅ Native                   |
| Ordered lists    | `1. item`                   | ✅ Native                   |
| Unordered lists  | `- item` or `* item`        | ✅ Native                   |
| Task lists       | `- [ ] todo` / `- [x] done` | ✅ Native                   |
| Blockquotes      | `> text`                    | ✅ Native                   |
| Inline code      | `` `code` ``                | ✅ Native                   |
| Code blocks      | ` ``` lang `                | ✅ Native                   |
| Horizontal rules | `---` or `***`              | ✅ Native                   |
| Tables           | `\| col \| col \|`          | ✅ Native                   |
| External links   | `[text](url)`               | ✅ Native                   |
| External images  | `![alt](url)`               | ✅ Native                   |
| Footnotes        | `[^1]` / `[^1]: text`       | ⚠️ Lossy (rendered as text) |
| Inline footnotes | `^[inline note]`            | ⚠️ Lossy                    |
| Math inline      | `$E=mc^2$`                  | ⚠️ Needs extension          |
| Math block       | `$$\begin{...}\end{...}$$`  | ⚠️ Needs extension          |

### Obsidian Extensions — Need Custom Implementation

| Feature                      | Syntax                                         | Priority | Approach                                |
| ---------------------------- | ---------------------------------------------- | -------- | --------------------------------------- |
| **Wiki links**               | `[[Note Name]]`                                | P0       | Custom inline content type              |
| **Wiki links with alias**    | `[[Note Name\|Display Text]]`                  | P0       | Custom inline content type              |
| **Heading links**            | `[[Note#Heading]]`                             | P1       | Extend wiki-link type                   |
| **Same-note heading links**  | `[[#Heading]]`                                 | P1       | Extend wiki-link type                   |
| **Embeds (notes)**           | `![[Note Name]]`                               | P1       | Custom block type                       |
| **Embeds (images)**          | `![[image.png]]`                               | P0       | Custom block type + asset resolution    |
| **Image sizing**             | `![[img.png\|640x480]]` or `![[img.png\|100]]` | P1       | Parse dimensions from alias position    |
| **Highlights**               | `==text==`                                     | P0       | Custom mark / inline content            |
| **Comments**                 | `%%text%%` (inline + block)                    | P2       | Custom inline/block type                |
| **Callouts**                 | `> [!type] Title`                              | P1       | Custom block type (13 built-in types)   |
| **Foldable callouts**        | `> [!type]+` / `> [!type]-`                    | P2       | Extend callout block                    |
| **Nested callouts**          | Callout inside callout                         | P2       | Recursive parsing                       |
| **Tags (inline)**            | `#tag` / `#tag/subtag`                         | P1       | Custom inline content + tag index       |
| **Properties (frontmatter)** | `---\nkey: value\n---`                         | P0       | Parse YAML, store in note metadata      |
| **Aliases**                  | `aliases: [name1, name2]` in frontmatter       | P1       | Index for wiki-link resolution          |
| **Block anchors**            | `^block-id` at end of paragraph                | P2       | Preserve in markdown, no rendering      |
| **Block links**              | `[[Note#^block-id]]`                           | P3       | Requires block ID tracking system       |
| **Mermaid diagrams**         | ` ```mermaid `                                 | P2       | Code block fallback (already works)     |
| **Embedded search**          | ` ```query `                                   | P3       | Out of scope (Obsidian runtime feature) |

### Callout Types Reference

Built-in types for the callout block extension:

- `note` (default for unknown types)
- `abstract` / `summary` / `tldr`
- `info`
- `todo`
- `tip` / `hint` / `important`
- `success` / `check` / `done`
- `question` / `help` / `faq`
- `warning` / `caution` / `attention`
- `failure` / `fail` / `missing`
- `danger` / `error`
- `bug`
- `example`
- `quote` / `cite`

## Architecture

### Vault ↔ EweserDB Mapping

```
Obsidian Vault (folder on disk)     EweserDB
─────────────────────────────────   ─────────────────────
vault/                          →   Room (collectionKey: 'notes')
  folder/                      →   note.folderPath = 'folder/'
    subfolder/                  →   note.folderPath = 'folder/subfolder/'
  note.md                      →   Note document { text, frontmatter, sourcePath }
  attachments/image.png         →   Attachment doc or binary storage
  .obsidian/                    →   Ignored (vault config, not synced)
```

### Key Design Decisions

1. **Raw OFM markdown stored in `note.text`** — Do NOT use `blocksToMarkdownLossy()` for vault-synced notes. Store the exact Obsidian markdown. BlockNote's `tryParseMarkdownToBlocks()` handles standard markdown; custom extensions handle the rest. On save, serialize blocks back to OFM markdown (custom serializer).

2. **One vault = one room** — Each of the user's 4 vaults becomes a separate EweserDB room. Folder structure preserved via `folderPath` field on each note. This keeps access control natural (share a vault = share a room).

3. **Frontmatter stored separately** — YAML properties parsed into a `frontmatter` record on the note document, not mixed into `text`. This enables search/filter by properties while keeping the markdown clean.

4. **Bidirectional sync via file watcher** — A Node.js daemon (or ewe-note desktop process) watches the vault folder. File changes → update EweserDB doc. EweserDB doc changes → write .md file. Obsidian Sync continues working because the .md files on disk are the source of truth for Obsidian.

5. **Images as attachments** — Images referenced in notes (`![[img.png]]`) are imported as binary files. For the initial import, they're copied into EweserDB's attachment storage. For bidirectional sync, they remain on disk in the vault folder and are served locally.

6. **Wiki-link resolution** — Build an in-memory index of `noteName → noteId` on room load. Wiki-links resolve by searching this index. Cross-vault links (`[[vault2/Note]]`) search across rooms.

### Sync Flow

```
Obsidian Vault (.md files on disk)
        ↕ Obsidian Sync (Obsidian's own sync)
        ↕ File Watcher (our daemon)
        ↕
EweserDB (Yjs Y.Map documents)
        ↕ Hocuspocus WebSocket
        ↕
Other devices / ewe-note instances
```

### Note Schema Changes

```typescript
// packages/shared/src/collections/note.ts
type NoteBase = {
  text: string; // Raw markdown (OFM-compatible)
  flashcardRefs?: string[]; // Existing field
  // New fields for vault sync:
  sourcePath?: string; // e.g. 'folder/subfolder/My Note.md'
  sourceVault?: string; // Vault name for multi-vault support
  frontmatter?: Record<string, unknown>; // Parsed YAML properties
  aliases?: string[]; // From frontmatter, indexed for link resolution
  tags?: string[]; // Extracted from frontmatter + inline #tags
};
```

## Runs

### Run 0: Test Vault + OFM Syntax Fixtures

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Creating test fixture files — no complex logic, just comprehensive markdown examples covering every OFM syntax type.

#### Steps:

- [x] Create `packages/ewe-note/test-fixtures/obsidian-vault/` with `.obsidian/` config stub
- [x] Create test notes covering every syntax type:
  - `Basic Formatting.md` — bold, italic, strikethrough, highlights, comments, code, lists, tasks, blockquotes, horizontal rules
  - `Wiki Links.md` — `[[links]]`, `[[link|alias]]`, `[[link#heading]]`, `[[#same-note-heading]]`
  - `Embeds.md` — `![[note]]`, `![[image.png]]`, `![[image.png|300]]`, `![[note#heading]]`
  - `Callouts.md` — all 13 callout types + foldable + nested
  - `Properties and Tags.md` — YAML frontmatter with all property types, inline `#tags`, `#nested/tags`
  - `Math and Diagrams.md` — inline `$math$`, block `$$math$$`, mermaid code block
  - `Footnotes.md` — `[^1]` references + inline `^[footnotes]`
  - `Tables.md` — basic + aligned + with internal links/embeds
  - `Code Blocks.md` — fenced with language, nested code blocks, inline code
  - `Attachments/test-image.png` — small test image for embed testing
  - `Folder A/Nested Note.md` — test folder hierarchy preservation
  - `Folder A/Subfolder/Deep Note.md` — deeper nesting
- [x] Create `packages/ewe-note/test-fixtures/obsidian-vault/.obsidian/app.json` (minimal config)
- [x] Each test note should include a comment explaining what it tests

#### Files:

- Create: `packages/ewe-note/test-fixtures/obsidian-vault/.obsidian/app.json`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Basic Formatting.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Wiki Links.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Embeds.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Callouts.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Properties and Tags.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Math and Diagrams.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Footnotes.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Tables.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Code Blocks.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Attachments/test-image.png`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Folder A/Nested Note.md`
- Create: `packages/ewe-note/test-fixtures/obsidian-vault/Folder A/Subfolder/Deep Note.md`

---

### Run 1: Note Schema Update + OFM Parser

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Modifying `@eweser/shared` (published package), adding new fields to Note type, writing a markdown parser for OFM-specific syntax. Changeset required. Must not break existing consumers.

#### Steps:

- [x] Update `packages/shared/src/collections/note.ts` — add optional fields: `sourcePath`, `sourceVault`, `frontmatter`, `aliases`, `tags`
- [x] Create `packages/shared/src/utils/obsidian-markdown.ts`:
  - `parseFrontmatter(markdown: string)` → `{ frontmatter: Record<string, unknown>, content: string }` — splits YAML header from body
  - `extractTags(markdown: string)` → `string[]` — finds all `#tag` and `#tag/subtag` patterns (excluding code blocks and frontmatter)
  - `extractWikiLinks(markdown: string)` → `Array<{ target: string, alias?: string, heading?: string, blockRef?: string, isEmbed: boolean }>` — parses `[[...]]` and `![[...]]`
  - `serializeFrontmatter(frontmatter: Record<string, unknown>, content: string)` → `string` — reassembles YAML + body
- [x] Create `packages/shared/src/utils/obsidian-markdown.test.ts`:
  - Test each parser function with examples from every OFM syntax type
  - Test round-trip: parse → serialize → parse produces identical output
  - Test edge cases: empty frontmatter, frontmatter with wiki-links in values, nested tags, code blocks containing `[[` (should NOT be parsed)
- [x] Export from `packages/shared/src/index.ts`
- [x] Create changeset for `@eweser/shared` (minor — new optional fields + new exports)

#### Files:

- Modify: `packages/shared/src/collections/note.ts`
- Create: `packages/shared/src/utils/obsidian-markdown.ts`
- Create: `packages/shared/src/utils/obsidian-markdown.test.ts`
- Modify: `packages/shared/src/index.ts`
- Create: changeset

---

### Run 2: Vault Import CLI Tool

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: File system traversal, markdown parsing, EweserDB document creation via the SDK. Needs to handle large vaults (hundreds of files) efficiently and create proper Yjs documents.

#### Steps:

- [x] Create `packages/ewe-note/src/cli/import-vault.ts`:
  - CLI entry: `npx tsx packages/ewe-note/src/cli/import-vault.ts --vault /path/to/vault --name "My Vault" --auth-url http://localhost:3001`
  - Recursively scan vault folder for `.md` files (skip `.obsidian/`, `.trash/`)
  - For each `.md` file:
    1. Read file content
    2. Parse frontmatter + extract tags using shared parsers
    3. Create note document: `{ text: content (without frontmatter), sourcePath, sourceVault, frontmatter, aliases, tags }`
    4. Generate stable `_id` from `sourcePath` (deterministic, so re-import is idempotent)
  - Collect all image/attachment files (`.png`, `.jpg`, `.gif`, `.webp`, `.svg`, `.pdf`)
  - Report: `Imported X notes, Y attachments from vault "Name"`
  - Dry-run mode: `--dry-run` to preview what would be imported
- [x] Handle large vaults: stream files, don't load all into memory at once
- [x] Handle encoding: UTF-8 markdown files, binary attachments
- [x] Create `packages/ewe-note/src/cli/import-vault.test.ts`:
  - Test against the test vault fixture from Run 0
  - Verify frontmatter parsing, tag extraction, folder path mapping
  - Verify idempotent re-import (same vault imported twice = same documents)

#### Files:

- Create: `packages/ewe-note/src/cli/import-vault.ts`
- Create: `packages/ewe-note/src/cli/import-vault.test.ts`

---

### Run 3: BlockNote OFM Extensions (P0 — Wiki Links + Highlights)

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Custom BlockNote extensions require understanding the BlockNote extension API (inline content types, custom blocks, slash menu items). Wiki-links need a resolution index. This is the most complex UI work.

#### Steps:

- [x] Create `packages/ewe-note/src/extensions/wiki-link.ts`:
  - Custom inline content type for `[[wiki links]]`
  - Renders as a clickable link that navigates to the target note
  - Shows alias text when `[[target|alias]]` is used
  - Heading links `[[Note#Heading]]` navigate to note + scroll to heading
  - Parse on markdown load: detect `[[...]]` patterns and convert to inline content
  - Serialize on save: convert back to `[[...]]` syntax
- [x] Create `packages/ewe-note/src/extensions/highlight.ts`:
  - Custom mark for `==highlighted text==`
  - Renders with yellow/highlight background
  - Parse `==text==` on markdown load
  - Serialize back to `==text==` on save
- [x] Create `packages/ewe-note/src/extensions/image-embed.ts`:
  - Custom block for `![[image.png]]` and `![[image.png|300]]`
  - Resolves image from vault attachments or EweserDB attachment storage
  - Supports dimension syntax (`|WxH` or `|W`)
- [x] Create `packages/ewe-note/src/hooks/use-note-index.ts`:
  - Builds and maintains `Map<string, string>` of `noteName → noteId`
  - Also indexes aliases from frontmatter
  - Updates on room document changes
  - Used by wiki-link extension for resolution + navigation
- [x] Update `packages/ewe-note/src/components/editor.tsx`:
  - Pass custom extensions to `useCreateBlockNote`
  - Use custom markdown serializer that preserves OFM syntax instead of `blocksToMarkdownLossy()`
- [x] Create `packages/ewe-note/src/extensions/ofm-serializer.ts`:
  - Custom `blocksToMarkdown()` that handles wiki-links, highlights, callouts
  - Custom `markdownToBlocks()` that parses OFM extensions
  - Falls back to BlockNote's built-in for standard markdown

#### Files:

- Create: `packages/ewe-note/src/extensions/wiki-link.ts`
- Create: `packages/ewe-note/src/extensions/highlight.ts`
- Create: `packages/ewe-note/src/extensions/image-embed.ts`
- Create: `packages/ewe-note/src/extensions/ofm-serializer.ts`
- Create: `packages/ewe-note/src/hooks/use-note-index.ts`
- Modify: `packages/ewe-note/src/components/editor.tsx`

---

### Run 4: BlockNote OFM Extensions (P1 — Callouts + Tags + Frontmatter UI)

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Callout block is a complex custom block type with 13+ variants, foldable state, and nested content. Frontmatter UI needs a property editor component.

#### Steps:

- [x] Create `packages/ewe-note/src/extensions/callout.ts`:
  - Custom block type for `> [!type] Title`
  - Supports all 13 built-in types + aliases (rendering with appropriate icon + color)
  - Foldable state (`+` expanded, `-` collapsed)
  - Content area supports nested markdown (including other callouts)
  - Type selector dropdown in toolbar
- [x] Create `packages/ewe-note/src/extensions/tag.ts`:
  - Custom inline content for `#tag` and `#nested/tag`
  - Renders as clickable pill/badge
  - Click filters notes by tag
  - Autocomplete from existing tags in the vault/room
- [x] Create `packages/ewe-note/src/components/frontmatter-editor.tsx`:
  - Property editor shown above the BlockNote editor
  - Supports Obsidian property types: text, list, number, checkbox, date, date+time, tags
  - Renders YAML frontmatter as editable key-value pairs
  - Changes update `note.frontmatter` and re-serialize to markdown
- [x] Update `packages/ewe-note/src/extensions/ofm-serializer.ts`:
  - Add callout serialization/deserialization
  - Add tag serialization/deserialization

#### Files:

- Create: `packages/ewe-note/src/extensions/callout.ts`
- Create: `packages/ewe-note/src/extensions/tag.ts`
- Create: `packages/ewe-note/src/components/frontmatter-editor.tsx`
- Modify: `packages/ewe-note/src/extensions/ofm-serializer.ts`
- Modify: `packages/ewe-note/src/components/editor.tsx`

---

### Run 5: Vault Export + Bidirectional Sync

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: File watching, conflict resolution between two sync systems (Obsidian Sync + Hocuspocus), debouncing — complex systems integration.

#### Steps:

- [x] Create `packages/ewe-note/src/cli/export-vault.ts`:
  - Export EweserDB room → vault folder of .md files
  - Reconstruct folder hierarchy from `note.sourcePath`
  - Serialize frontmatter + markdown content
  - Copy attachments to vault's attachment folder
  - `npx tsx packages/ewe-note/src/cli/export-vault.ts --room <roomId> --output /path/to/vault`
- [x] Create `packages/ewe-note/src/cli/vault-sync.ts`:
  - Long-running daemon that watches a vault folder + EweserDB room
  - File system → EweserDB: `chokidar` watches `.md` files, on change → parse + update note doc
  - EweserDB → File system: `room.onChange()` → write .md file to disk
  - Conflict resolution: last-write-wins with timestamp comparison (both `_updated` and file `mtime`)
  - Debounce: 500ms debounce on both sides to avoid echo loops
  - Ignore list: skip `.obsidian/`, `.trash/`, `.DS_Store`
  - Graceful shutdown on SIGINT/SIGTERM
  - `npx tsx packages/ewe-note/src/cli/vault-sync.ts --vault /path/to/vault --room <roomId> --auth-url http://localhost:3001`
- [x] Create `packages/ewe-note/src/cli/vault-sync.test.ts`:
  - Test file create → note created in room
  - Test file update → note updated in room
  - Test file delete → note soft-deleted
  - Test note create → file created on disk
  - Test conflict: both sides updated → last-write-wins

#### Files:

- Create: `packages/ewe-note/src/cli/export-vault.ts`
- Create: `packages/ewe-note/src/cli/vault-sync.ts`
- Create: `packages/ewe-note/src/cli/vault-sync.test.ts`

---

### Run 6: Image/Attachment Handling

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Binary file storage in Yjs is non-trivial. Need to decide between base64 in Y.Map, separate attachment collection, or filesystem-backed serving. Cross-references with image embeds.

#### Steps:

- [x] Decide storage strategy:
  - **Option A (recommended for desktop):** Vault folder stays on disk, images served from filesystem. ewe-note resolves `![[image.png]]` to `file:///vault/path/Attachments/image.png` or local HTTP server
  - **Option B (for cloud-synced):** Images stored as base64 or blob in a separate `attachments` room. Adds latency but works without local vault
- [x] Create `packages/ewe-note/src/utils/attachment-resolver.ts`:
  - `resolveAttachment(name: string, vault: VaultConfig)` → URL
  - Searches standard Obsidian attachment paths: root, `Attachments/`, note-relative
  - Returns URL for rendering in BlockNote
- [x] Update image embed extension from Run 3 to use the attachment resolver
- [x] Handle attachment import in the import CLI (copy or index)

#### Files:

- Create: `packages/ewe-note/src/utils/attachment-resolver.ts`
- Modify: `packages/ewe-note/src/extensions/image-embed.ts`
- Modify: `packages/ewe-note/src/cli/import-vault.ts`

---

## Risks

| Risk                                                                                              | Mitigation                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BlockNote extension API stability** — BlockNote v0.23.x extension API may change                | Pin BlockNote version. Wiki-link extension is an inline content type, which is the most stable extension point                                                 |
| **`blocksToMarkdownLossy()` data loss** — Current ewe-note uses lossy conversion                  | New OFM serializer replaces lossy conversion for vault-synced notes. Existing non-vault notes continue using current behavior                                  |
| **Echo loops in bidirectional sync** — File change → EweserDB update → file write → infinite loop | 500ms debounce + content comparison before write. Skip write if content unchanged                                                                              |
| **Large vaults** — Hundreds of notes loading into a single Yjs doc                                | Each note is a separate key in the Y.Map, not the entire vault as one doc. Lazy-load note content. Memory usage is proportional to open notes, not total notes |
| **Cross-vault wiki-links** — `[[vault2/Note]]` linking between vaults                             | Phase 1: links within a vault only. Phase 2: cross-room link resolution with vault prefix syntax                                                               |
| **Obsidian Sync conflicts** — Obsidian and ewe-note both write to the same file simultaneously    | File watcher debounce + mtime comparison. Obsidian Sync preserves both versions on conflict. We adopt last-write-wins which matches Obsidian's own behavior    |
| **Changeset needed** — `@eweser/shared` Note type gets new optional fields                        | Yes — handled in Run 1. Minor version bump. New fields are all optional, no breaking changes                                                                   |
| **OFM syntax edge cases** — Wiki-links inside code blocks, frontmatter with special chars         | Parser must be code-block-aware (skip `[[` inside backticks). Test fixtures cover all edge cases                                                               |

## Execution Summary

```text
Run 0: Test Vault + Syntax Fixtures (Fast)
├── Run 1: Note Schema + OFM Parser (Smart) [Depends on Run 0 for test data]
│   ├── Run 2: Vault Import CLI (Smart) [Depends on Run 1]
│   └── Run 3: BlockNote Extensions P0 - Wiki Links + Highlights (Smart) [Depends on Run 1]
│       └── Run 4: BlockNote Extensions P1 - Callouts + Tags + Frontmatter (Smart) [Depends on Run 3]
├── Run 5: Export + Bidirectional Sync (Smart) [Depends on Runs 1 + 2]
└── Run 6: Image/Attachment Handling (Smart) [Depends on Runs 2 + 3]
```

**Parallelization:** Run 0 is quick and unblocks everything. After Run 1, Runs 2 and 3 can execute in parallel (import CLI is independent of editor extensions). Run 5 depends on having both the schema (Run 1) and import tool (Run 2). Run 6 depends on import (Run 2) and image embed extension (Run 3).

**Quick win path:** Runs 0 → 1 → 2 gets the user's notes imported and visible in ewe-note (with standard markdown rendering) within the first session. Runs 3-4 add OFM rendering polish. Run 5 adds ongoing sync. Run 6 handles images.

## Status

- [x] Approved by user
- [x] Completed (all runs 0–6 implemented, all tests pass)
