# Plan: EweNote Obsidian Editor Parity

## Goal

Bring EweNote's active TipTap editor and note-workflow surfaces to a credible Obsidian-parity baseline for local-first Markdown notes, with lossless Obsidian Flavored Markdown round-trip as the first non-negotiable requirement.

## Scope

- In:
  - `packages/ewe-note` editor, parser, serializer, note context, right panel, command/menu surfaces, import/export CLI helpers, and EweNote docs/checklists.
  - Obsidian-style Markdown editing for headings H1-H6, paragraph/body, quote, bold, italic, strikethrough, highlight, inline code, code blocks, horizontal rules, bullet lists, ordered lists, task lists, tables, links, wiki links, aliases, embeds, callouts, comments, footnotes, tags, properties/frontmatter, Mermaid code blocks, and math syntax.
  - Editor command access through toolbar, selection bubble menu, right-click context menu, slash commands, keyboard shortcuts where expected, and app command palette integration where useful.
  - Link/backlink/outgoing-link behavior inside the editor and right panel, including alias resolution and unlinked mention basics.
  - Local-first persistence through existing `@eweser/db` note documents, current TipTap/Yjs fragment wiring, and canonical markdown text.
  - Regression tests and manual test handoffs based on Obsidian parity fixtures.
- Out:
  - Full Obsidian plugin ecosystem compatibility.
  - Obsidian Sync compatibility beyond import/export/vault-sync semantics already present in EweNote.
  - Full Canvas and Bases implementation. This plan may reserve syntax and import/export behavior for `.canvas` or `.base` references, but does not build those products.
  - Graph view beyond any link-index data shape needed by backlinks/outgoing links.
  - Published `@eweser/db`, `@eweser/shared`, or `@eweser/examples-components` API changes unless implementation proves they are unavoidable and the user approves a scope change.
  - Backend auth, PostgreSQL, or sync-server changes.

## Assumptions / Open Questions

- Assumption: "Parity" means Obsidian note authoring and navigation parity for the local-first EweNote product, not reimplementing every Obsidian core and community plugin.
- Assumption: `Note.text` remains the canonical serialized Markdown/OFM body. The TipTap/Yjs `Y.XmlFragment` remains the live collaborative editor state and must be reseeded or reconciled from `Note.text` without silent user-data loss.
- Assumption: EweNote is still pre-live enough to choose clean editor internals, but imported or locally created Markdown content must not be silently dropped.
- Assumption: TipTap 2.x remains the editor framework. Direct ProseMirror code is acceptable for schema nodes, input rules, plugin state, decorations, serializers, and Yjs transaction details.
- Assumption: Obsidian-style syntax is the source of truth for portability. Rich editor nodes must serialize back to readable OFM, not only to opaque TipTap JSON.
- Open question: Should EweNote expose a Source Mode that edits raw Markdown directly, or is Live Preview plus lossless hidden serialization enough for this parity phase? The plan below includes Source Mode as a later run because it is the clearest fallback for unsupported syntax.
- Open question: Should comments and footnotes be visible editable nodes in Live Preview, or preserved in Source Mode/hidden decorations until reading mode exists? The plan treats preservation as P0 and rich UI as P2.
- Open question: Should math rendering require a new dependency such as KaTeX/MathJax in this phase, or should math be preserved and displayed as source until a renderer is approved? The plan treats syntax preservation as required and rendered math as a feature run.

## Current Verified State

- Active editor path is TipTap in `packages/ewe-note/src/components/tiptap-editor.tsx`; it currently wires StarterKit, Heading, Link, Highlight, TaskList, TaskItem, Collaboration, and CollaborationCursor.
- Current toolbar exposes H1-H3, bold, italic, inline code, bullet list, numbered list, and task list only.
- Current editor click handling prevents default `wiki://` link behavior but does not navigate to the target note.
- Current OFM bridge in `packages/ewe-note/src/extensions/ofm-serializer.ts` strips `%% comments %%` and converts note embeds to a placeholder blockquote, which is data loss for Obsidian parity.
- Current `packages/ewe-note/src/editor/markdown.ts` serializes only paragraphs, headings, blockquote, bullet lists, ordered lists, task lists, code blocks, and horizontal rules. Unsupported rich nodes fall through to inline text or empty output.
- Current `packages/ewe-note/src/app/contexts/NotesContext.tsx` has a basic link index, backlink map, task extraction regex, title derivation, and property/frontmatter conversion.
- Current right panel has Outline, Links, and Meta tabs, but link behavior and unlinked mentions are not Obsidian-complete.
- Current docs/index files still contain stale BlockNote language. Coder should update active docs as part of parity work so future agents do not plan against the wrong editor.
- The working tree is dirty before this plan. Coder must preserve unrelated local changes and not reset existing user work.

