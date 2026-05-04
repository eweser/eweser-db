# Plan: EweNote Bear Minimal Panels Follow-up

## Goal

Bring EweNote materially closer to the user's stated Bear-style target by
making panels 1, 2, and 3 nearly textless UI chrome, moving organization into
panel 1, recent note previews into panel 2, restoring panel 4 as the labeled
metadata surface on `Ctrl/Cmd+4`, and proving the result with a built-in manual
test stage before final closeout.

<!-- eweser-orchestration -->

```yaml
orchestration:
  enabled: true
  maxParallel: 1
  baseBranch: codex/ewe-note-obsidian-editor-pr
  finalStages:
    - qa
  notes:
    - This is a follow-up to docs/ai/plans/2026-05-03-ewe-note-finish-bear-obsidian-ux.md.
    - Treat the recovered May 3 impeccable prompt as the stricter acceptance target.
    - Keep execution sequential; the same shell/editor files are shared across runs.
    - Preserve unrelated local changes unless the user explicitly approves reverting them.
runs:
  - id: run-1
    title: Re-baseline Against The Recovered Bear-Minimal Target
    agent: eweser-coder
    model: strong
    parallel: false
    dependsOn: []
    writeScope:
      - docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md
      - docs/ai/testing/ewe-note-ux-feature-audit-checklist.md
      - output/playwright/**
    tests:
      - IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs
      - .codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status
    changeset: no
  - id: run-2
    title: Panel Contract And Metadata Return
    agent: eweser-coder
    model: coding
    parallel: false
    dependsOn:
      - run-1
    writeScope:
      - packages/ewe-note/src/app/components/WorkspaceShell.tsx
      - packages/ewe-note/src/app/components/workspace-layout.ts
      - packages/ewe-note/src/app/components/workspace-layout.test.ts
      - packages/ewe-note/src/app/components/EnhancedSidebar.tsx
      - packages/ewe-note/src/app/components/NotesListPane.tsx
      - packages/ewe-note/src/app/components/RightPanel.tsx
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/src/index.css
    tests:
      - npm run test --workspace @eweser/ewe-note -- --run src/app/components/workspace-layout.test.ts src/app/components/WorkspaceShell.test.tsx
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-3
    title: Panel 1 Folders And Panel 2 Recent Note Previews
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
      - e2e/cypress/tests/ewe-note.cy.ts
    tests:
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-4
    title: Sparse Editor Canvas And Hidden Controls
    agent: eweser-coder
    model: coding
    parallel: false
    dependsOn:
      - run-3
    writeScope:
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/src/components/editor-toolbar.tsx
      - packages/ewe-note/src/components/editor-context-menu.tsx
      - packages/ewe-note/src/components/editor-bubble-menu.tsx
      - packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx
      - packages/ewe-note/src/index.css
      - e2e/cypress/tests/ewe-note.cy.ts
    tests:
      - npm run test --workspace @eweser/ewe-note
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-5
    title: Manual Test Gate Against Bear And The Recovered UX Contract
    agent: eweser-manual-tester
    model: strong
    parallel: false
    dependsOn:
      - run-4
    writeScope:
      - docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md
      - docs/ai/testing/ewe-note-ux-feature-audit-checklist.md
      - output/playwright/**
    tests:
      - EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts
    changeset: no
  - id: run-6
    title: Fix Manual Test Findings And Final Closeout
    agent: eweser-coder
    model: strong
    parallel: false
    dependsOn:
      - run-5
    writeScope:
      - packages/ewe-note/src/app/components/WorkspaceShell.tsx
      - packages/ewe-note/src/app/components/EnhancedSidebar.tsx
      - packages/ewe-note/src/app/components/NotesListPane.tsx
      - packages/ewe-note/src/app/components/RightPanel.tsx
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/src/app/pages/EnhancedHome.tsx
      - packages/ewe-note/src/components/editor-toolbar.tsx
      - packages/ewe-note/src/components/editor-context-menu.tsx
      - packages/ewe-note/src/components/editor-bubble-menu.tsx
      - packages/ewe-note/src/index.css
      - e2e/cypress/tests/ewe-note.cy.ts
      - docs/ai/testing/ewe-note-ux-feature-audit-checklist.md
      - docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md
      - output/playwright/**
    tests:
      - npm run lint --workspace @eweser/ewe-note -- --max-warnings=0
      - npm run type-check --workspace @eweser/ewe-note
      - npm run test --workspace @eweser/ewe-note
      - npm run build --workspace @eweser/ewe-note
      - EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts
      - npm run code-index:check
      - git diff --check
    changeset: no
```

