# Plan: EweNote Bear and Obsidian Workspace Redesign

## Goal

Redesign EweNote’s core workspace so it feels like a calm Bear-style writing app with Obsidian-style note-taking power, including note-first visual hierarchy, pane-mode shortcuts (`Ctrl/Cmd+1..4`), quieter metadata, and a more coherent shell across home, editor, and note-management surfaces.

<!-- eweser-orchestration -->

```yaml
orchestration:
  enabled: true
  maxParallel: 1
  baseBranch: main
  finalStages:
    - qa
runs:
  - id: run-1
    title: Design Context, Shape Brief, and North-Star Direction
    agent: eweser-coder
    model: strong
    parallel: false
    dependsOn: []
    writeScope:
      - packages/ewe-note/PRODUCT.md
      - packages/ewe-note/DESIGN.md
      - docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md
    tests:
      - IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs
    changeset: no
  - id: run-2
    title: Shared Workspace Shell and Pane-Mode Architecture
    agent: eweser-coder
    model: coding
    parallel: false
    dependsOn:
      - run-1
    writeScope:
      - packages/ewe-note/src/app/components/WorkspaceShell.tsx
      - packages/ewe-note/src/app/components/workspace-layout.ts
      - packages/ewe-note/src/app/components/NotesListPane.tsx
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/src/app/pages/EnhancedHome.tsx
      - packages/ewe-note/src/app/pages/Settings.tsx
      - packages/ewe-note/src/app/components/*.test.ts
      - packages/ewe-note/src/app/components/*.test.tsx
      - packages/ewe-note/src/components/layout-shortcuts.test.ts
      - docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md
    tests:
      - npm run type-check --workspace @eweser/ewe-note
      - npm test --workspace @eweser/ewe-note -- workspace-layout
    changeset: no
  - id: run-3
    title: Sidebar and Notes-List Redesign
    agent: eweser-coder
    model: coding
    parallel: false
    dependsOn:
      - run-2
    writeScope:
      - packages/ewe-note/src/app/components/EnhancedSidebar.tsx
      - packages/ewe-note/src/app/components/NotesListPane.tsx
      - packages/ewe-note/src/app/pages/EnhancedHome.tsx
      - packages/ewe-note/src/app/contexts/NotesContext.tsx
      - packages/ewe-note/src/index.css
      - docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md
    tests:
      - npm run type-check --workspace @eweser/ewe-note
      - npm test --workspace @eweser/ewe-note
    changeset: no
  - id: run-4
    title: Editor Surface, Metadata Demotion, and Focus Behavior
    agent: eweser-coder
    model: coding
    parallel: false
    dependsOn:
      - run-3
    writeScope:
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/src/components/editor.tsx
      - packages/ewe-note/src/components/tiptap-editor.tsx
      - packages/ewe-note/src/components/editor-toolbar.tsx
      - packages/ewe-note/src/app/components/RightPanel.tsx
      - packages/ewe-note/src/components/frontmatter-editor.tsx
      - docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md
    tests:
      - npm run type-check --workspace @eweser/ewe-note
      - npm test --workspace @eweser/ewe-note
    changeset: no
  - id: run-5
    title: Impeccable Critique Loop, Live Variants, and Final Polish
    agent: eweser-coder
    model: strong
    parallel: false
    dependsOn:
      - run-4
    writeScope:
      - packages/ewe-note/src/app/components/EnhancedSidebar.tsx
      - packages/ewe-note/src/app/components/NotesListPane.tsx
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/src/app/components/RightPanel.tsx
      - packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx
      - packages/ewe-note/src/index.css
      - packages/ewe-note/DESIGN.md
      - docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md
    tests:
      - npm run type-check --workspace @eweser/ewe-note
      - npm test --workspace @eweser/ewe-note
    changeset: no
  - id: run-6
    title: Final Regression Pass and Manual Review Kit
    agent: eweser-coder
    model: fast
    parallel: false
    dependsOn:
      - run-5
    writeScope:
      - packages/ewe-note/src/app/components/*.test.ts
      - packages/ewe-note/src/app/components/*.test.tsx
      - e2e/cypress/tests/ewe-note.cy.ts
      - docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md
    tests:
      - npm run type-check --workspace @eweser/ewe-note
      - npm test --workspace @eweser/ewe-note
    changeset: no
```