## External Facts Checked

- Obsidian basic syntax includes H1-H6 headings, bold, italic, strikethrough, highlight, internal links, external links, images, quotes, nested bullet/ordered/task lists, horizontal rules, inline code, fenced code blocks, footnotes, comments, and escaping rules. Source: https://obsidian.md/help/syntax
- Obsidian callouts are blockquote-based, can contain Markdown, wiki links, and embeds, support custom titles, foldable state, nesting, supported type aliases, and command/context-menu insertion/change flows. Source: https://obsidian.md/help/callouts
- Obsidian slash commands are a core plugin that opens command search by typing `/` in the editor, supports keyboard navigation, Enter activation, Esc/Space dismissal, and fuzzy matching. Source: https://obsidian.md/help/plugins/slash-commands
- Obsidian properties are YAML frontmatter-backed structured fields, can be added through command/hotkey/menu or by typing `---` at the top of a file, and include default `tags`, `cssclasses`, and `aliases`. Source: https://obsidian.md/help/properties
- Obsidian embeds use `![[...]]` for notes, headings, blocks, images, audio, PDFs, PDF page/height fragments, lists by block id, and media dimensions such as `|640x480` or `|100`. Source: https://obsidian.md/help/embeds
- Obsidian advanced syntax includes Markdown tables with table context-menu operations, Mermaid code blocks, and inline/block math notation. Source: https://obsidian.md/help/advanced-syntax
- Obsidian outgoing links show explicit links plus unlinked mentions and allow opening linked notes. Source: https://obsidian.md/help/plugins/outgoing-links
- Obsidian aliases live in properties/frontmatter and alias selection creates interoperable `[[Target|Alias]]` links rather than links to the alias text itself. Source: https://obsidian.md/help/aliases

## Parity Target

This plan defines "Obsidian parity v1" as:

| Area            | Required v1 behavior                                                                                           | Explicitly deferred                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------- |
| Lossless OFM    | Import, edit, save, reload, and export known Obsidian syntax without silent deletion                           | Perfect visual rendering for every syntax on first pass                                                     |
| Editor commands | Obsidian-like access through toolbar, bubble menu, context menu, slash commands, and palette                   | User-customizable hotkey settings                                                                           |
| Links           | `[[Target]]`, `[[Target                                                                                        | Alias]]`, heading/block refs, click navigation, aliases, outgoing links, backlinks, basic unlinked mentions | Full graph view |
| Blocks          | Headings, paragraphs, quotes, lists, tasks, code, tables, callouts, embeds, comments, footnotes, math, Mermaid | Canvas and Bases products                                                                                   |
| Properties      | YAML-backed properties, tags, aliases, visible property editor, source fallback                                | Bulk property editing                                                                                       |
| Modes           | Live Preview plus Source Mode fallback for unsupported or precise Markdown edits                               | Full Obsidian Reading View polish                                                                           |
| Local-first     | Works signed out, syncs when provider exists, keeps Yjs collaboration stable                                   | Backend sync/auth changes                                                                                   |

## Runs

## Run Order And Manual Test Handoffs

Run order: mostly sequential. Runs 1-3 establish the data contract and must happen first. Runs 4-7 can be split after Run 3 if write scopes are disjoint. Runs 8-10 should happen after the feature slices are in place.

After each completed run, Coder must update the Execution Summary and add a manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Parity Contract, Fixture Matrix, And Data-Loss Gate

- **Id**: `run-1`
- **Title**: `Parity Contract, Fixture Matrix, And Data-Loss Gate`
- **Deliverable**:
  - A machine-testable Obsidian parity fixture matrix and a documented no-data-loss contract for Markdown/OFM round trips.
- **Files**:
  - `docs/ai/plans/2026-05-02-obsidian-editor-parity.md`: update execution notes if implementation discovers contract changes.
  - `packages/ewe-note/test-fixtures/obsidian-parity/`: create fixture notes covering basic syntax, callouts, links, embeds, properties, tables, math, comments, and footnotes.
  - `packages/ewe-note/src/editor/markdown.test.ts`: expand round-trip coverage around the fixture matrix.
  - `packages/ewe-note/src/cli/import-vault.test.ts`: add import/export expectations for the same fixtures where CLI behavior applies.
  - `packages/ewe-note/src/cli/export-vault.ts`: inspect only unless fixture failures prove export behavior must change in later runs.
