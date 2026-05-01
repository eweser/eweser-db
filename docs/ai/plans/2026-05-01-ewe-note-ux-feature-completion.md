# Plan: EweNote UX and Feature Completion

## Goal

Make EweNote feel like a trustworthy local-first note app by fixing launch-blocking app-shell, PWA/offline, sync-status, organization, task, settings, and manual-test handoff gaps while routing editor-core failures into the ProseMirror migration plan.

## Scope

- In:
  - `packages/ewe-note` app shell, responsive layout, PWA manifest/service-worker behavior, visible sync/auth status, settings, folders, command palette, tasks view, right panel integration, and user-facing copy for incomplete sharing/collaboration.
  - Manual tester checklist and handoff updates.
  - Coordination with `docs/ai/plans/2026-04-06-tiptap-migration.md` for editor-owned work.
- Out:
  - Replacing BlockNote or implementing the new editor core in this plan. That is handled by `docs/ai/plans/2026-04-06-tiptap-migration.md`.
  - Real multi-user sharing/access grants beyond truthful placeholder copy and affordance cleanup.
  - Native mobile/Capacitor work.
  - Backend auth, sync-server, or PostgreSQL changes unless a later implementation run proves they are strictly required and asks for approval.

## Assumptions / Open Questions

- Assumption: EweNote must be usable before login. Auth is for sync, not for basic note-taking.
- Assumption: The first screen should remain the notes workspace, not onboarding or marketing.
- Assumption: The app is pre-live, so clean UX/data model fixes can break unused prototype behavior if documented.
- Assumption: Editor text scale, markdown task serialization, title/body conflict, and outline heading command behavior should be solved or finalized during the ProseMirror editor plan.
- Assumption: The current PWA manifest `start_url` and `scope` are wrong for local dev because the active React routes are rooted at `/`, `/editor/:noteId`, and `/settings`, not `/notes/`.
- Open question: Should templates remain local-only for the next launch pass, or move into user-owned EweserDB data? This does not block launch-blocker fixes.
- Open question: Should Tasks become an actionable task manager now, or should the UI stay read-only but be clearly framed as "tasks found in notes"? Current testing suggests the visible Tasks nav should not imply more than it does.

## Verified Findings Driving This Plan

- P1: Mobile editor is effectively unusable at `390x844`; the fixed sidebar consumes most of the viewport and clips the editor. Evidence path: `output/playwright/ewe-note-mobile-editor.png`.
- P1: PWA manifest starts at `/notes/`, but `/notes/` 404s in the current React Router app.
- P2: Offline reload after first load showed Chromium `ERR_INTERNET_DISCONNECTED`, undermining the offline-first/PWA claim.
- P2: Title model is confusing: header title can persist while editor heading and home preview still show stale `Untitled`.
- P2: Auth/sync failure logs repeated `http://localhost:38180/ping` errors while the UI does not expose connection state.
- P2: Command palette Escape did not close in CLI browser testing and left an intercepting overlay.
- P3: Folder creation uses an invisible/native prompt path that failed in browser automation and feels unfinished.
- Prior manual test also flagged unreliable tasks, thin settings, right-panel overlay behavior, sparse empty states, and underbuilt sharing/folder UX.

## Runs

## Run Order And Manual Test Handoffs

Run order: Run 1 first because it fixes launch blockers. Runs 2 and 3 may run concurrently in separate worktrees after Run 1 if their write sets stay separate. Runs 4-6 are sequential because they depend on settled status/settings/folder behavior. Run 7 closes with checklist and regression updates.

After each completed run, Coder must update the Execution Summary and add a manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Mobile Shell and PWA Launch Blockers

- **Id**: `run-1`
- **Title**: `Mobile Shell and PWA Launch Blockers`
- **Deliverable**:
  - EweNote editor/home/settings are usable on narrow mobile widths, the PWA manifest starts on a valid route, and offline reload behavior matches the product claim or the claim is corrected.