## Scope

- In:
  - `packages/ewe-note` workspace shell, editor page chrome, home page, notes list pane, sidebar/folder management surfaces, note metadata panel, command palette polish, relevant CSS/token updates, and focused tests for the new pane-mode behavior.
  - `packages/ewe-note/PRODUCT.md` and `packages/ewe-note/DESIGN.md` design context for this app surface.
  - A documented `impeccable` workflow for shaping, critiquing, and polishing the redesign.
- Out:
  - Obsidian-style split editing and multiple open notes at once.
  - Canvas/Bases/graph-view product work.
  - Auth/server/data-model/backend changes unless a narrow UI dependency proves unavoidable and requires approval.
  - Published package API changes or changesets.

## Assumptions / Open Questions

- Assumption: The approved strategic direction is already known: Bear-level visual restraint, Obsidian-level capability, and a note-first workflow.
- Assumption: The desired pane modes are:
  - `Ctrl/Cmd+1`: editor only.
  - `Ctrl/Cmd+2`: notes list + editor.
  - `Ctrl/Cmd+3`: folders/sidebar + notes list + editor.
  - `Ctrl/Cmd+4`: mode 3 plus note metadata panel.
- Assumption: `packages/ewe-note` can own its own `PRODUCT.md` / `DESIGN.md` context independent of the monorepo root.
- Assumption: Existing local WIP in `packages/ewe-note` is exploratory and not automatically approved final scope. Coder must review it selectively and keep only plan-aligned pieces.
- Assumption: EweNote remains offline-first and signed-out usable throughout this redesign.
- Open question: Should Settings adopt the full new workspace shell in this pass, or stay a simpler standalone page styled to match it? The runs below keep this in scope only if it improves shell consistency without destabilizing settings behavior.
- Open question: Should the note-list pane support a dedicated task list mode in this redesign, or should Tasks remain a lighter filtered view until task interactions are redesigned more deeply?

## Verified Current State

- `packages/ewe-note/src/app/pages/EnhancedEditor.tsx` currently mixes editor header concerns, metadata chips, and right-panel toggles directly into the page.
- `packages/ewe-note/src/app/pages/EnhancedHome.tsx` still uses grid/list note cards and product-dashboard-like controls rather than a Bear-style note list.
- `packages/ewe-note/src/app/components/EnhancedSidebar.tsx` remains visually busy and owns both app navigation and folder-note expansion, which makes the shell hierarchy muddier than Bear/Obsidian.
- `packages/ewe-note/src/components/editor-toolbar.tsx`, `tiptap-editor.tsx`, `editor-bubble-menu.tsx`, `editor-context-menu.tsx`, and `editor-slash-menu.tsx` already provide the beginnings of a contextual-command model, so the redesign should lean harder on those instead of re-expanding persistent chrome.
- `packages/ewe-note/PRODUCT.md` now exists, but `packages/ewe-note/DESIGN.md` does not.
- The worktree is already dirty, including exploratory EweNote UI changes and unrelated repo changes. Coder must not reset unrelated work.

## Impeccable Workflow For This Plan

Coder should use `impeccable` as a strict sub-workflow, not as vague inspiration.

### Phase A: Context and shape before code

1. Load EweNote context directly, not repo root:
   - `IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs`
