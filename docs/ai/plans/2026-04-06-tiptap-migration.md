# Plan: EweNote Editor Migration With TipTap And ProseMirror Escape Hatches

## Goal

Replace BlockNote in EweNote with a TipTap 2.x editor layer that preserves local-first note persistence, supports EweserDB/Yjs collaboration, and fixes the editor/title/task/OFM failures exposed by UX testing while using direct ProseMirror primitives only where TipTap's abstraction is not enough.

## Scope

- In:
  - `packages/ewe-note` editor layer.
  - TipTap 2.x React editor, extensions, commands, input/paste rules, keyboard behavior, and node/mark views.
  - Direct ProseMirror APIs for schema constraints, plugin state, transaction metadata, `Y.XmlFragment` binding details, Markdown/OFM parser and serializer fidelity, and heading/block-position navigation.
  - Yjs collaboration through TipTap's collaboration extensions backed by `y-prosemirror` and the existing room/provider lifecycle.
  - Migration or reseeding bridge from existing note markdown/BlockNote fragments into the new TipTap/ProseMirror document model.
  - Editor-owned acceptance checks for title/body consistency, markdown task persistence, outline anchors, wiki links, backlinks, and export fidelity.
- Out:
  - Broad EweNote app-shell UX polish such as mobile sidebar, settings redesign, folder dialog, command palette, and PWA manifest fixes. Those belong in `docs/ai/plans/2026-05-01-ewe-note-ux-feature-completion.md`.
  - Graph view.
  - Packages outside `packages/ewe-note` unless implementation proves a shared type or SDK boundary change is required.
  - Published package API changes.

## Assumptions / Open Questions

- Assumption: TipTap 2.x is the default abstraction because no verified EweNote requirement is blocked by TipTap, and it removes substantial React editor lifecycle, command, node-view, input-rule, and collaboration wiring work compared with direct ProseMirror.
- Assumption: EweNote still needs ProseMirror fluency. The migration must treat TipTap as a ProseMirror framework, not as a complete product editor.
- Assumption: EweNote is pre-live enough that a clean editor document model is preferable to preserving every prototype artifact, but the migration must avoid silent data loss for notes stored in EweserDB markdown strings.
- Assumption: Current user-facing notes are primarily persisted as markdown text in EweserDB documents; BlockNote/Yjs fragments may exist and must be inspected before implementation chooses a migration path.
- Resolved on 2026-05-25 grill: the canonical title model is an explicit title
  field in note metadata/frontmatter. Import may seed it from first H1 or
  filename, but later body H1 changes must not silently overwrite the canonical
  title.
- Resolved on 2026-05-25 grill: migrate existing prototype notes by reseeding
  TipTap/ProseMirror documents from persisted Markdown/frontmatter. Old
  BlockNote/Yjs fragments are manual recovery evidence only unless an
  implementation probe proves Markdown is insufficient.
- Resolved on 2026-05-25 grill: this migration is not a dogfood or launch
  blocker unless the current editor fails the required production import/edit
  proof.

## Prior Research Re-Read

`docs/ai/research/2026-04-06-editor-reference-sweep.md` recommended "TipTap 2.x directly" after comparing BlockNote, Notesnook/TipTap, Noteriv/CodeMirror, AFFiNE/BlockSuite, and SiYuan/custom contenteditable. Its core reasoning still holds:

- BlockNote is the wrong layer for OFM fidelity because EweNote is already compensating with lossy pre/post string transforms.
- TipTap gives direct access to ProseMirror's schema, extensions, node views, input rules, commands, and Yjs collaboration stack without making EweNote own a full editor framework.
- Direct ProseMirror gives maximum control but also forces EweNote to build its own React integration, extension conventions, menus, lifecycle boundaries, commands, selection UX, and collaboration wiring.
- The April research already called out places where TipTap still requires ProseMirror-level work: custom wiki-link/callout/frontmatter nodes or marks, Markdown tokenizer/serializer code, Yjs fragment migration, duplicate ProseMirror dependency checks, and disabling TipTap history when Yjs collaboration owns undo.

The current plan had drifted too far toward direct ProseMirror. That direct approach is not supported by a concrete blocker in TipTap.

## Verified Current Failures