- **Steps**:
  - [ ] Create an explicit fixture list for all v1 parity syntax, including at least one combined "real note" fixture.
  - [ ] Add a helper test that loads each fixture, imports/parses to editor-compatible state, serializes back, and compares normalized OFM.
  - [ ] Define normalization rules that are acceptable, such as trailing whitespace normalization, while treating comment removal, note-embed replacement, lost dimensions, lost table cells, and lost footnotes as failures.
  - [ ] Mark unsupported but preserved syntax as "opaque preserved" rather than "rendered." Source Mode can expose exact text until rich rendering exists.
  - [ ] Record the no-data-loss contract in comments/docs near the parser tests.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts src/cli/import-vault.test.ts`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Failing tests are acceptable at the start of the run only if they are committed after implementation as passing acceptance tests.
- **Manual test handoff**:
  - Not needed: this is fixture and contract infrastructure.
- **Dependencies**:
  - None.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 2: Lossless OFM Token Model And Parser/Serializer Refactor

- **Id**: `run-2`
- **Title**: `Lossless OFM Token Model And Parser/Serializer Refactor`
- **Deliverable**:
  - The editor bridge no longer deletes or permanently rewrites Obsidian-only syntax. Comments, embeds, frontmatter, footnotes, unsupported HTML, and custom blocks survive edit/save/reload/export.
- **Files**:
  - `packages/ewe-note/src/extensions/ofm-serializer.ts`: replace lossy regex transforms with a token-aware bridge that preserves unsupported source spans.
  - `packages/ewe-note/src/editor/markdown.ts`: split parse, editor HTML/state conversion, and OFM serialization into testable units.
  - `packages/ewe-note/src/editor/ofm-tokens.ts`: create if useful for comments, embeds, footnotes, and opaque blocks.
  - `packages/ewe-note/src/extensions/image-embed.ts`: preserve dimensions, heading/block fragments, alt/alias text, and path information.
  - `packages/ewe-note/src/editor/markdown.test.ts`: add regression tests for the four review findings.
- **Steps**:
  - [ ] Replace comment stripping with preservation. If comments are not rendered in Live Preview, represent them as hidden/opaque nodes or source spans that round-trip exactly.
  - [ ] Replace note-embed placeholder conversion with a preserved embed representation that can later render as an embed card.
  - [ ] Preserve image/audio/PDF embed target, dimensions, page, height, heading, and block fragments.
  - [ ] Preserve footnote definitions and inline footnotes even if Live Preview initially shows source text.
  - [ ] Preserve raw HTML and unknown fenced code blocks unless explicitly unsafe to render; do not silently drop them.
  - [ ] Add tests proving `editorJsonToMarkdown(markdownToEditorState(source))` does not lose the fixture content.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts`
  - `npm run test --workspace @eweser/ewe-note -- --run src/cli/import-vault.test.ts src/cli/vault-sync.test.ts`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Manually import a fixture note containing comments, embeds, and footnotes; edit unrelated text; export; verify the untouched syntax remains.
- **Manual test handoff**:
  - Tester should use one fixture note with comments, note embeds, image dimensions, footnotes, and HTML; edit a normal paragraph; reload and export; compare original preserved syntax.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 3: Editor Command Registry And Menu Architecture

- **Id**: `run-3`
- **Title**: `Editor Command Registry And Menu Architecture`
- **Deliverable**:
  - A single editor command registry powers toolbar buttons, bubble menu items, context menu items, slash commands, and command palette entries.
- **Files**:
  - `packages/ewe-note/src/editor/commands.ts`: create command registry with command id, label, icon, active predicate, enabled predicate, execution, shortcut label, and menu placement.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: replace hardcoded toolbar-only controls with registry-driven controls.
  - `packages/ewe-note/src/components/editor-toolbar.tsx`: create if useful to isolate toolbar rendering.
  - `packages/ewe-note/src/components/editor-context-menu.tsx`: create right-click menu using existing Radix context-menu primitives.
  - `packages/ewe-note/src/components/editor-bubble-menu.tsx`: create selection menu using TipTap `BubbleMenu`.
  - `packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx`: integrate editor-scoped commands only when editor focus/context is available.
  - `packages/ewe-note/src/index.css`: style menus without breaking mobile or dark mode.