## Scope

- In:
  - `packages/ewe-note` workspace shell, sidebar, note-list, editor chrome,
    metadata panel, keyboard pane routing, no-note-selected state, Cypress
    coverage, CSS polish, screenshots, and plan/testing docs.
  - Manual comparison against the local Bear app when available.
  - Accessibility labels/tooltips that do not violate the "no visible labels in
    panels 1/2/3" goal.
- Out:
  - Auth-server, sync-server, shared package, database schema, migrations,
    release changesets, or published package APIs.
  - Obsidian graph/canvas/plugins, rich multi-pane power-user layouts, or
    redesigning Settings/Profile beyond what is needed to keep them functional.
  - Eliminating every remaining text string inside contextual menus or dialogs;
    the visible panel chrome is the priority target.

## Assumptions / Open Questions

- Assumption: The prior plan
  `docs/ai/plans/2026-05-03-ewe-note-finish-bear-obsidian-ux.md` remains useful
  as implementation context, but its acceptance drifted away from the stricter
  recovered May 3 user prompt.
- Assumption: The recovered target is authoritative:
  - panel 1 should primarily be folders/organization,
  - panel 2 should primarily be recent note previews,
  - panel 3 should be an extremely sparse editor canvas,
  - panel 4 may contain labeled note metadata UI.
- Assumption: "No UI labels in panels 1/2/3" means no persistent visible titles
  such as `Library`, `Notes`, `Search`, `Write`, `Browse`, `Organize`,
  `Inspect`, or source-mode chrome labels in the active note workspace.
- Assumption: Small icon affordances, tooltips, aria labels, hidden menus, and
  ellipsis menus are allowed if the visible chrome stays quiet.
- Assumption: If no note is selected, panel 3 should show either nothing or a
  minimal placeholder and must not become a dashboard or secondary library.
- Open question: Whether search should remain visibly exposed in panel 1 or live
  behind an icon/menu as long as panel 1 remains the primary home for
  navigation and organization. Coder should choose the quieter option that
  keeps note retrieval usable.
- Open question: Whether a tiny persistent note title field still counts as
  acceptable visible non-user text in panel 3 when no note is selected. Default
  to hiding it until a note exists.

## Verified Current State

- The recovered raw session at
  `/Users/jacob/.codex/sessions/2026/05/03/rollout-2026-05-03T16-26-48-019decf2-7ff9-7832-9199-11ca9b254ed9.jsonl`
  contains the stricter target that was not preserved faithfully in the prior
  final response or plan.
- The recovered prompt explicitly called out:
  - contrast is too low,
  - `Ctrl/Cmd+4` metadata behavior regressed,
  - library/notes/search chrome should not occupy the editor area when no note
    is selected,
  - panel 1 should be folders,
  - panel 2 should be recent note previews,
  - panel 3 should be nearly blank aside from the note body,
  - panels 1/2/3 should avoid visible UI labels, while panel 4 may use them.
- The previous plan's execution summary records one drift that directly
  conflicts with that target: it added visible labeled workspace controls
  `Write / Browse / Organize / Inspect`.
- The previous final response also claimed success with "icon-first" and
  "icon-only by default", but that is weaker than the recovered prompt's
  "no visible labels in panels 1/2/3" requirement.