- `packages/ewe-note/src/components/editor.tsx` uses BlockNote, saves via `blocksToMarkdownLossy()` for normal notes, and uses `blocksToOfm()` only for vault notes. This creates separate editor-state and markdown-state paths.
- `packages/ewe-note/src/components/editor.tsx` binds collaboration to `doc.getXmlFragment(selectedNoteId)`, but the app also persists note text separately through `updateNoteText()`. Migration must define which source is canonical during seed, collaboration, save, and reload.
- `packages/ewe-note/src/app/contexts/NotesContext.tsx` derives display title from `frontmatter.title`, first markdown H1, then plaintext. `packages/ewe-note/src/app/pages/EnhancedEditor.tsx` edits the header title as frontmatter. This explains title/body split and stale preview behavior.
- `packages/ewe-note/src/app/contexts/NotesContext.tsx` extracts tasks with a markdown regex. If the editor serializes task items differently or lossy, the Tasks view becomes stale or wrong.
- `packages/ewe-note/src/extensions/ofm-serializer.ts` converts wiki links to `wiki://` markdown links, converts image embeds to `vault://`, strips comments, and converts highlights to bold. Highlight round-trip is explicitly lossy.
- `packages/ewe-note/src/extensions/wiki-link.ts`, `callout.ts`, and `highlight.ts` are helper/parsing modules, not real editor schema extensions. BlockNote v0.23 is the limiting abstraction here.
- `packages/ewe-note/src/app/components/RightPanel.tsx` extracts headings from persisted markdown and renders outline buttons without navigation behavior. The editor migration must expose stable heading positions or anchors.
- `packages/ewe-note/src/app/contexts/NotesContext.tsx` computes backlinks from markdown wiki-link text and aliases. The editor must serialize canonical `[[Name]]` / `[[Name|Alias]]` syntax so this index remains reliable.
- `packages/ewe-note/src/cli/import-vault.ts` and `export-vault.ts` preserve frontmatter separately from note text. The editor migration must keep that contract or explicitly change it.

## External Facts Checked

- TipTap collaboration supports passing an initialized Yjs document, a field name, or a raw Yjs fragment, and its collaboration extension owns history; StarterKit undo/history must be disabled for collaborative documents. Source: https://tiptap.dev/docs/editor/extensions/functionality/collaboration
- Yjs describes TipTap as a ProseMirror-based editor that integrates Yjs for collaboration. Source: https://docs.yjs.dev/ecosystem/editor-bindings/tiptap2
- `y-prosemirror` maps a `Y.XmlFragment` to ProseMirror state; its GitHub README now notes the main branch is for unstable `@y/prosemirror` / Yjs v14 work and most users should keep using stable `y-prosemirror` with Yjs v13. Source: https://github.com/yjs/y-prosemirror
- `prosemirror-markdown` provides CommonMark schema/parser/serializer primitives and is MIT licensed, but the GitHub repository was archived on 2026-04-01 and moved to `code.haverbeke.berlin`. Source: https://github.com/ProseMirror/prosemirror-markdown
- ProseMirror itself exposes schema, node, mark, DOM parse/serialize, and JSON document primitives; direct use is powerful but lower-level than EweNote needs for the whole editor. Source: https://prosemirror.net/docs/guide/
- Current npm metadata on 2026-05-01: `@tiptap/core` latest is `3.22.5`, with `v2-latest` at `2.27.2`; TipTap packages are MIT. `@tiptap/markdown` has only 3.x releases and no `@tiptap/markdown@2`, so a TipTap 2.x migration must not depend on the current TipTap Markdown extension.
- Current npm metadata on 2026-05-01: `@tiptap/pm@2.27.2` depends on `prosemirror-markdown`, `prosemirror-view`, `prosemirror-state`, `prosemirror-model`, and related ProseMirror packages. Pinning/checking the ProseMirror graph remains necessary.
- Current npm metadata on 2026-05-01: `y-prosemirror@1.3.7` is MIT and peers on Yjs v13, matching the repo's current `yjs` major.

## Decision Table