- **Steps**:
  - [ ] Define commands for H1-H6, paragraph/body, quote, bullet list, numbered list, task list, bold, italic, strikethrough, highlight, inline code, code block, horizontal rule, link, external link, clear formatting, insert callout, insert table, insert embed placeholder, comment, math, and source mode toggle.
  - [ ] Keep command execution in one place so slash/context/toolbar behavior cannot drift.
  - [ ] Add an Obsidian-like Paragraph submenu matching the screenshots: lists, headings H1-H6, body, quote.
  - [ ] Add an Obsidian-like Format submenu: bold, italic, strikethrough, highlight, code, math, comment, clear formatting.
  - [ ] Add an Insert submenu: link, external link, table, callout, code block, horizontal rule, embed, image.
  - [ ] Add active/disabled states and accessible labels for icon-only controls.
  - [ ] Keep mobile touch targets at least 44px where menus are touch reachable.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Manual browser smoke: select text and verify bubble menu; right-click selected text and verify context menu; use toolbar commands and check serialized Markdown after reload.
- **Manual test handoff**:
  - Tester should compare the right-click menus against the provided Obsidian screenshots and record missing commands or unusable keyboard/touch paths.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Slash Commands And Markdown Input Rules

- **Id**: `run-4`
- **Title**: `Slash Commands And Markdown Input Rules`
- **Deliverable**:
  - Typing `/` in the editor opens an Obsidian-like fuzzy command picker, and common Markdown triggers become structured editor nodes without breaking source fidelity.
- **Files**:
  - `packages/ewe-note/src/editor/slash-commands.ts`: create TipTap Suggestion or ProseMirror plugin integration.
  - `packages/ewe-note/src/components/editor-slash-menu.tsx`: create menu UI.
  - `packages/ewe-note/src/editor/input-rules.ts`: create or extend input/paste rules.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: register slash/input-rule extensions.
  - `packages/ewe-note/src/editor/markdown.test.ts`: add command/input-rule serialization tests where possible.
- **Steps**:
  - [ ] Implement slash menu opening after `/` at line start or after blank space, with fuzzy matching, arrow navigation, Enter activation, Esc/Space dismissal.
  - [ ] Source the slash command list from the Run 3 registry.
  - [ ] Add input rules for `#` through `######`, `>`, `-`, `1.`, `- [ ]`, `- [x]`, ` ``` `, `---`, `==highlight==`, `[[wiki]]`, `![[embed]]`, `> [!type]`, and table starter if practical.
  - [ ] Add paste rules for wiki links, highlights, and common Obsidian embeds.
  - [ ] Ensure slash trigger text is removed only after a command succeeds.
  - [ ] Verify IME/composition does not corrupt editor input.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note`
  - Add focused tests for input-rule helpers if TipTap plugin behavior is hard to unit test.
- **Verification**:
  - Manual browser smoke: type slash commands and Markdown shortcuts into an empty note, reload, and inspect Markdown output.
- **Manual test handoff**:
  - Tester should type `/h2`, `/task`, `/callout`, `/table`, `/code`, and `/math`, then verify each command creates the expected editable content.
- **Dependencies**:
  - `run-3`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Links, Aliases, Backlinks, Outgoing Links, And Unlinked Mentions

- **Id**: `run-5`
- **Title**: `Links, Aliases, Backlinks, Outgoing Links, And Unlinked Mentions`
- **Deliverable**:
  - Wiki links work like a note-taking product: users can create, click, resolve, navigate, inspect backlinks/outgoing links, and discover basic unlinked mentions.
- **Files**:
  - `packages/ewe-note/src/extensions/wiki-link.ts`: implement or replace helper with TipTap mark/node behavior and resolver utilities.
  - `packages/ewe-note/src/app/contexts/note-links.ts`: expand extraction for aliases, heading refs, block refs, unresolved links, and unlinked mention candidates.
  - `packages/ewe-note/src/app/contexts/note-links.test.ts`: add coverage for aliases, case, headings, and unresolved links.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: expose link index and resolver actions needed by editor/right panel.
  - `packages/ewe-note/src/app/components/RightPanel.tsx`: split links, backlinks, unresolved links, and unlinked mentions into useful sections.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: navigate or open link popover on wiki-link click.
  - `packages/ewe-note/src/components/wiki-link-popover.tsx`: create if useful for open/create/rename actions.