- **Files**:
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: responsive collapse/drawer behavior and mobile navigation affordance.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: mobile header/editor layout and right-panel behavior.
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`: mobile layout constraints.
  - `packages/ewe-note/src/app/pages/Settings.tsx`: mobile layout constraints.
  - `packages/ewe-note/public/manifest.webmanifest`: fix `start_url`/`scope`.
  - `packages/ewe-note/src/pwa.ts`: verify/register offline-ready behavior and update UX events as needed.
  - `packages/ewe-note/README.md`: align offline/PWA claims if implementation cannot make offline reload reliable in this run.
- **Steps**:
  - [ ] Replace always-visible fixed sidebar with a desktop sidebar plus mobile drawer/sheet or collapsible nav.
  - [ ] Ensure mobile editor has a reachable content area, visible title/actions, and no horizontal clipping at `390x844`.
  - [ ] Make right panel a drawer on mobile and a non-obscuring side panel on desktop.
  - [ ] Change manifest start/scope to valid routes for the deployed app shape.
  - [ ] Test offline reload after first load; either fix service-worker caching for the app shell or downgrade visible claims and add honest offline-status copy.
  - [ ] Add screenshots for desktop and mobile verification.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run test --workspace @eweser/ewe-note`
- **Verification**:
  - Browser/Playwright: open `/`, `/editor/:noteId`, `/settings` at desktop and `390x844`; fetch manifest and open its `start_url`; simulate offline reload after first load.
- **Manual test handoff**:
  - Tester reruns checklist sections 1, 2, 15, and 16, using `output/playwright/ewe-note-mobile-editor.png` as the before-state reference.
- **Dependencies**:
  - None.
- **Model tier**: `coder`
- **Risk level**: `high`

### Run 2: Visible Local/Sync/Auth Status

- **Id**: `run-2`
- **Title**: `Visible Local/Sync/Auth Status`
- **Deliverable**:
  - Users can tell whether EweNote is local-only, signed out, offline, syncing, synced, or unable to reach auth/sync services without opening the console.
- **Files**:
  - `packages/ewe-note/src/db.tsx`: expose safe status fields/events already known to the app, without leaking secrets.
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: status badge in sidebar/account area.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: compact editor/header status.
  - `packages/ewe-note/src/app/pages/Settings.tsx`: expanded diagnostics/status section.
  - `packages/ewe-note/src/config.ts`: ensure displayed homeserver/auth URL is technically correct.
- **Steps**:
  - [ ] Identify current DB/auth/ping/provider status sources.
  - [ ] Add a small status model: `local-only`, `signed-out`, `connecting`, `synced`, `offline`, `auth-unreachable`, `sync-error`.
  - [ ] Stop noisy auth ping failures from being invisible app state; show degraded local-only mode when auth is unavailable.
  - [ ] Surface last successful sync/connect time when available; otherwise avoid fake precision.
  - [ ] Add Settings diagnostics copy that explains notes are local first and sync is additive.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - Focused tests for any new status helper.
- **Verification**:
  - Browser: signed out with auth server unavailable, normal online, browser offline.
- **Manual test handoff**:
  - Tester reruns checklist section 13 and records status text/badge screenshots.
- **Dependencies**:
  - None.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 3: Folders and Organization UX

- **Id**: `run-3`
- **Title**: `Folders and Organization UX`
- **Deliverable**:
  - Folder creation and management use visible UI, not native prompts, and folder/share affordances do not overpromise real collaboration.
- **Files**:
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: replace prompt-based folder creation and improve folder empty/actions UI.
  - `packages/ewe-note/src/app/components/ShareFolderDialog.tsx`: clarify placeholder/access-boundary copy.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: use existing folder APIs; no schema changes expected.
  - `packages/ewe-note/src/notes-room.tsx`: inspect folder API behavior; update only if required for rename/delete flow reliability.