2. If `DESIGN.md` is still missing, run `impeccable document` for `packages/ewe-note` before visual redesign work so the app gets explicit visual-system guidance in addition to `PRODUCT.md`.
3. Run `impeccable shape` for the workspace redesign target before implementation. The shape brief must cover:
   - whole-shell scope, not only the editor;
   - pane-mode behavior `1..4`;
   - sidebar vs notes-list vs metadata responsibilities;
   - empty states and note-list density;
   - desktop and narrow-width behavior;
   - anti-goals: Notion/dashboard/IDE chrome.
4. If native image generation is available in the harness, use the shape step’s visual probe phase to generate 2-4 north-star directions for the shell. The point is not art direction in the abstract; it is locking layout topology, density, hierarchy, and tonal treatment before code.
5. Get explicit user confirmation on the shape brief before craft/implementation.

### Phase B: Implementation-time impeccable usage

- Use `impeccable craft` only as a mental contract for the build loop even if implementation is done manually: preserve the approved shell silhouette, note-list topology, and header hierarchy.
- Use `impeccable live` only after the new shell is functional and the dev server is running. Target element-level iteration on:
  - the note-list row,
  - the editor header/title block,
  - the sidebar header/footer,
  - the metadata panel tabs/header.
- Do not use `live` as the first-pass layout planner. It is for local refinement after the shell structure exists.

### Phase C: Critique and feedback loop

After the first coherent shell pass is running locally:

1. Run `impeccable critique` against at least:
   - `/` (home or library route),
   - `/editor/:noteId` with a realistic populated note,
   - the metadata-visible mode.
2. Treat critique findings as ranked design bugs. Fix P0/P1 items before a polish pass.
3. If the critique identifies density/hierarchy issues but not architectural ones, use the narrower command that matches the problem instead of freeform rework:
   - `layout` for spacing/topology problems,
   - `typeset` for heading/list rhythm,
   - `distill` for chrome overload,
   - `quieter` if accents/actions feel too loud,
   - `clarify` for confusing metadata/tool labels.

### Phase D: Final polish and browser proof

1. Run `impeccable polish` only after state coverage and interactions are complete.
2. Verify in-browser at minimum:
   - desktop wide,
   - laptop-ish width,
   - narrow mobile width.
3. Preserve the Bear/Obsidian goal during polish:
   - note body remains primary,
   - metadata remains secondary,
   - controls never dominate the page,
   - typography and spacing do most of the visual work.

## Run 1 Shape Brief

Status: approved by user request to run the whole plan in orchestrator mode on
2026-05-02.

### Feature Summary

EweNote's workspace should become a writing-first note app shell for users who
want Bear-level calm and Obsidian-level note-system depth. The redesign covers
the whole workspace surface: home/library, editor, sidebar, note list, metadata
panel, and pane-mode controls.

### Primary User Action

Open or create a note and stay oriented in the writing surface while using
folders, note lists, metadata, links, and keyboard shortcuts only when needed.

### Design Direction

- Color strategy: restrained. Warm tinted neutrals and one low-chroma accent;
  accent use stays rare and stateful.
- Theme scene: a regular writer is working in a quiet room during a long
  evening session, moving between capture, review, and focused drafting without
  wanting the app chrome to compete with the note.
- Anchor references: Bear for restraint and note-list polish; Obsidian for
  folders/wiki-links/metadata depth; native macOS sidebars for quiet density and
  predictable affordances.
- Visual probe note: image probes were skipped because this implementation is
  primarily code-native refinement of an existing dirty app shell, and the
  approval-critical decision is pane topology/density rather than decorative
  art direction.

### Scope

- Fidelity: production-ready.
- Breadth: whole EweNote workspace surface, not only editor chrome.
- Interactivity: shipped-quality React UI with real pane shortcuts and persisted
  mode state.
- Time intent: build until the approved plan runs are complete, then critique
  and polish rather than shipping a first pass.

### Layout Strategy

The workspace is a four-pane mental model, not a dashboard. Mode 1 is editor
only. Mode 2 adds the note list. Mode 3 adds the folder/sidebar rail. Mode 4
adds the metadata panel. The editor column is always the primary surface; the
sidebar and note list are navigational support; the right panel is inspection
support. Home should read as a note library and launch surface, not a metrics
card grid.