- **Steps**:
  - [ ] Resolve note title and aliases from frontmatter/properties into a normalized index.
  - [ ] On wiki-link click, navigate to existing target or offer create-new-note for unresolved target.
  - [ ] Support `[[Target#Heading]]`, `[[Target#^block]]`, `[[Target|Alias]]`, and alias-created `[[Target|Alias]]`.
  - [ ] Keep outgoing links and backlinks stable across note rename/title changes.
  - [ ] Add basic unlinked mention detection outside code blocks.
  - [ ] Add right-panel actions to convert unlinked mentions into links.
  - [ ] Avoid O(n\*m) scans becoming visible for large vaults; memoize or index by normalized token where practical.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/app/contexts/note-links.test.ts`
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Manual browser smoke: create two notes, add alias in properties, link by alias, click link, inspect backlinks/outgoing links/unlinked mentions.
- **Manual test handoff**:
  - Tester should create "Artificial Intelligence" with alias "AI", link another note using AI, verify serialized `[[Artificial Intelligence|AI]]`, navigation, backlinks, and unlinked mentions.
- **Dependencies**:
  - `run-2`; can run after `run-3` in parallel with Runs 6 and 7 if write scopes stay disjoint.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 6: Callouts, Quotes, Embeds, Media, And Attachments

- **Id**: `run-6`
- **Title**: `Callouts, Quotes, Embeds, Media, And Attachments`
- **Deliverable**:
  - Obsidian callouts and embeds are first-class editable content with lossless serialization and useful Live Preview rendering.
- **Files**:
  - `packages/ewe-note/src/extensions/callout.ts`: convert helper into TipTap node or ProseMirror plugin with type/title/folded attributes.
  - `packages/ewe-note/src/extensions/image-embed.ts`: implement editor node/serializer behavior for image/media/PDF embeds.
  - `packages/ewe-note/src/components/callout-node-view.tsx`: create if using React node views.
  - `packages/ewe-note/src/components/embed-node-view.tsx`: create if using React node views.
  - `packages/ewe-note/src/utils/attachment-resolver.ts`: preserve browser-safe resolution and avoid Node imports in browser bundles.
  - `packages/ewe-note/src/editor/markdown.ts`: parse/serialize callouts and embeds.
  - `packages/ewe-note/src/index.css`: callout and embed styles.
- **Steps**:
  - [ ] Implement blockquote quote command separately from callout command.
  - [ ] Parse `> [!type]`, custom title, foldable `+`/`-`, aliases, and nested callout content.
  - [ ] Preserve unsupported/custom callout types rather than coercing them to `note` in serialized source.
  - [ ] Add node view affordance for changing callout type/title/folded state.
  - [ ] Implement image embeds with dimensions and attachment resolver support.
  - [ ] Preserve note, heading, block, audio, PDF, PDF page, and PDF height embeds even if some render as placeholder cards.
  - [ ] Keep drag/drop or paste attachment support out of scope unless a minimal implementation is cheap and isolated.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts src/cli/import-vault.test.ts`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Manual browser smoke: insert callout, nested callout, image embed with width, note embed placeholder; reload/export and compare source.
- **Manual test handoff**:
  - Tester should create one note with all supported callout aliases and one note with image/PDF/note embeds; verify rendering, editability, and exported Markdown.
- **Dependencies**:
  - `run-2`; can run in parallel with Run 5 after Run 3 if files are coordinated.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 7: Tables, Code Blocks, Mermaid, Math, Comments, And Footnotes

- **Id**: `run-7`
- **Title**: `Tables, Code Blocks, Mermaid, Math, Comments, And Footnotes`
- **Deliverable**:
  - Advanced Obsidian syntax is editable, preserved, and rendered where practical.
- **Files**:
  - `packages/ewe-note/package.json`: add approved TipTap extensions or renderer deps only if needed.
  - `packages/ewe-note/src/editor/markdown.ts`: table, math, Mermaid, comment, and footnote parse/serialize support.
  - `packages/ewe-note/src/extensions/table.ts`: create if TipTap table behavior needs local configuration.
  - `packages/ewe-note/src/extensions/math.ts`: create if math rendering/editing is implemented.
  - `packages/ewe-note/src/extensions/comment.ts`: create if comments become editable marks/nodes.
  - `packages/ewe-note/src/extensions/footnote.ts`: create if footnotes become first-class nodes.
  - `packages/ewe-note/src/components/table-controls.tsx`: create table context-menu controls if table extension is implemented.
  - `packages/ewe-note/src/index.css`: table, code, Mermaid, math, comments, and footnote styles.