| Feature                             | TipTap 2.x fit                                                                            | Direct ProseMirror fit                                      | Recommendation                                      | Reason                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Title/body split and stale previews | Clean with app-level canonical title contract plus TipTap update hooks                    | Clean but requires custom editor lifecycle and commands     | TipTap plus direct transaction discipline           | The bug is data-contract drift, not a TipTap limitation.                                  |
| Markdown task serialization         | Native task list/item extensions help editing; custom serializer still required           | Fully custom schema/serializer                              | TipTap plus custom Markdown serializer              | TipTap handles UI/schema enough; OFM fidelity belongs in serializer tests.                |
| OFM round-trip                      | Custom nodes/marks/tokenizers required                                                    | Custom nodes/marks/tokenizers required                      | TipTap plus direct ProseMirror/Markdown parser work | Direct ProseMirror does not remove the hard part; it only removes TipTap conveniences.    |
| Wiki links/backlinks                | Custom inline node/mark and Suggestion UI fit TipTap well                                 | Custom plugin/node/decoration stack                         | TipTap                                              | Backlinks are mostly app indexing over canonical markdown; TipTap does not block them.    |
| Callouts/highlights/frontmatter     | Custom extensions required; highlight has existing extension baseline                     | Custom schema/node views required                           | TipTap plus direct schema/serializer control        | TipTap extensions are the right packaging; ProseMirror primitives still define semantics. |
| Yjs/Hocuspocus collaboration        | Official TipTap collaboration extension backed by `y-prosemirror`                         | Direct `ySyncPlugin`, `yCursorPlugin`, `yUndoPlugin` wiring | TipTap, inspect `y-prosemirror` behavior directly   | Existing provider/fragment lifecycle maps cleanly to TipTap collaboration.                |
| Mobile/PWA editor behavior          | TipTap React editor plus responsive toolbar/menu work                                     | Direct ProseMirror gives no inherent mobile advantage       | TipTap                                              | Mobile issues are shell/toolbar/contenteditable UX, not direct ProseMirror blockers.      |
| Outline heading navigation          | TipTap commands can set selection/scroll; may need ProseMirror positions and plugin state | Full direct access                                          | TipTap plus direct ProseMirror positions            | This is a good escape-hatch case, not a reason to own the whole editor stack.             |
| Dependency/version risk             | Medium: TipTap 3 is latest, but v2-latest exists; Markdown 3-only gotcha                  | Medium: must manually coordinate ProseMirror package graph  | TipTap 2.x pinned to `v2-latest` family             | TipTap centralizes the graph through `@tiptap/pm`; still run duplicate checks.            |
| Long-term maintainability           | Better for React UI and extensions if kept on 2.x intentionally                           | Higher custom maintenance burden                            | TipTap plus escape hatches                          | EweNote needs editor features, not a private editor framework.                            |

## Recommendation

Use TipTap plus direct ProseMirror escape hatches.

Default to TipTap 2.x for the editor shell, React lifecycle, extension packaging, commands, menus, node/mark views, selection commands, task/list editing, and Yjs collaboration. Use direct ProseMirror primitives for the parts that actually require lower-level control:

- schema invariants for OFM nodes/marks, especially callouts, wiki links, embeds, task items, frontmatter representation, and block IDs;
- parser/serializer fixtures using `prosemirror-markdown`, `markdown-it`, or a small dedicated OFM bridge instead of TipTap 3's `@tiptap/markdown`;
- `Y.XmlFragment` migration/reseed behavior, undo boundaries, and transaction metadata;
- heading position/index plugin state for outline navigation;
- duplicate ProseMirror dependency checks and version pinning through `@tiptap/pm`;
- direct ProseMirror debugging when TipTap commands obscure transaction behavior.

Do not choose direct ProseMirror for the full editor unless implementation discovers a concrete TipTap blocker such as impossible schema representation, collaboration corruption caused by TipTap's wrapper, or an extension/transaction limitation that materially risks OFM fidelity more than a direct ProseMirror build would.

## Local Reference Source Checkouts

For source-level implementation help, keep editor library checkouts outside the
`eweser-db` repo so they are never staged or committed. On this Mac, the
reference tree is:

```text
/Users/jacob/eweser/editor-reference-src/
```

Current local references:

| Reference               | Path                                                                   | Version / ref                           | Purpose                                                                                       |
| ----------------------- | ---------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| TipTap                  | `/Users/jacob/eweser/editor-reference-src/tiptap-2.27.2`               | `@tiptap/core@2.27.2`, commit `4b8d4e9` | TipTap 2 extension, React, collaboration, task, suggestion, and command patterns.             |
| BlockNote               | `/Users/jacob/eweser/editor-reference-src/blocknote-0.23.6`            | `v0.23.6`, commit `4a168cb`             | Migration reference for current BlockNote/Yjs behavior. Sparse checkout excludes XL packages. |
| y-prosemirror           | `/Users/jacob/eweser/editor-reference-src/y-prosemirror-1.3.7`         | `v1.3.7`, commit `f89fadd`              | Yjs fragment, cursor, undo, and ProseMirror binding internals.                                |
| prosemirror-markdown    | `/Users/jacob/eweser/editor-reference-src/prosemirror-markdown-1.13.4` | `1.13.4`, commit `d86eff3`              | Markdown parser/serializer source and tests.                                                  |
| prosemirror-model       | `/Users/jacob/eweser/editor-reference-src/prosemirror-model`           | `1.23.0`                                | Schema, node, mark, and document JSON internals.                                              |
| prosemirror-state       | `/Users/jacob/eweser/editor-reference-src/prosemirror-state`           | `1.4.3`                                 | Plugin state, transactions, selections.                                                       |
| prosemirror-view        | `/Users/jacob/eweser/editor-reference-src/prosemirror-view`            | `1.37.0`                                | EditorView, DOM events, decorations, composition behavior.                                    |
| prosemirror-transform   | `/Users/jacob/eweser/editor-reference-src/prosemirror-transform`       | `1.10.2`                                | Steps, mapping, transaction transform behavior.                                               |
| prosemirror-inputrules  | `/Users/jacob/eweser/editor-reference-src/prosemirror-inputrules`      | `1.4.0`                                 | Input rule behavior for markdown-ish shortcuts.                                               |
| prosemirror-schema-list | `/Users/jacob/eweser/editor-reference-src/prosemirror-schema-list`     | `1.4.1`                                 | List and task-list-adjacent schema/commands.                                                  |