### Key States

- Empty workspace: teach new note creation and pane shortcuts without dashboard
  filler.
- One note: make the note list and editor feel purposeful without awkward empty
  density.
- Many notes: preserve fast scanning with title, preview, date, folder, tag, and
  selection state.
- Pinned notes: visible but not louder than current note selection.
- Folder-specific view: folder ownership is clear across sidebar and notes
  list.
- Tasks view: useful filtered list, not a full task-management redesign.
- Metadata hidden/visible: `Ctrl/Cmd+4` and the info button open the same
  support surface.
- Narrow width: collapse panes structurally rather than shrinking typography
  into unreadability.

### Interaction Model

Pane modes are reachable from `Ctrl/Cmd+1..4` and visible controls. New-note,
search, folder selection, note selection, pinning, and metadata inspection keep
their current data behavior but use quieter chrome. Destructive actions remain
secondary and confirmed. Focus mode remains a dedicated "just write" escape
hatch and should align mentally with mode 1.

### Content Requirements

Chrome copy should be short and functional: "Library", "All Notes", "Recent",
"Pinned", "Tasks", "Note Info", "Outline", "Links", "Meta". Empty-state copy
should explain the next useful action without restating the page title.
Metadata labels should be terse and secondary.

### Recommended Impeccable References

- `reference/product.md`
- `reference/document.md`
- `reference/shape.md`
- `reference/critique.md`
- `reference/polish.md`
- Follow-up commands as needed: `layout`, `typeset`, `distill`, `quieter`,
  `clarify`, `adapt`.

### Open Questions

- Settings should only adopt the full workspace shell if it improves
  consistency without destabilizing account/settings behavior.
- Tasks should remain a filtered note-list view in this pass unless a deeper
  task interaction redesign is separately approved.

## Runs

## Run Order And Manual Test Handoffs

Run order: Run 1 must happen first because it establishes the approved visual contract and `impeccable` operating method. Runs 2 and 3 are sequential because pane architecture affects the shell and note-list responsibilities. Run 4 depends on the shell. Run 5 is the critique/polish loop after the main UI is in place. Run 6 closes with manual-test guidance and targeted regressions.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Design Context, Shape Brief, and North-Star Direction

- **Id**: `run-1`
- **Title**: `Design Context, Shape Brief, and North-Star Direction`
- **Deliverable**:
  - EweNote has valid `PRODUCT.md` + `DESIGN.md` context, plus an approved shape brief for the workspace redesign.
- **Files**:
  - `packages/ewe-note/PRODUCT.md`: confirm/update only if implementation research proves the current wording incomplete.
  - `packages/ewe-note/DESIGN.md`: generate and refine for this app surface.
  - `docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md`: update execution notes if shape decisions change the implementation sequence.
- **Steps**:
  - [x] Load `packages/ewe-note` impeccable context directly.
  - [x] Generate `DESIGN.md` if missing, grounded in existing app tokens and the approved Bear/Obsidian direction.
  - [x] Run `impeccable shape` for the whole workspace shell, not just the editor.
  - [x] Image probes skipped with rationale in the shape brief; this pass is a code-native refinement of an existing shell and topology/density is the decision that needs confirmation.
  - [x] Record the final brief inputs that implementation must preserve: shell topology, pane roles, theme choice, density, typography tone, and anti-goals.
- **Tests**:
  - Not needed: planning/design artifact run.
- **Verification**:
  - `IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs`
  - Awaiting confirmed shape brief in conversation.
- **Manual test handoff**:
  - Not needed: this run produces design artifacts and approvals, not product code.
- **Dependencies**:
  - None.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Shared Workspace Shell and Pane-Mode Architecture

- **Id**: `run-2`
- **Title**: `Shared Workspace Shell and Pane-Mode Architecture`
- **Deliverable**:
  - A shared shell drives home/editor pane visibility and the `Ctrl/Cmd+1..4` workspace modes without split-note complexity.