- **Steps**:
  - [ ] Add table parsing/serialization and insert-table command; table cells may use plain inline content in v1.
  - [ ] Add table context menu actions for insert/delete row/column if using TipTap table extension.
  - [ ] Preserve fenced code info strings and support `mermaid` as a rendered or previewable code block.
  - [ ] Preserve inline `$...$` and block `$$...$$` math; render only if dependency and sanitization are approved.
  - [ ] Preserve `%% inline %%` and block comments, visible in edit/source mode according to the Run 2 contract.
  - [ ] Preserve footnote refs, definitions, and inline footnotes; expose basic navigation in preview if practical.
  - [ ] Add tests for tables containing escaped pipes and wiki links.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts`
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
- **Verification**:
  - Manual browser smoke: insert/edit table, code block, Mermaid block, math, comment, and footnote; reload/export.
- **Manual test handoff**:
  - Tester should verify each advanced syntax fixture remains readable and exported Markdown can be opened in Obsidian without obvious corruption.
- **Dependencies**:
  - `run-2`; table UI depends on `run-3` for menu commands.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 8: Properties, Tags, Aliases, Source Mode, And Title Contract

- **Id**: `run-8`
- **Title**: `Properties, Tags, Aliases, Source Mode, And Title Contract`
- **Deliverable**:
  - Properties/frontmatter behave like a portable YAML-backed note model, with Source Mode available for precise Markdown edits and title behavior made explicit.
- **Files**:
  - `packages/ewe-note/src/components/frontmatter-editor.tsx`: replace prompt-based add flow with inline property rows and typed values.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: align `frontmatter`, `tags`, `aliases`, title derivation, search, and property serialization.
  - `packages/ewe-note/src/components/source-mode-editor.tsx`: create raw Markdown editor fallback if approved.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: add Live Preview/Source Mode switching boundary.
  - `packages/ewe-note/src/editor/frontmatter.ts`: create parser/serializer helpers if useful.
  - `packages/ewe-note/src/editor/markdown.test.ts`: add frontmatter round-trip coverage.
- **Steps**:
  - [ ] Define final title contract: frontmatter title vs first H1 vs header field. Update UI copy/behavior so there is no split-brain title.
  - [ ] Treat `tags`, `aliases`, and `cssclasses` as first-class properties.
  - [ ] Add property add/edit/delete without browser `prompt`.
  - [ ] Preserve property types for string, number, boolean, date, date-time, list, links, and empty/null values.
  - [ ] Implement Source Mode or a raw Markdown fallback for exact editing of unsupported syntax and frontmatter.
  - [ ] Ensure Source Mode writes through the same no-data-loss serializer path and updates the TipTap fragment safely on switch back.
  - [ ] Keep local-first behavior while signed out.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Manual browser smoke: add aliases/tags/properties, switch modes, reload, search by property/tag, link by alias.
- **Manual test handoff**:
  - Tester should create a note with YAML properties in Source Mode, switch to Live Preview, edit a property in the UI, export, and compare YAML.
- **Dependencies**:
  - Runs 2 and 5.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 9: Reading/Preview Polish, Accessibility, And Mobile Editor UX

- **Id**: `run-9`
- **Title**: `Reading/Preview Polish, Accessibility, And Mobile Editor UX`
- **Deliverable**:
  - The parity features are usable on desktop and mobile, keyboard reachable, and visually stable in dark/light themes.
- **Files**:
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: focus, mode, and command integration refinements.
  - `packages/ewe-note/src/components/editor-toolbar.tsx`: responsive toolbar behavior.
  - `packages/ewe-note/src/components/editor-context-menu.tsx`: keyboard and touch affordances.
  - `packages/ewe-note/src/components/editor-bubble-menu.tsx`: selection and accessibility behavior.
  - `packages/ewe-note/src/index.css`: responsive editor layout, table overflow, embed sizing, focus states.
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`: update editor expectations from BlockNote to TipTap/Obsidian parity.
- **Steps**:
  - [ ] Add visible focus states and ARIA labels for all editor command buttons/menu items.
  - [ ] Ensure right-click menus and slash menus are keyboard navigable and Escape-safe.
  - [ ] Ensure toolbar/menu controls wrap or collapse on narrow screens without covering the editor.
  - [ ] Ensure tables and embeds do not cause horizontal page scroll on mobile.
  - [ ] Add mode/status affordance if Source Mode is implemented.
  - [ ] Update checklist sections that still refer to BlockNote.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