Set up the same tree on macOS/Linux from the directory that contains
`eweser-db`:

```bash
mkdir -p editor-reference-src
cd editor-reference-src

git clone --depth 1 --branch '@tiptap/core@2.27.2' https://github.com/ueberdosis/tiptap.git tiptap-2.27.2
git clone --depth 1 --filter=blob:none --sparse --branch v0.23.6 https://github.com/TypeCellOS/BlockNote.git blocknote-0.23.6
git -C blocknote-0.23.6 sparse-checkout set packages/core packages/react packages/shadcn packages/server-util shared docs
git clone --depth 1 --branch v1.3.7 https://github.com/yjs/y-prosemirror.git y-prosemirror-1.3.7
git clone --depth 1 --branch 1.13.4 https://github.com/ProseMirror/prosemirror-markdown.git prosemirror-markdown-1.13.4

git clone --depth 1 --branch 1.23.0 https://github.com/ProseMirror/prosemirror-model.git prosemirror-model
git clone --depth 1 --branch 1.4.3 https://github.com/ProseMirror/prosemirror-state.git prosemirror-state
git clone --depth 1 --branch 1.37.0 https://github.com/ProseMirror/prosemirror-view.git prosemirror-view
git clone --depth 1 --branch 1.10.2 https://github.com/ProseMirror/prosemirror-transform.git prosemirror-transform
git clone --depth 1 --branch 1.4.0 https://github.com/ProseMirror/prosemirror-inputrules.git prosemirror-inputrules
git clone --depth 1 --branch 1.4.1 https://github.com/ProseMirror/prosemirror-schema-list.git prosemirror-schema-list
```

Set up the same tree on Windows PowerShell from the directory that contains
`eweser-db`:

```powershell
New-Item -ItemType Directory -Force editor-reference-src | Out-Null
Set-Location editor-reference-src

git clone --depth 1 --branch '@tiptap/core@2.27.2' https://github.com/ueberdosis/tiptap.git tiptap-2.27.2
git clone --depth 1 --filter=blob:none --sparse --branch v0.23.6 https://github.com/TypeCellOS/BlockNote.git blocknote-0.23.6
git -C blocknote-0.23.6 sparse-checkout set packages/core packages/react packages/shadcn packages/server-util shared docs
git clone --depth 1 --branch v1.3.7 https://github.com/yjs/y-prosemirror.git y-prosemirror-1.3.7
git clone --depth 1 --branch 1.13.4 https://github.com/ProseMirror/prosemirror-markdown.git prosemirror-markdown-1.13.4

git clone --depth 1 --branch 1.23.0 https://github.com/ProseMirror/prosemirror-model.git prosemirror-model
git clone --depth 1 --branch 1.4.3 https://github.com/ProseMirror/prosemirror-state.git prosemirror-state
git clone --depth 1 --branch 1.37.0 https://github.com/ProseMirror/prosemirror-view.git prosemirror-view
git clone --depth 1 --branch 1.10.2 https://github.com/ProseMirror/prosemirror-transform.git prosemirror-transform
git clone --depth 1 --branch 1.4.0 https://github.com/ProseMirror/prosemirror-inputrules.git prosemirror-inputrules
git clone --depth 1 --branch 1.4.1 https://github.com/ProseMirror/prosemirror-schema-list.git prosemirror-schema-list
```

When using these references, Coder should read from the local checkout paths but
must not copy license headers, package internals, or large source chunks into
EweNote. Use them to verify APIs, behavior, and patterns, then implement
EweNote-specific code inside `packages/ewe-note`.

## Implementation Risk Comparison

| Risk area                    | TipTap 2.x                                                                                        | Direct ProseMirror                                 | Conclusion                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| Development time             | Lower: React integration, extension shell, commands, node views, and collaboration wrappers exist | Higher: EweNote owns all editor scaffolding        | TipTap wins unless blocked                |
| Editor correctness           | Good if serialization has fixtures and transaction saves are disciplined                          | Good but more surface for lifecycle/selection bugs | Tie on core model; TipTap less app code   |
| Yjs collaboration complexity | Lower: TipTap collaboration wraps `y-prosemirror`, but history config must be correct             | Higher: direct plugin setup and awareness wiring   | TipTap wins                               |
| Markdown/OFM fidelity        | Requires custom parser/serializer anyway                                                          | Requires custom parser/serializer anyway           | Tie; direct ProseMirror is not a shortcut |
| Dependency/version risk      | Must pin TipTap 2.x and avoid 3.x docs/Markdown assumptions                                       | Must coordinate many ProseMirror packages manually | Slight TipTap edge via `@tiptap/pm`       |
| Long-term maintainability    | Better app-level ergonomics; some dependency drift risk                                           | Maximum control but private framework burden       | TipTap wins                               |
| Debug/customization          | Good if coder understands ProseMirror internals                                                   | Best                                               | Hybrid gives enough control               |

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential. Runs 1-3 are the editor foundation and must land before OFM/backlinks polish. Runs 4-5 can only proceed after Run 3 has stable serialization.