- **Steps**:
  - [ ] Replace `prompt('Folder name:')` with a visible dialog or inline input that works in browser automation.
  - [ ] Add rename/delete/share actions for folders with clear disabled states for shared-room entries.
  - [ ] Add useful empty state when there are no folders and when a folder has no notes.
  - [ ] Preserve drag/drop move behavior, but do not make drag/drop the only visible way to move notes.
  - [ ] Make share copy explicit: copy-link is not real access control unless the backend grant flow exists.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - Existing folder/layout tests plus new component tests if practical.
- **Verification**:
  - Browser: create, rename, delete folder; create note in folder; move note into folder; open share dialog.
- **Manual test handoff**:
  - Tester reruns checklist sections 6 and 14.
- **Dependencies**:
  - None.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Settings as Data-Control Center

- **Id**: `run-4`
- **Title**: `Settings as Data-Control Center`
- **Deliverable**:
  - Settings communicates account, local data, sync, PWA/offline, import/export, and diagnostics clearly enough for a technical beta user.
- **Files**:
  - `packages/ewe-note/src/app/pages/Settings.tsx`: expand settings sections.
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: ensure account/settings entries match new status model.
  - `packages/ewe-note/src/cli/*`: inspect only for accurate import/export copy unless UI hooks are explicitly added.
  - `packages/ewe-note/README.md`: align feature claims with surfaced settings.
- **Steps**:
  - [ ] Add Local Data section: local-first explanation, browser storage caveat, and storage/status if cheaply available.
  - [ ] Add Sync section: status, homeserver/auth URL, auth-unreachable messaging, sign-in boundary.
  - [ ] Add Import/Export section that exposes current note export and describes vault CLI support without pretending full UI import exists.
  - [ ] Add PWA/Offline section showing install/offline readiness if detectable.
  - [ ] Add a Diagnostics section for app version/build route/service-worker status if available.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser: settings desktop/mobile, signed out, auth unavailable, offline if practical.
- **Manual test handoff**:
  - Tester reruns checklist sections 13 and 15.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Tasks, Right Panel, and Command Palette Product Truthfulness

- **Id**: `run-5`
- **Title**: `Tasks, Right Panel, and Command Palette Product Truthfulness`
- **Deliverable**:
  - The app either makes tasks/right-panel/palette interactions reliable or reduces their prominence/copy so the UI does not imply unavailable behavior.
- **Files**:
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`: tasks view empty/action states and source-note navigation.
  - `packages/ewe-note/src/app/components/RightPanel.tsx`: non-obscuring layout, metadata reliability, outline affordance.
  - `packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx`: Escape/focus/overlay fixes and discoverability.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: task/link extraction only if not handled in editor migration.
  - `docs/ai/plans/2026-04-06-tiptap-migration.md`: leave editor-owned task/outline serialization notes in execution summary if implementation confirms dependency.
- **Steps**:
  - [ ] Fix command palette Escape handling and focus return.
  - [ ] Ensure palette overlay never traps clicks after close or failed close.
  - [ ] Keep Tasks as "found in notes" unless this run implements real task toggling; add source-note navigation and clear empty states.
  - [ ] Remove or disable outline click affordance until the ProseMirror plan wires heading navigation.
  - [ ] Ensure right panel does not cover desktop editor content unexpectedly and behaves like a drawer on constrained screens.
  - [ ] Keep tags/properties edits consistent with frontmatter and header badges.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - Add Cypress/component coverage if selectors already exist from `docs/ai/plans/2026-04-11-ewe-note-feature-tests.md`.
- **Verification**:
  - Browser: command palette search/create/Escape, tasks empty and task-source navigation, right panel tabs and close behavior.
- **Manual test handoff**:
  - Tester reruns checklist sections 7, 9, 10, and 11.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 6: Home, Empty States, and Visual Density Pass

- **Id**: `run-6`
- **Title**: `Home, Empty States, and Visual Density Pass`
- **Deliverable**:
  - Home, tasks, settings, folders, and missing/error states feel complete rather than sparse placeholders.
- **Files**:
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`: home dashboard density, cards/list previews, empty states.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: missing-note and editor empty states.
  - `packages/ewe-note/src/app/pages/Settings.tsx`: spacing and responsive polish after Run 4.
  - `packages/ewe-note/src/index.css` and theme CSS: focused visual polish, avoiding broad design-system churn.