- **Verification**:
  - Manual browser smoke at desktop and mobile widths, including keyboard-only command/menu usage.
- **Manual test handoff**:
  - Tester should run sections 2, 3, 7, 9, 10, 11, 12, 16, and 17 of the updated checklist.
- **Dependencies**:
  - Runs 3-8.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 10: Import/Export/Vault Sync Parity And Obsidian Round-Trip Audit

- **Id**: `run-10`
- **Title**: `Import/Export/Vault Sync Parity And Obsidian Round-Trip Audit`
- **Deliverable**:
  - Obsidian fixture vaults import into EweNote, survive editing, export back to Markdown, and remain usable in Obsidian.
- **Files**:
  - `packages/ewe-note/src/cli/import-vault.ts`: align import manifest with new parser/serializer contract.
  - `packages/ewe-note/src/cli/export-vault.ts`: export exact OFM syntax where possible.
  - `packages/ewe-note/src/cli/vault-sync.ts`: preserve source path, attachments, and sync metadata under the new parity model.
  - `packages/ewe-note/src/cli/import-vault.test.ts`: add fixture-vault parity tests.
  - `packages/ewe-note/src/cli/vault-sync.test.ts`: add sync preservation tests.
  - `packages/ewe-note/test-fixtures/obsidian-parity/`: add fixture vault readme and expected outputs.
- **Steps**:
  - [ ] Run the parity fixture vault through import, edit simulation, export, and normalized diff.
  - [ ] Ensure attachment refs, source paths, aliases, tags, properties, links, embeds, comments, and footnotes survive.
  - [ ] Ensure EweNote-specific metadata does not pollute exported Obsidian Markdown unless explicitly documented.
  - [ ] Add a documented manual Obsidian open-check procedure for exported fixture vaults.
  - [ ] If an actual Obsidian app manual check is not available, document that gap and rely on source-format fixtures.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/cli/import-vault.test.ts src/cli/vault-sync.test.ts`
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
- **Verification**:
  - Manual export inspection and, if available, open exported fixture vault in Obsidian and verify visible notes.
- **Manual test handoff**:
  - Tester should import fixture vault, edit one normal paragraph, export, and inspect/open the exported vault in Obsidian.
- **Dependencies**:
  - Runs 1-8.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 11: E2E Coverage, Browser QA, And Documentation Cleanup

- **Id**: `run-11`
- **Title**: `E2E Coverage, Browser QA, And Documentation Cleanup`
- **Deliverable**:
  - Parity behavior has browser/E2E coverage, current docs describe TipTap/Obsidian parity accurately, and stale BlockNote references are removed or explicitly historical.
- **Files**:
  - `e2e/cypress/tests/ewe-note.cy.ts`: add or update editor parity smoke flows if local app setup supports it.
  - `packages/ewe-note/README.md`: update current editor and Obsidian parity notes.
  - `packages/ewe-note/INDEX.md`: update stale BlockNote labels.
  - `packages/ewe-note/src/INDEX.md`: update stale BlockNote labels.
  - `packages/ewe-note/src/components/INDEX.md`: update stale BlockNote labels and point to TipTap files.
  - `packages/ewe-note/src/extensions/INDEX.md`: update extension ownership from BlockNote-specific to TipTap/OFM.
  - `README.md` and `ARCHITECTURE.md`: update editor stack if this branch is the canonical TipTap path.
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`: final tester checklist.
- **Steps**:
  - [ ] Add Cypress or Playwright smoke coverage for create note, edit, slash command, context menu command, wiki link navigation, task extraction, property edit, and export if feasible.
  - [ ] Add browser smoke instructions for features that are difficult to automate.
  - [ ] Update docs/indexes to remove stale "BlockNote current editor" language from current-state docs.
  - [ ] Keep historical docs under `docs/ai/` as historical unless directly referenced by active workflow.
  - [ ] Run lint/type/test/build and document any skipped checks with exact reasons.
- **Tests**:
  - `npm run lint --workspace @eweser/ewe-note`
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
  - `npm run test:e2e` when local services and auth assumptions are available.
- **Verification**:
  - Manual browser pass against the final checklist and exported fixture vault.