After each completed run, Coder must update the Execution Summary and add a manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Editor Data Contract and Migration Decision

- **Id**: `run-1`
- **Title**: `Editor Data Contract and Migration Decision`
- **Deliverable**:
  - A documented editor data contract for title/body/frontmatter/tasks and a confirmed migration strategy for existing EweNote notes.
- **Files**:
  - `docs/ai/plans/2026-04-06-tiptap-migration.md`: update Execution Summary with the chosen contract.
  - `packages/ewe-note/src/components/editor.tsx`: inspect current BlockNote/Yjs seed/save behavior and replace only in later runs.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: inspect title/task/link derivation and define post-migration expectations.
  - `packages/ewe-note/src/extensions/ofm-serializer.ts`: inspect current BlockNote-dependent serialization.
- **Steps**:
  - [ ] Inspect how current notes persist markdown text, frontmatter, tags, aliases, and BlockNote collaboration fragments.
  - [ ] Decide the canonical title model and document it in the plan execution notes before editor replacement begins.
  - [ ] Define how markdown task checkboxes map to TipTap task/list nodes and back to markdown.
  - [ ] Decide whether existing BlockNote fragments are converted, ignored after markdown reseed, or preserved behind a one-time fallback.
  - [ ] Identify manual migration risks for prototype notes and document any intentional breaking behavior.
- **Tests**:
  - Read-only inspection plus targeted local fixture/probe if needed.
- **Verification**:
  - Confirm a coder can state exactly how an existing note becomes a TipTap/ProseMirror document and how it serializes back to EweserDB markdown.
- **Manual test handoff**:
  - Not needed: this is an implementation contract run.
- **Dependencies**:
  - None.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 2: TipTap 2.x Baseline Editor

- **Id**: `run-2`
- **Title**: `TipTap 2.x Baseline Editor`
- **Deliverable**:
  - BlockNote is replaced by a TipTap 2.x editor that can create, load, edit, save, reload, and export ordinary notes with normal paragraph rhythm and title/body consistency.
- **Files**:
  - `packages/ewe-note/package.json`: remove BlockNote dependencies and add pinned TipTap 2.x/Yjs/markdown dependencies.
  - `packages/ewe-note/src/components/editor.tsx`: replace BlockNote view with TipTap `useEditor`/`EditorContent`.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: create if useful to keep lifecycle isolated.
  - `packages/ewe-note/src/editor/schema.ts`: create only for shared extension/schema constants that need direct ProseMirror semantics.
  - `packages/ewe-note/src/editor/markdown.ts`: parser/serializer bridge for baseline markdown.
  - `packages/ewe-note/src/index.css`: replace BlockNote-specific editor CSS with TipTap/ProseMirror styling.