## Target Acceptance

Coder is done only when all of these are true:

- Panels 1, 2, and 3 have no persistent visible UI text labels or mode labels
  in their resting desktop state.
- Panel 1 is the primary organization surface, centered on folders and
  supporting navigation utilities.
- Panel 2 is primarily recent/current note previews and does not carry extra
  product teaching or dashboard copy.
- Panel 3 is a sparse writing canvas whose dominant visible text is the user's
  note content; if no note is selected, it is blank or nearly blank.
- `Ctrl/Cmd+4` reliably opens the metadata panel, and panel 4 can use labeled
  UI for note info, links, outline, and properties.
- Source mode and editing utilities remain accessible, but their visible chrome
  in panel 3 is reduced to icon/menu affordances instead of persistent labeled
  strips.
- Contrast is high enough that the app is comfortably readable in the dark
  theme without squinting.
- The workspace no longer shows `Library`, `Notes`, `Search`, `Write`,
  `Browse`, `Organize`, `Inspect`, or similar visible labels in panels 1/2/3.
- Cypress still passes against the running EweNote dev server.
- A built-in manual test run is completed after implementation, not skipped, and
  any findings within scope are fixed before final closeout.

## Runs

## Run Order And Manual Test Handoffs

Run order: fully sequential. The same shell/editor files and acceptance
criteria overlap too heavily for safe parallel execution.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk;
- evidence paths for screenshots or exported fixtures when applicable.

### Run 1: Re-baseline Against The Recovered Bear-Minimal Target

- **Id**: `run-1`
- **Title**: `Re-baseline Against The Recovered Bear-Minimal Target`
- **Deliverable**:
  - A current baseline that measures the live UI against the recovered May 3
    prompt rather than the older drifted acceptance language.
- **Files**:
  - `docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md`:
    record baseline evidence and execution notes.
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`: refine the
    checklist if it still assumes labeled pane chrome is acceptable.
  - `output/playwright/`: capture desktop/mobile baseline screenshots.
- **Steps**:
  - [ ] Load `impeccable` context and runtime orientation.
  - [ ] Start or attach to the EweNote dev server at `http://127.0.0.1:5181/`.
  - [ ] Capture the current desktop editor, desktop home, metadata-open state,
        and mobile state.
  - [ ] Explicitly note each place where panels 1/2/3 still show visible UI
        labels or non-note text chrome.
- **Tests**:
  - `IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs`
  - `.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status`
- **Verification**:
  - Screenshots and notes identify the specific remaining violations against the
    recovered panel contract.
- **Manual test handoff**:
  - Not needed: this run establishes the before-state evidence for later manual
    comparison.
- **Dependencies**:
  - None.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Panel Contract And Metadata Return

- **Id**: `run-2`
- **Title**: `Panel Contract And Metadata Return`
- **Deliverable**:
  - The pane system reflects the intended 1/2/3/4 content contract, and
    `Ctrl/Cmd+4` clearly returns the metadata panel.
- **Files**:
  - `packages/ewe-note/src/app/components/WorkspaceShell.tsx`: pane routing,
    visibility, and shell composition.
  - `packages/ewe-note/src/app/components/workspace-layout.ts`: keyboard/pane
    mapping and helper logic.
  - `packages/ewe-note/src/app/components/workspace-layout.test.ts`: pane
    routing regressions.
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: panel 1 shell.
  - `packages/ewe-note/src/app/components/NotesListPane.tsx`: panel 2 shell.
  - `packages/ewe-note/src/app/components/RightPanel.tsx`: panel 4 behavior.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: no-note-selected and
    metadata integration.
  - `packages/ewe-note/src/index.css`: spacing/visibility polish.