- **Files**:
  - `packages/ewe-note/src/app/components/WorkspaceShell.tsx`: create shared shell and shared state.
  - `packages/ewe-note/src/app/components/workspace-layout.ts`: pane-mode mapping and hotkey logic.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: consume shell instead of owning all chrome itself.
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`: consume shell instead of its current top-bar/card-grid structure.
  - `packages/ewe-note/src/app/pages/Settings.tsx`: optionally align with shell framing if the run can do so safely.
  - `packages/ewe-note/src/app/components/NotesListPane.tsx`: create shared center-pane list surface.
  - `packages/ewe-note/src/components/layout-shortcuts.test.ts` or a new test file under `src/app/components/`: cover the new mode mapping.
- **Steps**:
  - [ ] Introduce an explicit workspace-mode model for 1/2/3/4.
  - [ ] Persist the user’s last chosen mode locally.
  - [ ] Ensure mode switching works from both `/` and `/editor/:noteId`.
  - [ ] Keep mode 4 as metadata-visible mode, not a second implementation of focus mode.
  - [ ] Avoid reintroducing old topbar/sidebar abstractions from legacy shell code if they do not match the new pane model.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm test --workspace @eweser/ewe-note -- workspace-layout`
- **Verification**:
  - Browser/manual: switch between modes 1-4 on home and editor routes and confirm pane visibility matches the contract.
- **Manual test handoff**:
  - Open any note, press `Cmd/Ctrl+1`, `2`, `3`, `4`, and verify:
    - mode 1 leaves only the editor;
    - mode 2 shows notes list + editor;
    - mode 3 shows folders + notes list + editor;
    - mode 4 adds metadata on the right.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `coder`
- **Risk level**: `high`

### Run 3: Sidebar and Notes-List Redesign

- **Id**: `run-3`
- **Title**: `Sidebar and Notes-List Redesign`
- **Deliverable**:
  - The left side of the app reads like a calm note workspace instead of a dashboard or admin shell.
- **Files**:
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: redesign folder/nav/account surface.
  - `packages/ewe-note/src/app/components/NotesListPane.tsx`: redesign note list rows, search affordance, and pane-mode controls.
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`: replace grid/list card metaphors with a note-library-first landing state.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: adjust only if note-list filtering/state needs a cleaner helper boundary.
  - `packages/ewe-note/src/index.css`: focused style/token adjustments.
- **Steps**:
  - [ ] Remove grid/list card logic as the primary library metaphor.
  - [ ] Redesign note rows around title, preview, subtle metadata, and selection state.
  - [ ] Simplify sidebar hierarchy, reduce icon noise, and make folders/supporting nav quieter.
  - [ ] Preserve folder creation/selection behaviors while making them more visible and less prompt-driven where already in scope.
  - [ ] Ensure the shell still works with zero notes, few notes, and many notes.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm test --workspace @eweser/ewe-note`
- **Verification**:
  - Browser/manual: home route with no note selected, existing notes, pinned notes, recent notes, tasks view, and at least one foldered note.
- **Manual test handoff**:
  - Verify the note list remains readable with:
    - one note,
    - 20+ notes,
    - pinned notes,
    - a folder-specific view.
  - Confirm the selected row is obvious but not loud.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Editor Surface, Metadata Demotion, and Focus Behavior

- **Id**: `run-4`
- **Title**: `Editor Surface, Metadata Demotion, and Focus Behavior`
- **Deliverable**:
  - The editor feels like the primary surface, with metadata and formatting treated as secondary support.
- **Files**:
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: editor-page header and shell integration.
  - `packages/ewe-note/src/components/editor.tsx`: reading width and frontmatter/editor composition.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: focus-aware editor behavior if needed.
  - `packages/ewe-note/src/components/editor-toolbar.tsx`: keep persistent chrome compact and utility-like.
  - `packages/ewe-note/src/app/components/RightPanel.tsx`: redesign metadata/outline/links panel to feel quieter and more integrated with mode 4.
  - `packages/ewe-note/src/components/frontmatter-editor.tsx`: keep frontmatter supportive and not always-primary.