- **Steps**:
  - [ ] Install TipTap packages pinned to the same 2.x family, starting from `@tiptap/*@2.27.2` unless dependency resolution proves a narrower pin is needed.
  - [ ] Do not install or depend on `@tiptap/markdown`; current package metadata shows Markdown is 3.x-only.
  - [ ] Run `npm ls @tiptap/pm prosemirror-view prosemirror-state prosemirror-model y-prosemirror` after install to check duplicate versions.
  - [ ] Build an editor lifecycle that creates/destroys cleanly when `selectedNoteId` changes.
  - [ ] Use TipTap update/transaction hooks as the single save trigger and debounce markdown serialization to `updateNoteText`.
  - [ ] Seed the editor from persisted note markdown according to Run 1's migration decision.
  - [ ] Ensure header title and editor content do not produce conflicting titles or stale previews.
  - [ ] Remove BlockNote CSS/imports from the active editor path.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run test --workspace @eweser/ewe-note`
- **Verification**:
  - Manual browser smoke: create note, edit title/body, reload editor route, return home, verify title and preview agree.
- **Manual test handoff**:
  - Tester should rerun checklist sections 2, 3, 9, 11, and 12 against the new editor.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 3: Yjs Collaboration, Undo, and Presence

- **Id**: `run-3`
- **Title**: `Yjs Collaboration, Undo, and Presence`
- **Deliverable**:
  - The TipTap editor uses existing EweserDB room/provider state for Yjs sync, shared cursors, and local-client undo/redo without reintroducing BlockNote.
- **Files**:
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: wire `@tiptap/extension-collaboration` and `@tiptap/extension-collaboration-cursor`.
  - `packages/ewe-note/src/editor/yjs.ts`: create helper for fragment names, provider awareness, and migration/reseed behavior if useful.
  - `packages/ewe-note/src/index.css`: cursor/presence styling.
- **Steps**:
  - [ ] Bind each note to a stable raw `Y.XmlFragment` or document/field mapping matching the Run 1 contract.
  - [ ] Disable TipTap/StarterKit history for collaborative documents so Yjs collaboration owns undo/redo.
  - [ ] Set awareness user name/color from the same source the current BlockNote path used.
  - [ ] Confirm offline/local-only editing still works when there is no provider.
  - [ ] Avoid writing programmatic seed transactions into user undo history.
  - [ ] Inspect `y-prosemirror` behavior directly if TipTap collaboration obscures seed/sync transactions.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - Add or update Vitest coverage for editor markdown/Yjs helpers where practical.
- **Verification**:
  - Manual browser smoke with two tabs when local sync is available; otherwise document why collaboration verification was skipped.
- **Manual test handoff**:
  - Tester should verify local editing while signed out and, if services are running, sync/cursor behavior while signed in.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 4: OFM, Wiki Links, Backlinks, Outline, and Tasks

- **Id**: `run-4`
- **Title**: `OFM, Wiki Links, Backlinks, Outline, and Tasks`
- **Deliverable**:
  - The new editor supports EweNote's current Obsidian-style features without lossy BlockNote conversion.
- **Files**:
  - `packages/ewe-note/src/editor/markdown.ts`: extend parser/serializer for OFM using direct Markdown/ProseMirror APIs.
  - `packages/ewe-note/src/extensions/wiki-link.ts`: rewrite or replace as a TipTap extension backed by ProseMirror node/mark specs.
  - `packages/ewe-note/src/extensions/callout.ts`: rewrite or replace as a TipTap extension backed by ProseMirror node specs.
  - `packages/ewe-note/src/extensions/highlight.ts`: rewrite or replace as a TipTap mark extension with OFM serialization.
  - `packages/ewe-note/src/extensions/frontmatter.ts`: create if Run 1 chooses an editor-visible frontmatter node.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: align task/link extraction with new canonical markdown.
  - `packages/ewe-note/src/app/components/RightPanel.tsx`: make outline heading clicks select/scroll to headings through editor commands, block IDs, or anchors.
- **Steps**:
  - [ ] Add task-list parsing/serialization that preserves `- [ ]` and `- [x]`.
  - [ ] Add wiki-link parsing for `[[Name]]` and `[[Name|Alias]]`, with click navigation hooks.
  - [ ] Add highlight and callout parsing/serialization with fallback behavior for unsupported OFM.
  - [ ] Keep frontmatter round-trip behavior compatible with tags/properties UI.
  - [ ] Add an outline index based on stable heading positions, block IDs, or serialized anchors.
  - [ ] Add tests against existing Obsidian vault fixtures.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/cli/import-vault.test.ts src/cli/vault-sync.test.ts`
  - New editor parser/serializer unit tests.
- **Verification**:
  - Manual browser smoke: type tasks, headings, wiki links, tags/properties, reload, verify Tasks view and right panel reflect them.
- **Manual test handoff**:
  - Tester should rerun checklist sections 8-12 with screenshots of tasks, outline, backlinks, and export output.
- **Dependencies**:
  - `run-3`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 5: Editor Controls and Regression Coverage

- **Id**: `run-5`
- **Title**: `Editor Controls and Regression Coverage`
- **Deliverable**:
  - The editor has stable keyboard behavior, toolbar/menu affordances, accessibility labels, and regression tests for the bugs found in UX audits.