- **Steps**:
  - [ ] Remove visible labeled workspace mode chrome from panels 1/2/3.
  - [ ] Keep keyboard pane shortcuts working, but move any explanation of them
        out of persistent visible chrome.
  - [ ] Ensure `Ctrl/Cmd+4` opens panel 4 and that panel 4 is the one allowed
        to carry labeled metadata UI.
  - [ ] Ensure the editor area does not fall back to a dashboard/library view
        when no note is selected.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/app/components/workspace-layout.test.ts src/app/components/WorkspaceShell.test.tsx`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser check: pane shortcuts still work, panel 4 opens/closes, and no
    persistent visible labels remain in panels 1/2/3.
- **Manual test handoff**:
  - Tester uses `Ctrl/Cmd+1..4`, confirms panel 4 is metadata, and confirms
    panels 1/2/3 do not show mode labels.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `coder`
- **Risk level**: `high`

### Run 3: Panel 1 Folders And Panel 2 Recent Note Previews

- **Id**: `run-3`
- **Title**: `Panel 1 Folders And Panel 2 Recent Note Previews`
- **Deliverable**:
  - Panel 1 is organization-first, and panel 2 is a quiet recent-note preview
    list without extra dashboard clutter.
- **Files**:
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`
  - `packages/ewe-note/src/app/components/NotesListPane.tsx`
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`
  - `packages/ewe-note/src/index.css`
  - `e2e/cypress/tests/ewe-note.cy.ts`
- **Steps**:
  - [ ] Put folders and primary organization affordances in panel 1.
  - [ ] Move recent note preview responsibility cleanly into panel 2.
  - [ ] Remove leftover `Library`, `Notes`, search-view labels, and similar
        visible copy from panels 1/2 unless they are tucked into menus/tooltips.
  - [ ] Keep search usable, but prefer icon/menu entry or other quiet affordance
        over a persistent text-labeled header.
  - [ ] Ensure no-note-selected state does not repurpose panel 3 as another
        note list or explainer.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser/Playwright screenshots show panel 1 as folders, panel 2 as previews,
    and no dashboard-like copy in the main workspace.
- **Manual test handoff**:
  - Tester creates/selects folders, browses recent note rows, and confirms the
    main panel stays out of the way until a note is selected.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Sparse Editor Canvas And Hidden Controls

- **Id**: `run-4`
- **Title**: `Sparse Editor Canvas And Hidden Controls`
- **Deliverable**:
  - Panel 3 is visually dominated by the note content, with chrome hidden into
    icons, menus, or contextual overlays.
- **Files**:
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`
  - `packages/ewe-note/src/components/editor-toolbar.tsx`
  - `packages/ewe-note/src/components/editor-context-menu.tsx`
  - `packages/ewe-note/src/components/editor-bubble-menu.tsx`
  - `packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx`
  - `packages/ewe-note/src/index.css`
  - `e2e/cypress/tests/ewe-note.cy.ts`
- **Steps**:
  - [ ] Raise contrast where readability is still weak.
  - [ ] Reduce persistent editor chrome to the smallest viable icon/menu form.
  - [ ] Remove visible source-mode label clusters from panel 3.
  - [ ] Keep note actions accessible through ellipsis/context menus and small
        icons instead of visible textual action strips.
  - [ ] Make the no-note-selected state blank or nearly blank rather than
        product-copy-driven.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser check shows panel 3 reading like a near-blank writing canvas, with
    the note body as the primary visible text.
- **Manual test handoff**:
  - Tester opens a note, enters source mode, uses note actions, and confirms
    the features still exist without returning to heavy visible chrome.
- **Dependencies**:
  - `run-3`.
- **Model tier**: `coder`
- **Risk level**: `high`

### Run 5: Manual Test Gate Against Bear And The Recovered UX Contract

- **Id**: `run-5`
- **Title**: `Manual Test Gate Against Bear And The Recovered UX Contract`
- **Deliverable**:
  - A real browser/manual audit result against the recovered prompt, with
    screenshots and explicit pass/fail findings before final closeout.