- **Steps**:
  - [ ] Keep the title block strong and document-led.
  - [ ] Remove metadata filler copy from the primary surface.
  - [ ] Keep persistent editor controls compact and depend on contextual controls for deeper formatting.
  - [ ] Make the right panel feel like intentional metadata support rather than a separate busy app.
  - [ ] Preserve focus mode and ensure it still serves the mode-1 note-first mental model.
  - [ ] Ensure `Ctrl/Cmd+4` and the header info toggle do the same thing.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm test --workspace @eweser/ewe-note`
- **Verification**:
  - Browser/manual: populated note with tags/properties, note with no metadata, focus mode, mode 1, and mode 4.
- **Manual test handoff**:
  - Open a note with metadata and confirm:
    - the editor remains primary;
    - metadata is available but not dominant;
    - `Cmd/Ctrl+4` and the info button both expose the same metadata surface;
    - mode 1 still feels like a credible “just write” view.
- **Dependencies**:
  - `run-2`, `run-3`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Impeccable Critique Loop, Live Variants, and Final Polish

- **Id**: `run-5`
- **Title**: `Impeccable Critique Loop, Live Variants, and Final Polish`
- **Deliverable**:
  - The redesigned shell has passed an explicit design-review loop rather than shipping on first-pass taste.
- **Files**:
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`
  - `packages/ewe-note/src/app/components/NotesListPane.tsx`
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`
  - `packages/ewe-note/src/app/components/RightPanel.tsx`
  - `packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx`
  - `packages/ewe-note/src/index.css`
  - `packages/ewe-note/DESIGN.md`: only if polish reveals durable token/system changes worth documenting.
- **Steps**:
  - [ ] Run `impeccable critique` against representative redesigned surfaces and fix the top P0/P1 findings.
  - [ ] Use `impeccable live` for element-level iteration only where the shell is structurally correct but visually weak.
  - [ ] Run targeted follow-up commands such as `layout`, `typeset`, `distill`, `quieter`, or `clarify` based on critique findings.
  - [ ] Run `impeccable polish` after the major critique issues are resolved.
  - [ ] Verify reduced-motion, focus visibility, mobile density, and empty-state quality during the polish pass.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm test --workspace @eweser/ewe-note`
- **Verification**:
  - Browser/manual: desktop, laptop, and mobile screenshots of home, editor mode 1, editor mode 3, and editor mode 4.
- **Manual test handoff**:
  - Tester should compare the redesigned app against the approved brief:
    - Does the note read as primary?
    - Does the shell feel Bear-like rather than dashboard-like?
    - Do the pane modes feel natural and memorable?
    - Is metadata support present without stealing the page?
- **Dependencies**:
  - `run-4`.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 6: Final Regression Pass and Manual Review Kit

- **Id**: `run-6`
- **Title**: `Final Regression Pass and Manual Review Kit`
- **Deliverable**:
  - A focused regression suite and manual review handoff for the redesigned workspace.
- **Files**:
  - `packages/ewe-note/src/app/components/...*.test.tsx` or existing test files as appropriate for new shell behavior.
  - `e2e/cypress/tests/ewe-note.cy.ts`: add or update focused route/shell assertions if local e2e setup is available.
  - `docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md`: execution summary and final handoff.