- **Files**:
  - `packages/ewe-note/src/components/editor.tsx`: final API surface and labels.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: final editor controls and event boundary.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: align header/actions with canonical title and editor state.
  - `e2e/cypress/tests/ewe-note.cy.ts`: add or update editor regression coverage if Cypress selectors are ready.
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`: update known editor expectations after migration.
- **Steps**:
  - [ ] Add keyboard shortcuts for common editor commands only where they are discoverable and expected.
  - [ ] Verify command palette Escape behavior is not broken by editor focus or overlay handling.
  - [ ] Add regression tests for title/body preview agreement and markdown task extraction.
  - [ ] Update manual tester checklist so it no longer references BlockNote as the expected editor.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
  - Relevant Cypress E2E if local app services are available.
- **Verification**:
  - Manual checklist sample for editor, command palette, tasks, and export.
- **Manual test handoff**:
  - Tester should rerun editor-heavy checklist paths and include any remaining visual regressions with screenshots.
- **Dependencies**:
  - `run-4`.
- **Model tier**: `coder`
- **Risk level**: `medium`

## Stop Conditions

Stop and ask for user approval if:

- Implementation requires changing published `@eweser/db`, `@eweser/shared`, or `@eweser/examples-components` APIs.
- Existing notes contain BlockNote/Yjs data that cannot be safely migrated or intentionally dropped under this plan.
- TipTap 2.x proves insufficient and the implementation needs direct ProseMirror for the full editor, TipTap 3, Pro/premium TipTap packages, or another wrapper.
- A security/auth or database migration change is needed.
- Verification exposes content-loss risk outside the approved editor migration boundary.

## Approval Boundary

Approval of this plan authorizes Coder to replace BlockNote with a TipTap 2.x editor inside `packages/ewe-note`, add focused dependencies, use direct ProseMirror primitives for the escape-hatch areas listed above, update editor parser/serializer code and tests, run relevant verification, perform internal QA, fix issues found inside this boundary, and update this plan's execution summary.

Approval does not authorize broad app-shell UX work, unrelated EweserDB SDK changes, destructive migrations, direct pushes to `main`, secret handling, TipTap 3 adoption, TipTap Pro dependencies, or published package API changes not explicitly called out above.

## Execution Summary

| Run     | Status                                | Files Changed                                                                                                                                                           | Verification                                                                                                                                                                                                    | Notes                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-1` | Complete                              | `docs/ai/plans/2026-04-06-tiptap-migration.md`                                                                                                                          | Read-only inspection of `editor.tsx`, `notes-room.tsx`, `NotesContext.tsx`, OFM helpers, package docs                                                                                                           | Contract: `Note.text` is canonical body markdown; `Note.frontmatter.title` is canonical explicit title when present; tags/aliases/properties remain frontmatter-backed; markdown tasks serialize as `- [ ]` / `- [x]`; new TipTap Yjs fragments use `tiptap:${noteId}` and old BlockNote fragments are ignored rather than converted.                                             |
| `run-2` | Complete                              | `packages/ewe-note/package.json`, lockfiles, `src/components/editor.tsx`, `src/components/tiptap-editor.tsx`, `src/editor/markdown.ts`, `src/index.css`, import cleanup | `npm run type-check --workspace @eweser/ewe-note`; `npm run test --workspace @eweser/ewe-note`; `npm run build --workspace @eweser/ewe-note`; browser smoke on `http://127.0.0.1:5181/`                         | BlockNote was removed from the active path and dependencies; TipTap 2.27.2 editor loads, edits, saves, reloads, and returns home with title/preview agreement. Added `@radix-ui/react-popover` because the existing UI import was missing and blocked typecheck.                                                                                                                  |
| `run-3` | Complete with local-only verification | `src/components/tiptap-editor.tsx`, `src/editor/yjs.ts`, `src/index.css`                                                                                                | `npm ls @tiptap/pm prosemirror-view prosemirror-state prosemirror-model y-prosemirror --workspace @eweser/ewe-note`; typecheck/test/build above; browser smoke while signed out                                 | Collaboration binds TipTap to a stable `Y.XmlFragment` per note when a provider exists, disables StarterKit history for collaborative documents, and wires cursor awareness from the existing user/device color source. Signed-in two-tab cursor verification was skipped because local auth/sync services were not running.                                                      |
| `run-4` | Complete with scoped OFM coverage     | `src/editor/markdown.ts`, `src/editor/markdown.test.ts`, OFM helper comments, `RightPanel.tsx`                                                                          | `npm run test --workspace @eweser/ewe-note` including new markdown bridge tests and existing import/export/vault tests; browser smoke verified task count after TipTap task-list command and reload             | Parser/serializer preserves tasks, wiki links, highlights, blockquotes/callout markdown, headings, lists, code blocks, and vault/wiki URL transformations through canonical markdown. Outline buttons now scroll to rendered heading anchors. Wiki-link click navigation remains a known follow-up; current behavior preserves link data but prevents default browser navigation. |
| `run-5` | Complete with Cypress skipped         | `src/components/tiptap-editor.tsx`, `src/App.tsx`, `src/db.tsx`, `src/index.css`, package docs/comments                                                                 | `npm run lint --workspace @eweser/ewe-note`; `npm run test --workspace @eweser/ewe-note`; `npm run type-check --workspace @eweser/ewe-note`; `npm run build --workspace @eweser/ewe-note`; Playwright CLI smoke | Toolbar exposes heading, bold, italic, code, bullet list, and task-list controls with accessible labels. Manual browser smoke covered editor open, task-list conversion, reload persistence, home title/preview consistency. Cypress was not run because the local backend/auth stack was not started for E2E.                                                                    |

### Manual Test Handoffs

#### Run 2: TipTap Baseline Editor