- **Steps**:
  - [ ] Improve no-notes, no-pinned, no-tasks, no-folder-notes, no-search-results, missing-note, offline/auth-unavailable empty/error states.
  - [ ] Tune card/list previews so raw markdown leakage is reduced without hiding useful content.
  - [ ] Improve visual hierarchy and spacing while preserving the existing dark product direction.
  - [ ] Verify controls have stable sizes and do not shift when badges/counts change.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser screenshots of home, tasks, settings, missing note, mobile home/editor.
- **Manual test handoff**:
  - Tester reruns checklist sections 1, 5, 16, 17, and 18.
- **Dependencies**:
  - `run-1`, `run-4`, `run-5`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 7: Checklist, Regression Tests, and Final Manual-Test Handoff

- **Id**: `run-7`
- **Title**: `Checklist, Regression Tests, and Final Manual-Test Handoff`
- **Deliverable**:
  - The browser tester has an updated checklist with expected limitations, and the app has focused regression coverage for the UX bugs fixed in this plan.
- **Files**:
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`: update expectations and add known limitations.
  - `docs/ai/plans/2026-05-01-ewe-note-ux-feature-completion.md`: update execution summary and manual-test handoffs.
  - `docs/ai/plans/2026-04-11-ewe-note-feature-tests.md`: update or cross-reference current Cypress priorities.
  - `e2e/cypress/tests/ewe-note.cy.ts`: add focused coverage where the existing setup can support it.
- **Steps**:
  - [ ] Update the tester checklist so it distinguishes current launch scope from aspirational features.
  - [ ] Add regression checks for manifest start URL, mobile editor reachability, folder dialog visibility, command palette Escape, and visible status messaging where feasible.
  - [ ] Record remaining incomplete/aspirational features in the plan execution summary.
  - [ ] Produce a final manual-test handoff with routes, commands, data assumptions, screenshots to capture, and stop conditions.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - Relevant Cypress command for EweNote if local dev server is available.
- **Verification**:
  - Dry-run the handoff locally enough to confirm routes/commands are current.
- **Manual test handoff**:
  - This run creates the final handoff.
- **Dependencies**:
  - Runs 1-6.
- **Model tier**: `fast`
- **Risk level**: `low`

## Stop Conditions

Stop and ask for user approval if:

- Fixing offline/PWA behavior requires changing deployment topology, Caddy routes, or backend services outside `packages/ewe-note`.
- Implementation requires a public package API change or changeset.
- The UX plan needs to implement the ProseMirror editor migration directly rather than depending on the editor plan.
- Real sharing/access grants, auth-token behavior, or destructive local-data controls become necessary.
- Browser verification shows potential data loss that cannot be fixed inside this plan.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above inside `packages/ewe-note`, update EweNote docs/checklists/plans, add focused tests, run relevant verification, perform internal QA, fix issues found inside this boundary, and update this plan's execution summary.

Approval does not authorize the ProseMirror editor migration itself, unrelated EweserDB SDK changes, backend auth/sync changes, real collaboration grants, destructive data operations, direct pushes to `main`, or published package API changes not called out above.

## Execution Summary

| Run     | Status      | Files Changed | Verification | Notes |
| ------- | ----------- | ------------- | ------------ | ----- |
| `run-1` | Not started |               |              |       |
| `run-2` | Not started |               |              |       |
| `run-3` | Not started |               |              |       |
| `run-4` | Not started |               |              |       |
| `run-5` | Not started |               |              |       |
| `run-6` | Not started |               |              |       |
| `run-7` | Not started |               |              |       |

## Self-Reflection / Instruction Improvements

- None yet.