- **Steps**:
  - [ ] Add focused tests for workspace-mode hotkeys/state helpers and any fragile pane-visibility logic.
  - [ ] Add lightweight regression coverage for the main shell routes if feasible.
  - [ ] Write the final manual review handoff with routes, shortcuts, note fixtures, and what to compare visually.
  - [ ] Record remaining deferred scope explicitly, especially split-note/multi-tab editing.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm test --workspace @eweser/ewe-note`
  - Relevant Cypress command if the local e2e stack is available.
- **Verification**:
  - Dry-run the manual handoff enough to confirm routes and shortcuts are current.
- **Manual test handoff**:
  - This run creates the final handoff.
- **Dependencies**:
  - `run-5`.
- **Model tier**: `fast`
- **Risk level**: `low`

## Stop Conditions

Stop and ask for user approval if:

- The redesign needs scope beyond the core EweNote workspace, such as split-note editing, graph/canvas work, or backend changes.
- The implementation requires replacing TipTap or undoing the current editor migration effort.
- `impeccable shape` or visual probes reveal a materially different shell direction than the currently approved Bear/Obsidian lane.
- A cleaner shell requires destructive changes to existing note data behavior or route structure that were not explicitly planned.
- Existing local WIP conflicts with the approved redesign in a way that cannot be resolved with focused edits.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above, make focused
supporting edits needed for those runs, write/update tests, run relevant
verification, perform internal QA, fix issues found inside this boundary, and
update this plan's execution summary.

Approval does not authorize unrelated refactors, new product scope, destructive
git operations, direct pushes to `main`, secret handling, migration deletion, or
published package API changes not called out above.

## Execution Summary

| Run     | Status                                                              | Files Changed                                                                                                                                                                                                                                                                                  | Verification                                                                                                                                                                                                                            | Notes                                                                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-1` | Completed                                                           | `packages/ewe-note/PRODUCT.md`; `packages/ewe-note/DESIGN.md`; plan shape brief                                                                                                                                                                                                                | `IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs`                                                                                                                                      | Shape brief approved by "run the whole plan in orchestrator mode"; image probes skipped because topology/density was the approval-critical decision.                                                                                                  |
| `run-2` | Completed with selective integration                                | `packages/ewe-note/src/app/components/WorkspaceShell.tsx`; `packages/ewe-note/src/app/components/workspace-layout.ts`; `packages/ewe-note/src/app/components/workspace-layout.test.ts`; `packages/ewe-note/src/app/components/WorkspaceShell.test.tsx`; existing shell/list/page WIP preserved | `npm run type-check --workspace @eweser/ewe-note`; `npm test --workspace @eweser/ewe-note`; `npx vitest run packages/ewe-note/src/app/components/workspace-layout.test.ts packages/ewe-note/src/app/components/WorkspaceShell.test.tsx` | Orchestrator worker completed, but automatic squash integration was blocked by local dirty/untracked WIP. Integrated the safe helper/test changes manually and preserved current TipTap/editor migration work.                                        |
| `run-3` | Completed in orchestrator, reviewed for integration                 | Worker branch changed `EnhancedSidebar.tsx`, `NotesListPane.tsx`, `EnhancedHome.tsx`, and `index.css`; current local redesign WIP preserved                                                                                                                                                    | `npm run type-check --workspace @eweser/ewe-note`; `npm test --workspace @eweser/ewe-note`                                                                                                                                              | Worker output came from clean `main` and did not include the active local TipTap/parity WIP, so it was not blanket-applied. Existing local files already contain the Bear/Obsidian shell direction and remained green after shell helper integration. |
| `run-4` | Completed in orchestrator, not blanket-applied                      | Worker branch changed BlockNote-era editor files; current local TipTap editor files preserved                                                                                                                                                                                                  | `npm run type-check --workspace @eweser/ewe-note`; `npm test --workspace @eweser/ewe-note`                                                                                                                                              | Stop condition applied in practice: do not undo the current TipTap migration. The worker explicitly reported it was operating on a BlockNote-based worktree, so blindly merging it would regress local WIP.                                           |
| `run-5` | Completed in orchestrator, partially integrated through current WIP | `packages/ewe-note/DESIGN.md`; existing polished shell files retained                                                                                                                                                                                                                          | `npm run type-check --workspace @eweser/ewe-note`; `npm test --workspace @eweser/ewe-note`                                                                                                                                              | Automated `impeccable` live/critique was not runnable in worker sessions. Browser visual proof remains pending.                                                                                                                                       |
| `run-6` | Completed with local regression integration                         | `packages/ewe-note/src/app/components/workspace-layout.test.ts`; `packages/ewe-note/src/app/components/WorkspaceShell.test.tsx`                                                                                                                                                                | `npm run type-check --workspace @eweser/ewe-note`; `npm test --workspace @eweser/ewe-note`; targeted Vitest command                                                                                                                     | Added and verified pane-mode/hotkey regression coverage. Cypress assertions from the worker were not blindly merged because local e2e route assumptions still need browser confirmation against the active TipTap worktree.                           |