- Delivered behavior: ordinary notes open in TipTap, seed from `Note.text`, save back through `updateNoteText`, reload, and show the same title/preview on the home screen.
- Local services/commands: `npm run dev --workspace @eweser/ewe-note -- --host 127.0.0.1`; optional backend stack via `npm run dev:docker` for signed-in sync.
- Manual steps: open `http://127.0.0.1:5181/`, open a note, edit body text, wait one second, reload, return home.
- Expected results: editor content persists after reload; home card title comes from frontmatter title or first heading; preview reflects body markdown.
- Known gaps/risk: build still warns that `attachment-resolver.ts` imports Node modules in browser bundles; this pre-existing vault utility warning was not in editor scope.

#### Run 3: Collaboration, Undo, And Presence

- Delivered behavior: when `room.syncProvider` exists, TipTap uses collaboration/cursor extensions against `tiptap:${noteId}` and disables StarterKit history for collaborative documents.
- Local services/commands: start backend/sync/auth with `npm run dev:docker`, start EweNote, sign in or provide a valid access grant so `room.syncProvider` exists.
- Manual steps: open the same note in two browser tabs or clients, type in one, observe the other, and verify cursor labels/colors.
- Expected results: text syncs through the existing provider; local-only signed-out editing still works without a provider.
- Known gaps/risk: this session only smoke-tested signed-out local editing because auth/sync services were not running.

#### Run 4: OFM, Tasks, Outline, And Backlinks

- Delivered behavior: markdown bridge serializes TipTap JSON back to canonical OFM-style markdown for tasks, wiki links, highlights, headings, lists, blockquotes, and code blocks. Tasks view updates from serialized `- [ ]` / `- [x]` markdown.
- Local services/commands: same EweNote dev command; use a note containing `[[Wiki]]`, `==highlight==`, headings, and task list items.
- Manual steps: type headings and tasks with the toolbar, add wiki/highlight markdown through import or seeded note text, reload, open Tasks and the right panel.
- Expected results: task count updates; headings appear in the outline and scroll the editor; backlinks continue to index canonical `[[Name]]` / `[[Name|Alias]]` markdown.
- Known gaps/risk: direct wiki-link click navigation from inside TipTap is preserved as data but not implemented as app navigation in this run.

#### Run 5: Controls And Regression Coverage

- Delivered behavior: TipTap toolbar has labeled icon controls, active state styling, and regression coverage for markdown bridge behavior.
- Local services/commands: `npm run test --workspace @eweser/ewe-note`, `npm run lint --workspace @eweser/ewe-note`, and manual browser smoke.
- Manual steps: verify toolbar commands for heading, bold, italic, code, bullet list, and task list; open command palette while editor is focused and press Escape.
- Expected results: toolbar changes editor content without layout jumps; Escape closes overlays rather than corrupting editor focus.
- Known gaps/risk: Cypress was not run in this session; add a focused E2E once the local auth/app stack is part of the test run.

## Files Inspected During 2026-05-01 Decision Update

- `AGENTS.md`
- `ARCHITECTURE.md`
- `.github/copilot-instructions.md`
- `docs/ai/workflows/codex-planner-coder.md`
- `docs/ai/plans/_template.md`
- `docs/ai/research/2026-04-06-editor-reference-sweep.md`
- `docs/ai/plans/2026-04-06-tiptap-migration.md`
- `docs/ai/plans/2026-05-01-ewe-note-ux-feature-completion.md`
- `packages/ewe-note/AGENTS.md`
- `packages/ewe-note/package.json`
- `packages/ewe-note/src/components/editor.tsx`
- `packages/ewe-note/src/notes-room.tsx`
- `packages/ewe-note/src/app/contexts/NotesContext.tsx`
- `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`
- `packages/ewe-note/src/app/components/RightPanel.tsx`
- `packages/ewe-note/src/extensions/ofm-serializer.ts`
- `packages/ewe-note/src/extensions/wiki-link.ts`
- `packages/ewe-note/src/extensions/callout.ts`
- `packages/ewe-note/src/extensions/highlight.ts`
- `packages/ewe-note/src/cli/import-vault.ts`
- `packages/ewe-note/src/cli/export-vault.ts`

## Self-Reflection / Instruction Improvements

- 2026-05-01 decision update: "Drop down as low as needed" should be encoded as a hybrid abstraction rule, not as a blanket move from BlockNote to direct ProseMirror. The plan now defaults to TipTap 2.x and names the exact ProseMirror escape hatches the coder must understand.
- 2026-05-02 coder run: Editor migration plans should explicitly say whether package-local `package-lock.json` files are canonical. This repo has both root and EweNote lockfiles, so dependency changes need both lockfiles refreshed or stale removed packages can remain in review diffs.
- 2026-05-02 coder run: Signed-in collaboration verification should include an explicit local auth/sync startup precondition and test account/access-grant assumption. Without that, Coder can verify only local Yjs/offline behavior and must mark two-client presence as unverified.