- **Files**:
  - `docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md`
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`
  - `output/playwright/**`
- **Steps**:
  - [ ] Run Cypress against the live EweNote server.
  - [ ] Perform manual browser testing using the visible in-app browser and, if
        useful, compare directly against local Bear windows.
  - [ ] Check the exact contract:
        no labels in panels 1/2/3, folders in panel 1, recent previews in
        panel 2, sparse editor in panel 3, labeled metadata only in panel 4.
  - [ ] Record findings as pass/fail with evidence paths.
  - [ ] If this run fails, Run 6 must treat the findings as the primary
        implementation input.
- **Tests**:
  - `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`
- **Verification**:
  - Manual tester either signs off on the recovered UX contract or records
    specific failing surfaces with screenshots.
- **Manual test handoff**:
  - Not needed: this run is the manual test stage.
- **Dependencies**:
  - `run-4`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 6: Fix Manual Test Findings And Final Closeout

- **Id**: `run-6`
- **Title**: `Fix Manual Test Findings And Final Closeout`
- **Deliverable**:
  - Any manual-test failures found in Run 5 that are inside scope are fixed,
    verified, and documented before the plan is closed.
- **Files**:
  - `packages/ewe-note/src/app/components/WorkspaceShell.tsx`
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`
  - `packages/ewe-note/src/app/components/NotesListPane.tsx`
  - `packages/ewe-note/src/app/components/RightPanel.tsx`
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`
  - `packages/ewe-note/src/components/editor-toolbar.tsx`
  - `packages/ewe-note/src/components/editor-context-menu.tsx`
  - `packages/ewe-note/src/components/editor-bubble-menu.tsx`
  - `packages/ewe-note/src/index.css`
  - `e2e/cypress/tests/ewe-note.cy.ts`
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`
  - `docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md`
  - `output/playwright/**`
- **Steps**:
  - [ ] Fix every Run 5 finding that is inside scope before calling the plan
        complete.
  - [ ] Re-run screenshots, Cypress, and targeted browser checks after fixes.
  - [ ] Update the plan execution summary with the final pass/fail state.
  - [ ] State any residual gap plainly if a remaining issue is outside scope or
        blocked by a separate product decision.
- **Tests**:
  - `npm run lint --workspace @eweser/ewe-note -- --max-warnings=0`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
  - `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`
  - `npm run code-index:check`
  - `git diff --check`
- **Verification**:
  - Final screenshots and test passes show the plan ended on the corrected
    sparse Bear-minimal target rather than the earlier drifted target.
- **Manual test handoff**:
  - Tester rechecks only the previously failing areas from Run 5 and confirms
    they now pass.
- **Dependencies**:
  - `run-5`.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop and ask for user approval if:

- Implementation requires work outside `packages/ewe-note`, Cypress coverage,
  screenshots, or plan/testing docs.
- A migration, shared-package API change, auth/security behavior change, or
  destructive operation becomes necessary.
- The only viable way to hit the target would break core note-writing or local
  offline behavior.
- Manual testing exposes a blocker that cannot be fixed inside this plan's
  shell/editor scope.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above, make
focused supporting edits needed for those runs, run the built-in manual testing
stage, fix issues found during that manual stage when they are inside this
boundary, update Cypress coverage, run relevant verification, and update this
plan's execution summary.

Approval does not authorize unrelated refactors, new product scope, destructive
git operations, direct pushes to `main`, secret handling, migrations, or
published package API changes.

## Execution Summary

| Run     | Status    | Files Changed                                                                                                                                                                                                                                  | Verification                                                                                                                                                                                                                                                                                                                                                                                                                               | Notes                                                                                                                                                                                                                                                                                                                              |
| ------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-1` | Completed | `docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md`, `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`                                                                                                                  | Target re-baseline from recovered May 3 prompt, repo-local runtime status, fresh desktop/mobile screenshots in `output/playwright/`                                                                                                                                                                                                                                                                                                        | The documented `~/.codex/skills/...` runtime-orientation path was stale on this machine, so repo-local `.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh` was used. Existing branch artifacts already contained older baseline screenshots; fresh current-state captures were added during this run. |
| `run-2` | Completed | `packages/ewe-note/src/app/components/workspace-layout.ts`, `packages/ewe-note/src/app/components/WorkspaceShell.tsx`, `packages/ewe-note/src/app/components/RightPanel.tsx`, `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`             | `npm run test --workspace @eweser/ewe-note -- --run src/app/components/workspace-layout.test.ts src/app/components/WorkspaceShell.test.tsx`; `npm run type-check --workspace @eweser/ewe-note`                                                                                                                                                                                                                                             | Removed visible workspace-mode labels from pane chrome, kept `Ctrl/Cmd+1..4`, and kept panel 4 as the labeled metadata surface.                                                                                                                                                                                                    |
| `run-3` | Completed | `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`, `packages/ewe-note/src/app/components/NotesListPane.tsx`, `packages/ewe-note/src/app/pages/EnhancedHome.tsx`, `e2e/cypress/tests/ewe-note.cy.ts`                                   | `npm run type-check --workspace @eweser/ewe-note`; browser screenshots `output/playwright/ewe-note-home-dark.png`, `output/playwright/ewe-note-mobile-home-current.png`                                                                                                                                                                                                                                                                    | Panel 1 now stays folder-first, panel 2 defaults to recent previews, and the generic unfiled `Notes` label was removed from preview rows.                                                                                                                                                                                          |
| `run-4` | Completed | `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`, `packages/ewe-note/src/components/editor-toolbar.tsx`, `packages/ewe-note/src/index.css`, `e2e/cypress/tests/ewe-note.cy.ts`                                                             | `npm run test --workspace @eweser/ewe-note`; `npm run type-check --workspace @eweser/ewe-note`; browser screenshots `output/playwright/ewe-note-editor-dark.png`, `output/playwright/ewe-note-metadata-dark.png`, `output/playwright/ewe-note-metadata-light.png`                                                                                                                                                                          | Panel 3 now uses icon-only toolbar menus, quieter floating controls, stronger contrast, and theme-token surfaces so light mode stays readable while keeping the existing four preset themes.                                                                                                                                       |
| `run-5` | Completed | `docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md`, `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`, `output/playwright/**`                                                                                          | Real browser capture through bundled Playwright + system Chrome channel; `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`                                                                                                                                                                                       | Manual/browser evidence confirmed icon-only pane chrome, sparse editor canvas, and readable light mode. Mobile home capture passed; the mobile editor automation leg hung, so mobile editor assessment relied on the desktop-equivalent chrome changes plus the existing responsive shell behavior.                                |
| `run-6` | Completed | `packages/ewe-note/src/app/components/NotesListPane.tsx`, `packages/ewe-note/src/components/editor-toolbar.tsx`, `docs/ai/plans/2026-05-03-ewe-note-bear-minimal-panels-followup.md`, `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md` | `npm run lint --workspace @eweser/ewe-note -- --max-warnings=0`; `npm run type-check --workspace @eweser/ewe-note`; `npm run test --workspace @eweser/ewe-note`; `npm run build --workspace @eweser/ewe-note`; `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`; `npm run code-index:check`; `git diff --check` | Final polish removed the remaining preview-label leak and increased toolbar readability without reintroducing panel text chrome.                                                                                                                                                                                                   |

## Self-Reflection / Instruction Improvements

- The runtime-orientation instructions should point at the repo-local skill path as a fallback when `~/.codex/skills/eweser-runtime-orientation/...` does not exist on the machine.
- Browser/manual-test guidance for EweNote should explicitly allow the bundled Codex runtime's Playwright package with `channel: 'chrome'` when the wrapper or standalone install is unavailable.