### Orchestrator Notes

- Dry run passed for `scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/2026-05-02-ewe-note-bear-obsidian-redesign.md --dry-run`.
- Mutating run was started with `--allow-dirty --sequential` because the repo already contained intentional local WIP.
- All six worker runs completed in isolated branches under `codex/orchestrator/docs-ai-plans-2026-05-02-ewe-note-bear-obsidian-redesign/*`.
- Automatic integration blocked at `run-1` because untracked local files would be overwritten: this plan, `packages/ewe-note/PRODUCT.md`, and `packages/ewe-note/DESIGN.md`.
- The cumulative `run-6` worker branch was reviewed, but it was based on clean `main` and therefore missed the active local TipTap/parity work. Selective integration was used to avoid regressing editor migration work.

### Manual Test Handoff

Local services/commands:

- `npm run dev --workspace @eweser/ewe-note`
- If testing sync/auth behavior, start the backend stack first with `npm run dev:docker`.

Manual steps:

- Open the EweNote app and create or open a note.
- Press `Cmd/Ctrl+1`, `2`, `3`, and `4` from the home route and an editor route.
- Confirm mode 1 hides sidebar/list/metadata, mode 2 shows notes list plus editor, mode 3 shows sidebar/list/editor, and mode 4 adds metadata.
- Focus the editor/title input and press `Cmd/Ctrl+1..4`; pane mode should not change while typing in editable targets.
- Check notes list density with one note, multiple notes, pinned notes, tasks, and a folder-specific view.
- Open note info through the editor header and through `Cmd/Ctrl+4`; both should expose the same metadata surface.
- Resize to desktop wide, laptop-ish, and narrow mobile widths; confirm the note remains primary and chrome does not dominate.

Known gaps / residual risk:

- Browser smoke was completed against `http://127.0.0.1:5181/` after
  `npm run dev --workspace @eweser/ewe-note -- --host 127.0.0.1`. Verified:
  opening a seeded note, `Cmd+1` hiding support panes, `Cmd+4` showing metadata,
  and `Cmd+1` inside the title input not changing panes.
- Follow-up manual retest fixed the active Cypress command:
  `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`.
  The run passed 10/10 against the active TipTap worktree, and Source Mode no
  longer relies on Cypress force-clicking a hidden control.
- Viewport retest covered desktop/laptop editor mode and 390px editor-only mode.
  Full mode 3 at 390px still presents separate sidebar/list/editor panes; use
  pane mode 1 for narrow editor parity checks unless a future responsive-shell
  run changes that topology.
- The orchestrator currently cannot safely use uncommitted local WIP as a worker base. For future large orchestrated UI runs, create a temporary local integration branch or commit approved WIP before launching workers.

## Self-Reflection / Instruction Improvements

- The `impeccable` skill is strict enough that EweNote UI work benefits from planning its usage explicitly inside the repo plan, especially when `PRODUCT.md` exists but `DESIGN.md` does not.
- Orchestrator mode should not be launched from clean `main` when the acceptance baseline is an uncommitted local editor migration. Add a preflight note to either commit approved WIP to a temporary branch or run implementation locally when worker branches need the dirty worktree context.