- **Manual test handoff**:
  - Tester should run the final checklist and include screenshots for editor menus, slash menu, links/backlinks, callouts, properties, source mode, and export.
- **Dependencies**:
  - Runs 1-10.
- **Model tier**: `coder`
- **Risk level**: `medium`

## Stop Conditions

Stop and ask for user approval if:

- Implementation requires changing published `@eweser/db`, `@eweser/shared`, or `@eweser/examples-components` APIs.
- Implementation requires backend auth, sync-server, PostgreSQL, or migration changes.
- TipTap 2.x cannot represent a required parity feature without adopting TipTap 3, TipTap Pro, a new editor framework, or direct full-ProseMirror ownership.
- A proposed dependency materially increases bundle size, adds a restrictive license, or renders untrusted content without a clear sanitization boundary.
- Existing user/prototype notes contain data that cannot be migrated or preserved inside this plan's model.
- Source Mode conflicts with Yjs collaboration in a way that risks data loss.
- Verification exposes a content-loss case not covered by the approved fixture matrix.
- Required secrets, auth accounts, local services, or the Obsidian desktop app block verification.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above inside `packages/ewe-note`, update EweNote docs/checklists, add focused TipTap/ProseMirror/editor dependencies after license and bundle review, write/update tests and fixtures, run relevant verification, perform internal QA, fix issues found inside this boundary, and update this plan's execution summary and manual-test handoffs.

Approval does not authorize unrelated app-shell redesign, full Canvas/Bases/Graph implementation, backend/auth/schema changes, published package API changes, destructive git operations, direct pushes to `main`, secret handling, migration deletion, TipTap 3 adoption, TipTap Pro dependencies, or replacing TipTap with another editor without separate approval.

## Execution Summary

| Run      | Status      | Files Changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Verification                                                                                                                                                                                                                           | Notes                                                                                                                                                                          |
| -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `run-1`  | Completed   | `packages/ewe-note/src/editor/markdown.test.ts`, `packages/ewe-note/src/cli/import-vault.test.ts`, `packages/ewe-note/test-fixtures/obsidian-parity/*`                                                                                                                                                                                                                                                                                                                                                 | `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts src/cli/import-vault.test.ts`, `npm run type-check --workspace @eweser/ewe-note`                                                                       | Added first parity fixture matrix (5 notes), helper contract tests, and import contract assertions for comments/embeds/footnotes/table/math paths.                             |
| `run-2`  | Completed   | `packages/ewe-note/src/extensions/ofm-serializer.ts`, `packages/ewe-note/src/editor/markdown.test.ts`, `packages/ewe-note/test-fixtures/obsidian-parity/matrix.json`                                                                                                                                                                                                                                                                                                                                   | `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts src/cli/import-vault.test.ts`, `npm run type-check --workspace @eweser/ewe-note`                                                                       | Preserved comments and non-media note-embeds, added reversible media-embed metadata, and aligned parity fixture expectations for aliased heading embeds.                       |
| `run-3`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                        |                                                                                                                                                                                |
| `run-4`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                        |                                                                                                                                                                                |
| `run-5`  | Completed   | `packages/ewe-note/src/app/contexts/note-links.ts`, `packages/ewe-note/src/app/contexts/note-links.test.ts`, `packages/ewe-note/src/app/contexts/NotesContext.tsx`, `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`, `packages/ewe-note/src/app/components/RightPanel.tsx`, `packages/ewe-note/src/components/tiptap-editor.tsx`, `packages/ewe-note/src/components/editor-bubble-menu.tsx`, `packages/ewe-note/src/components/editor-toolbar.tsx`, `packages/ewe-note/src/editor/input-rules.ts` | `npm run test --workspace @eweser/ewe-note -- --run src/app/contexts/note-links.test.ts`, `npm run type-check --workspace @eweser/ewe-note`, `npm run test --workspace @eweser/ewe-note`, `npm run build --workspace @eweser/ewe-note` | Added wiki-link parser alias/heading/block handling, link resolution + navigation, backlink/unlinked-mention extraction and conversion flow, and fixed type-check regressions. |
| `run-6`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                        |                                                                                                                                                                                |
| `run-7`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                        |                                                                                                                                                                                |
| `run-8`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                        |                                                                                                                                                                                |
| `run-9`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                        |                                                                                                                                                                                |
| `run-10` | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                        |                                                                                                                                                                                |
| `run-11` | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                        |                                                                                                                                                                                |

## Self-Reflection / Instruction Improvements

- None yet.
