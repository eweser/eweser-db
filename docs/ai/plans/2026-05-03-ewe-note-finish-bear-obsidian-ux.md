# Plan: Finish EweNote Bear-Clean Obsidian-Capable UX

## Goal

Finish the current EweNote TipTap workspace so it is launch-credible as a calm
Bear-style writing app with Obsidian-style note power, with mobile, offline
trust, folder/status/settings, and final browser QA handled in one coordinated
coder run.

<!-- eweser-orchestration -->

```yaml
orchestration:
  enabled: true
  maxParallel: 2
  baseBranch: codex/ewe-note-obsidian-editor-pr
  finalStages:
    - qa
  notes:
    - Start from the current TipTap workspace parity branch, not clean main.
    - Preserve unrelated local changes unless the user explicitly approves reverting them.
    - If the orchestrator cannot use this branch/worktree as the worker base, stop before spawning mutating workers.
runs:
  - id: run-1
    title: Baseline Current State and Acceptance Harness
    agent: eweser-coder
    model: strong
    parallel: false
    dependsOn: []
    writeScope:
      - docs/ai/plans/2026-05-03-ewe-note-finish-bear-obsidian-ux.md
      - docs/ai/testing/ewe-note-ux-feature-audit-checklist.md
      - output/playwright/**
    tests:
      - IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs
      - .codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status
    changeset: no
  - id: run-2
    title: Mobile Shell and Pane Controls
    agent: eweser-coder
    model: coding
    parallel: false
    dependsOn:
      - run-1
    writeScope:
      - packages/ewe-note/src/app/components/WorkspaceShell.tsx
      - packages/ewe-note/src/app/components/workspace-layout.ts
      - packages/ewe-note/src/app/components/workspace-layout.test.ts
      - packages/ewe-note/src/app/components/NotesListPane.tsx
      - packages/ewe-note/src/app/components/EnhancedSidebar.tsx
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/src/app/pages/EnhancedHome.tsx
      - packages/ewe-note/src/app/pages/Settings.tsx
      - packages/ewe-note/src/index.css
    tests:
      - npm run test --workspace @eweser/ewe-note -- --run src/app/components/workspace-layout.test.ts
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-3
    title: Bear-Clean Library and Note List
    agent: eweser-coder
    model: coding
    parallel: true
    dependsOn:
      - run-2
    writeScope:
      - packages/ewe-note/src/app/pages/EnhancedHome.tsx
      - packages/ewe-note/src/app/components/NotesListPane.tsx
      - packages/ewe-note/src/app/components/EnhancedSidebar.tsx
      - packages/ewe-note/src/index.css
      - packages/ewe-note/DESIGN.md
    tests:
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-4
    title: Folders, Organization, and Truthful Sharing
    agent: eweser-coder
    model: coding
    parallel: true
    dependsOn:
      - run-2
    writeScope:
      - packages/ewe-note/src/app/components/EnhancedSidebar.tsx
      - packages/ewe-note/src/app/components/ShareFolderDialog.tsx
      - packages/ewe-note/src/app/contexts/NotesContext.tsx
      - packages/ewe-note/src/components/folder-dialog.tsx
      - e2e/cypress/tests/ewe-note.cy.ts
    tests:
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-5
    title: Local Sync Status, PWA Trust, and Settings
    agent: eweser-coder
    model: coding
    parallel: true
    dependsOn:
      - run-2
    writeScope:
      - packages/ewe-note/src/db.tsx
      - packages/ewe-note/src/config.ts
      - packages/ewe-note/src/pwa.ts
      - packages/ewe-note/src/pwa.test.ts
      - packages/ewe-note/public/manifest.webmanifest
      - packages/ewe-note/src/app/pages/Settings.tsx
      - packages/ewe-note/src/app/components/EnhancedSidebar.tsx
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/README.md
    tests:
      - npm run test --workspace @eweser/ewe-note -- --run src/pwa.test.ts src/config.test.ts
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-6
    title: Editor Chrome and Metadata Polish
    agent: eweser-coder
    model: coding
    parallel: false
    dependsOn:
      - run-3
      - run-4
      - run-5
    writeScope:
      - packages/ewe-note/src/app/pages/EnhancedEditor.tsx
      - packages/ewe-note/src/app/components/RightPanel.tsx
      - packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx
      - packages/ewe-note/src/components/editor-toolbar.tsx
      - packages/ewe-note/src/components/editor-context-menu.tsx
      - packages/ewe-note/src/components/editor-bubble-menu.tsx
      - packages/ewe-note/src/editor/commands.ts
      - packages/ewe-note/src/index.css
    tests:
      - npm run test --workspace @eweser/ewe-note
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-7
    title: Obsidian Export/Open Check and Bear Visual QA
    agent: eweser-coder
    model: strong
    parallel: false
    dependsOn:
      - run-6
    writeScope:
      - packages/ewe-note/src/cli/import-vault.test.ts
      - packages/ewe-note/src/cli/vault-sync.test.ts
      - packages/ewe-note/src/editor/markdown.test.ts
      - packages/ewe-note/test-fixtures/obsidian-parity/**
      - docs/ai/testing/ewe-note-ux-feature-audit-checklist.md
      - output/playwright/**
    tests:
      - npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts src/cli/import-vault.test.ts src/cli/vault-sync.test.ts
      - npm run build --workspace @eweser/ewe-note
    changeset: no
  - id: run-8
    title: Final Cypress, Build, Docs, and Plan Closeout
    agent: eweser-coder
    model: fast
    parallel: false
    dependsOn:
      - run-7
    writeScope:
      - e2e/cypress/tests/ewe-note.cy.ts
      - docs/ai/testing/ewe-note-ux-feature-audit-checklist.md
      - docs/ai/plans/2026-05-03-ewe-note-finish-bear-obsidian-ux.md
      - packages/ewe-note/README.md
      - packages/ewe-note/INDEX.md
      - packages/ewe-note/src/INDEX.md
      - packages/ewe-note/src/app/INDEX.md
      - packages/ewe-note/src/components/INDEX.md
    tests:
      - npm run lint --workspace @eweser/ewe-note -- --max-warnings=0
      - npm run type-check --workspace @eweser/ewe-note
      - npm run test --workspace @eweser/ewe-note
      - npm run build --workspace @eweser/ewe-note
      - EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts
      - npm run code-index:check
    changeset: no
```

## Scope

- In:
  - `packages/ewe-note` app shell, responsive pane behavior, editor chrome,
    note list/library surfaces, folder management, settings, sync/offline
    status, PWA trust cues, command palette/product copy, right panel, CSS
    polish, and app docs/checklists/tests.
  - Browser verification artifacts under `output/playwright/`.
  - Existing EweNote Cypress smoke coverage and focused Vitest tests.
  - Manual comparison against the currently running Bear and Obsidian desktop
    apps when available.
- Out:
  - Full Obsidian plugin ecosystem, graph view, Canvas, Bases, multi-note split
    editing, and custom hotkey settings.
  - Backend auth, sync-server, PostgreSQL, Caddy, or deployment topology changes.
  - Published `@eweser/db`, `@eweser/shared`, or `@eweser/examples-components`
    API changes.
  - Native mobile or Capacitor work.
  - Real multi-user folder sharing/access grants beyond truthful UI copy.

## Assumptions / Open Questions

- Assumption: The current base is the TipTap parity branch
  `codex/ewe-note-obsidian-editor-pr`, where
  `docs/ai/plans/2026-05-02-obsidian-editor-parity.md` marks runs 1-11 and
  manual retest fixes complete.
- Assumption: This plan finishes launch credibility, not full Obsidian product
  parity. It should leave explicit deferred scope for graph/canvas/plugins.
- Assumption: Bear is the cleanliness reference: restrained sidebars, polished
  note rows, text-first hierarchy, and peripheral formatting controls.
- Assumption: Obsidian is the capability reference: file/folder orientation,
  links/backlinks, source fallback, properties, and command depth.
- Assumption: EweNote remains useful while signed out and offline. Auth/sync are
  additive and must not block local writing.
- Assumption: Existing package-level `PRODUCT.md` and `DESIGN.md` are current
  guidance and should be loaded before visual edits.
- Assumption: Native browser `prompt()` calls are acceptable only as temporary
  fallbacks. Coder should remove visible prompt-driven primary workflows where
  they affect note, folder, link, or metadata work.
- Open question: Whether to richly render math/Mermaid/media embeds remains
  deferred unless implementation can do it safely without new dependency risk.
- Open question: Whether to support true responsive mode 3 at 390px or force
  mobile into one-pane navigation is an implementation decision inside Run 2.
  Acceptance is that users can reach and use the editor on narrow widths without
  horizontal clipping or hidden content.

## Verified Current State

- Package context exists: `packages/ewe-note/PRODUCT.md` defines the product as
  "Quiet, capable, precise" and explicitly says the note is primary and metadata
  supportive.
- Package design guidance exists: `packages/ewe-note/DESIGN.md` defines the
  north star as "A Quiet Writing Desk With Hidden Drawers" and rejects dashboard
  composition.
- Live local app inspection on `http://127.0.0.1:5181/` showed the first screen
  still reads like a dashboard/card explainer: shortcut cards, metric tiles, and
  product teaching compete with the note workflow.
- Live local editor inspection showed the editor is closer to the target, but
  the persistent toolbar and header chrome still draw more attention than Bear
  would, and the app still exposes numeric pane controls (`1 2 3 4`) without
  enough product-language affordance.
- Playwright 390px inspection showed the default mode can leave the sidebar and
  note list consuming the viewport, with the editor not reachable. Narrow-width
  editor-only mode is usable, but default responsive behavior is not launch-grade.
- `docs/ai/plans/2026-05-01-ewe-note-ux-feature-completion.md` still has all
  seven runs marked Not started and includes still-relevant launch blockers:
  mobile shell, manifest/offline, status, folders, settings, right panel, command
  palette, and empty states.
- `e2e/cypress/tests/ewe-note.cy.ts` still has a test named "creates a folder
  from the sidebar prompt", which proves prompt-based folder creation is part of
  current tested behavior and should be replaced with visible UI plus updated
  coverage.
- `rg` found remaining prompt/confirm uses in editor commands, sidebar rename,
  folder creation, note deletion, templates, and PWA refresh. Coder should remove
  prompt-driven primary UX where practical and keep confirmations only where
  destructive or browser/PWA-mediated.
- Current route shell is under `packages/ewe-note/src/app/`; legacy components
  still exist, so implementation must trace active imports before editing.

## Target Acceptance

Coder is done only when all of these are true:

- Opening `/` shows a note/library workspace, not a dashboard-first explainer.
- Opening `/editor/:noteId` makes the note title/body visually primary.
- At desktop width, modes or equivalent pane controls support write, browse,
  organize, and inspect states without using raw `1 2 3 4` as the only visible
  language.
- At `390x844`, a user can create/open/edit a note, reach search/navigation,
  and close metadata without horizontal clipping.
- Folder create/rename/delete/move flows use visible UI and updated tests, not
  Cypress-stubbed native prompts.
- Sync/offline/auth state is visible in the shell and Settings without leaking
  secrets or pretending sync is active when services are unavailable.
- Settings communicates account, local data, sync, PWA/offline, import/export,
  and diagnostics clearly.
- Right panel links/outline/meta remain secondary, closeable, and non-obscuring.
- Source Mode, table round-trip, wiki links/backlinks, properties, and OFM
  preservation from the parity branch still pass tests.
- Cypress smoke passes against the running EweNote dev server.
- Manual screenshots exist for desktop home, desktop editor, desktop metadata,
  mobile home, mobile editor, settings, and at least one Bear/Obsidian comparison
  note in the final handoff.

## Runs

## Run Order And Manual Test Handoffs

Run order: Run 1 must happen first. Run 2 must happen before visual or feature
polish because mobile and pane semantics define the shell contract. Runs 3, 4,
and 5 can run concurrently after Run 2 only if the orchestrator can guarantee
disjoint write scopes or merge carefully; otherwise run them sequentially in the
listed order. Runs 6-8 are sequential.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk;
- evidence paths for screenshots or exported fixtures when applicable.

### Run 1: Baseline Current State and Acceptance Harness

- **Id**: `run-1`
- **Title**: `Baseline Current State and Acceptance Harness`
- **Deliverable**:
  - A verified starting snapshot and explicit acceptance checklist for the
    current branch, so later workers do not optimize against stale assumptions.
- **Files**:
  - `docs/ai/plans/2026-05-03-ewe-note-finish-bear-obsidian-ux.md`: update
    execution notes and baseline evidence paths.
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`: update only if
    checklist sections are stale for the current TipTap shell.
  - `output/playwright/`: add baseline screenshots for desktop home, desktop
    editor, desktop metadata if reachable, mobile home, mobile editor/current
    failure, and settings.
- **Steps**:
  - [ ] Load EweNote design context:
        `IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs`.
  - [ ] Run runtime orientation from the repo-local skill first:
        `.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status`.
  - [ ] Start or attach to the EweNote dev server:
        `VITE_AUTH_SERVER=http://localhost:38101 VITE_AUTH_PAGES_URL=http://localhost:3001 npm run dev --workspace @eweser/ewe-note -- --host 127.0.0.1`.
  - [ ] Capture Playwright screenshots at desktop and `390x844`.
  - [ ] Inspect the active route shell imports before editing. Confirm active
        files are under `packages/ewe-note/src/app/` and `src/components/`.
  - [ ] Confirm the local working tree and branch. Preserve unrelated dirty
        files, especially skill/instruction edits outside `packages/ewe-note`.
- **Tests**:
  - `IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs`
  - `.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status`
- **Verification**:
  - Screenshots and DOM snapshots prove the baseline issues: dashboard-like
    home, mobile editor reachability, prompt-driven folder flow, missing/weak
    visible sync/offline status.
- **Manual test handoff**:
  - Not needed as a separate handoff; this run creates the before-state evidence
    that later manual testers compare against.
- **Dependencies**:
  - None.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Mobile Shell and Pane Controls

- **Id**: `run-2`
- **Title**: `Mobile Shell and Pane Controls`
- **Deliverable**:
  - EweNote is structurally usable at mobile width, and pane controls are
    understandable product controls rather than unexplained numbers.
- **Files**:
  - `packages/ewe-note/src/app/components/WorkspaceShell.tsx`: responsive shell
    behavior, mobile pane/drawer model, metadata close path.
  - `packages/ewe-note/src/app/components/workspace-layout.ts`: mode labels,
    responsive defaults, helper behavior, tests.
  - `packages/ewe-note/src/app/components/workspace-layout.test.ts`: cover mode
    mapping, editable target guards, responsive helper logic if added.
  - `packages/ewe-note/src/app/components/NotesListPane.tsx`: replace raw
    `1 2 3 4` controls with labeled/icon affordances or a compact segmented
    control that remains understandable.
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: mobile drawer or
    rail behavior; do not leave fixed sidebar consuming narrow screens.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: mobile header/content
    constraints and right-panel close integration.
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`: mobile landing/library
    constraints.
  - `packages/ewe-note/src/app/pages/Settings.tsx`: mobile settings constraints.
  - `packages/ewe-note/src/index.css`: responsive shell, toolbar, table, and
    overflow safeguards.
- **Steps**:
  - [ ] Decide the mobile shell rule and implement consistently:
        one-pane navigation with explicit transitions, or a drawer plus editor
        surface. Do not just shrink all desktop panes.
  - [ ] Ensure `/`, `/editor/:noteId`, `/settings`, and metadata-visible mode
        are usable at `390x844`.
  - [ ] Replace or supplement numeric pane controls with labels such as
        `Write`, `Browse`, `Organize`, `Inspect`, with shortcuts shown as
        secondary details.
  - [ ] Preserve `Ctrl/Cmd+1..4` keyboard shortcuts on desktop and ignore them
        inside editable targets.
  - [ ] Ensure metadata/right panel is closeable on mobile and cannot trap the
        editor.
  - [ ] Add screenshots for mobile home/editor/settings after the fix.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/app/components/workspace-layout.test.ts`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser/Playwright at `390x844`: create/open/edit a note, switch to
    navigation, open/close metadata, visit settings, no horizontal clipping.
- **Manual test handoff**:
  - Tester opens `http://127.0.0.1:5181/`, resizes to `390x844`, creates a
    note, types text, opens search/navigation, opens and closes note info, and
    confirms the editor remains reachable.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `coder`
- **Risk level**: `high`

### Run 3: Bear-Clean Library and Note List

- **Id**: `run-3`
- **Title**: `Bear-Clean Library and Note List`
- **Deliverable**:
  - `/` and the left/middle panes feel like a polished note library, not a
    dashboard or product tour.
- **Files**:
  - `packages/ewe-note/src/app/pages/EnhancedHome.tsx`: replace dashboard cards,
    metric tiles, and shortcut teaching with a note/library-first state.
  - `packages/ewe-note/src/app/components/NotesListPane.tsx`: refine row density,
    selected state, preview, date/folder/tag hierarchy, empty states, and search.
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: reduce visual
    noise and keep folders/supporting nav calmer.
  - `packages/ewe-note/src/index.css`: targeted typography, spacing, focus, and
    selection tuning.
  - `packages/ewe-note/DESIGN.md`: update only if implementation creates durable
    token/component guidance that future work should follow.
- **Steps**:
  - [ ] Remove home metric cards such as notes/folders/pane modes as primary UI.
  - [ ] Make the first screen prioritize recent/current notes and one clear
        create-note action.
  - [ ] Keep shortcut education discoverable but secondary, for example in
        command palette help or a compact hint, not a large home card.
  - [ ] Tune note rows for Bear-like scannability: title, date, preview, small
        folder/tag context, subtle selected background.
  - [ ] Avoid nested cards, heavy borders, decorative fills, or bright accent
        usage.
  - [ ] Add empty states for no notes, no search results, no tasks, no folders,
        no folder notes, and no recent notes.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser/Playwright screenshots: zero-note state if practical, one-note
    state, many-note seeded state, selected note row, search empty result, tasks
    empty state.
- **Manual test handoff**:
  - Tester compares EweNote against Bear screenshots: sidebar/list should be
    quiet, selected note clear, chrome secondary, no dashboard feel.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Folders, Organization, and Truthful Sharing

- **Id**: `run-4`
- **Title**: `Folders, Organization, and Truthful Sharing`
- **Deliverable**:
  - Folder workflows are visible, testable, and honest about current sharing
    limitations.
- **Files**:
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: visible
    create/rename/delete folder flow, folder empty states, move actions.
  - `packages/ewe-note/src/app/components/ShareFolderDialog.tsx`: clarify that
    link sharing is not real access control until grants exist.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: adjust folder helpers
    only if needed for reliable rename/delete/move behavior.
  - `packages/ewe-note/src/components/folder-dialog.tsx`: reuse or adapt the
    existing visible dialog if it fits the active redesigned shell.
  - `e2e/cypress/tests/ewe-note.cy.ts`: replace the prompt-stub folder test with
    visible UI assertions.
- **Steps**:
  - [ ] Replace `prompt('Folder name:')` and note rename prompts in primary
        folder/note-list workflows with visible inline input, dialog, or menu
        affordances.
  - [ ] Keep destructive note/folder delete confirmations, but ensure they are
        not the only way to understand the action.
  - [ ] Add folder rename/delete and note move affordances that are discoverable
        without relying only on drag/drop.
  - [ ] Preserve existing local-first folder storage and avoid backend/schema
        changes.
  - [ ] Make shared-folder copy explicit: real collaboration/access grants are
        not implemented in this plan.
  - [ ] Update Cypress coverage so folder creation no longer stubs
        `window.prompt`.
- **Tests**:
  - `npm run type-check --workspace @eweser/ewe-note`
  - Cypress folder flow through visible UI after Run 8 local server setup.
- **Verification**:
  - Browser: create folder, rename folder, create note in folder, move note to
    folder, delete folder if supported, open share dialog and confirm truthful
    copy.
- **Manual test handoff**:
  - Tester runs folder CRUD and verifies no primary folder flow uses a native
    prompt.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Local Sync Status, PWA Trust, and Settings

- **Id**: `run-5`
- **Title**: `Local Sync Status, PWA Trust, and Settings`
- **Deliverable**:
  - Users can tell what is local, what is syncing, what failed, and how their
    data is controlled.
- **Files**:
  - `packages/ewe-note/src/db.tsx`: expose safe local/auth/sync state fields or
    events already available to the app.
  - `packages/ewe-note/src/config.ts`: ensure displayed auth/homeserver URLs are
    accurate for local and deployed origins.
  - `packages/ewe-note/src/pwa.ts`: visible offline-ready/update events without
    misleading claims.
  - `packages/ewe-note/src/pwa.test.ts`: update tests for any PWA status helper.
  - `packages/ewe-note/public/manifest.webmanifest`: correct `start_url`,
    `scope`, name/theme/background as needed for current routes.
  - `packages/ewe-note/src/app/pages/Settings.tsx`: make Settings a data-control
    center: account, local data, sync, PWA/offline, import/export, diagnostics.
  - `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`: compact status
    in account/footer area.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: compact editor status
    only if it does not compete with the note.
  - `packages/ewe-note/README.md`: align feature claims with actual status/PWA
    behavior.
- **Steps**:
  - [ ] Define a small status model, for example `local-only`, `signed-out`,
        `connecting`, `synced`, `offline`, `auth-unreachable`, `sync-error`.
  - [ ] Surface status in sidebar/account area and Settings. Keep editor header
        status secondary or hidden unless relevant.
  - [ ] Show degraded local-only mode when auth/sync services are unavailable.
  - [ ] Avoid fake precision. Show last successful connection only if real data
        exists.
  - [ ] Fix manifest route mismatch for `/`, `/editor/:noteId`, and `/settings`.
  - [ ] Test offline reload after first load. If app shell caching cannot be
        made reliable in scope, downgrade visible claims and document the gap.
  - [ ] Add Settings sections for Local Data, Sync, Import/Export, PWA/Offline,
        Account, and Diagnostics.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/pwa.test.ts src/config.test.ts`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser: signed out, auth server unavailable, browser offline, online,
    settings desktop/mobile, manifest `start_url`, offline reload or honest
    offline-limitation copy.
- **Manual test handoff**:
  - Tester verifies visible status copy and Settings diagnostics in online,
    offline, and auth-unavailable states.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 6: Editor Chrome and Metadata Polish

- **Id**: `run-6`
- **Title**: `Editor Chrome and Metadata Polish`
- **Deliverable**:
  - The editor reads as a calm writing surface with Obsidian capability nearby
    but visually secondary.
- **Files**:
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`: header/title/body
    balance, metadata toggle, note actions, focus mode alignment.
  - `packages/ewe-note/src/app/components/RightPanel.tsx`: quieter outline,
    links, unlinked mentions, properties, close behavior, mobile drawer behavior.
  - `packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx`: Escape,
    focus return, command grouping, wording, editor command discoverability.
  - `packages/ewe-note/src/components/editor-toolbar.tsx`: reduce persistent
    toolbar prominence, keep source mode and command access discoverable.
  - `packages/ewe-note/src/components/editor-context-menu.tsx`: preserve command
    coverage and keyboard behavior.
  - `packages/ewe-note/src/components/editor-bubble-menu.tsx`: preserve compact
    formatting affordance.
  - `packages/ewe-note/src/editor/commands.ts`: replace remaining prompt-driven
    link/embed commands with better UI only if practical inside this run;
    otherwise document residual prompt fallback.
  - `packages/ewe-note/src/index.css`: typography, toolbar, table, callout,
    source mode, focus, and reduced-motion polish.
- **Steps**:
  - [ ] Make note title/body the strongest hierarchy in editor mode.
  - [ ] Keep tags/properties/meta chips supportive and reduce any header clutter.
  - [ ] Make toolbar less card-like and less central; rely on slash/context/bubble
        menus for deeper command access.
  - [ ] Ensure Source Mode remains visible and keyboard accessible.
  - [ ] Ensure right panel is closeable, non-obscuring on desktop, drawer-like on
        mobile, and visibly secondary.
  - [ ] Fix command palette Escape/focus return and ensure closed overlays do not
        intercept clicks.
  - [ ] Preserve all editor parity tests from the completed parity plan.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Browser: realistic populated note, source mode, toolbar menus, slash menu,
    context menu, bubble menu, command palette, metadata mode, focus mode, mobile
    editor.
- **Manual test handoff**:
  - Tester compares editor to Bear and Obsidian screenshots: the note must feel
    primary, controls secondary, metadata inspectable but not dominant.
- **Dependencies**:
  - `run-3`, `run-4`, `run-5`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 7: Obsidian Export/Open Check and Bear Visual QA

- **Id**: `run-7`
- **Title**: `Obsidian Export/Open Check and Bear Visual QA`
- **Deliverable**:
  - The app has proof that Obsidian-sensitive content still round-trips, and the
    final UI has visual QA evidence against Bear/Obsidian references.
- **Files**:
  - `packages/ewe-note/src/editor/markdown.test.ts`: update only for new
    preservation regressions or fixture gaps.
  - `packages/ewe-note/src/cli/import-vault.test.ts`: update only for import
    regressions or fixture gaps.
  - `packages/ewe-note/src/cli/vault-sync.test.ts`: update only for vault-sync
    regressions.
  - `packages/ewe-note/test-fixtures/obsidian-parity/`: add one realistic
    "bear-obsidian-final-smoke" note fixture if current fixtures do not cover
    realistic mixed content.
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`: update final
    comparison checklist.
  - `output/playwright/`: final screenshots.
- **Steps**:
  - [ ] Run the existing Obsidian parity fixture tests and fix any regressions
        caused by UX changes.
  - [ ] Export or serialize a realistic fixture note containing heading, tasks,
        table, wiki link, properties, callout, embed placeholder, comment,
        footnote, and source mode content.
  - [ ] If the Obsidian desktop app is available and user permissions allow
        inspection, open or inspect the exported fixture vault manually without
        modifying user vault data. If not available, document that source-format
        tests are the verification fallback.
  - [ ] Compare final screenshots against the provided Bear/Obsidian references:
        sidebar density, note list polish, editor hierarchy, metadata panel, and
        toolbar weight.
  - [ ] Fix P0/P1 visual or workflow findings inside the approved scope.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts src/cli/import-vault.test.ts src/cli/vault-sync.test.ts`
  - `npm run build --workspace @eweser/ewe-note`
- **Verification**:
  - Final screenshot set exists:
    - `output/playwright/ewe-note-final-desktop-home.png`
    - `output/playwright/ewe-note-final-desktop-editor.png`
    - `output/playwright/ewe-note-final-desktop-metadata.png`
    - `output/playwright/ewe-note-final-mobile-home.png`
    - `output/playwright/ewe-note-final-mobile-editor.png`
    - `output/playwright/ewe-note-final-settings.png`
  - Obsidian open-check completed or explicitly documented as skipped with
    reason.
- **Manual test handoff**:
  - Tester opens the same fixture note in EweNote and Obsidian, then compares
    source preservation, visible hierarchy, and metadata/link behavior. Tester
    also compares EweNote editor/list against Bear screenshots for chrome weight.
- **Dependencies**:
  - `run-6`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 8: Final Cypress, Build, Docs, and Plan Closeout

- **Id**: `run-8`
- **Title**: `Final Cypress, Build, Docs, and Plan Closeout`
- **Deliverable**:
  - The feature is verified, documented, and ready for PR review without a
    separate re-planning pass.
- **Files**:
  - `e2e/cypress/tests/ewe-note.cy.ts`: update smoke tests for mobile/pane
    expectations, visible folder UI, settings/status, source mode, and note
    creation.
  - `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`: final manual QA
    checklist and known limitations.
  - `docs/ai/plans/2026-05-03-ewe-note-finish-bear-obsidian-ux.md`: execution
    summary, manual handoffs, self-reflection.
  - `packages/ewe-note/README.md`: align current feature claims and local
    commands.
  - `packages/ewe-note/INDEX.md`, `packages/ewe-note/src/INDEX.md`,
    `packages/ewe-note/src/app/INDEX.md`, `packages/ewe-note/src/components/INDEX.md`:
    update only if ownership/routes/components changed.
- **Steps**:
  - [ ] Update Cypress tests so they do not stub folder creation prompts.
  - [ ] Add or update Cypress coverage for:
        create note, open editor, mobile/editor reachability where feasible,
        folder create visible UI, settings status, source mode, metadata toggle,
        and command palette Escape.
  - [ ] Run lint, type-check, tests, build, Cypress, and code-index check.
  - [ ] Run internal QA against `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, this
        plan, Yjs/offline rules, no-secrets rules, and changeset rules.
  - [ ] Update this plan's Execution Summary and manual-test handoffs after
        each completed run.
  - [ ] Record explicitly deferred scope and residual risks.
- **Tests**:
  - `npm run lint --workspace @eweser/ewe-note -- --max-warnings=0`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
  - `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`
  - `npm run code-index:check`
- **Verification**:
  - Browser/manual final pass confirms all Target Acceptance bullets.
  - Any skipped check has exact reason and residual risk.
- **Manual test handoff**:
  - This run creates the final handoff with local commands, URLs, data
    assumptions, screenshots, Obsidian/Bear comparison steps, and stop conditions
    for a separate manual tester.
- **Dependencies**:
  - `run-7`.
- **Model tier**: `fast`
- **Risk level**: `medium`

## Stop Conditions

Stop and ask for user approval if:

- The orchestrator cannot start workers from the current TipTap parity branch or
  would drop/overwrite uncommitted local WIP.
- Fixing mobile/offline/PWA behavior requires backend, Caddy, auth-server,
  sync-server, or deployment topology changes.
- Implementation requires changing published package APIs or adding a changeset.
- Implementation needs a new rendering dependency for math, Mermaid, media, PDF,
  or sanitization that materially increases bundle size or security risk.
- UX fixes require replacing TipTap, changing the canonical note storage model,
  or risking Markdown/OFM data loss.
- Real multi-user sharing, access grants, auth-token semantics, or destructive
  local-data controls become necessary.
- Obsidian desktop verification would modify a real user vault or require
  transmitting sensitive data.
- Browser verification exposes a data-loss or sync-corruption case that cannot
  be fixed inside `packages/ewe-note`.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above inside
`packages/ewe-note`, update EweNote docs/checklists/plans, add or update focused
tests and screenshots, run relevant verification, perform internal QA, fix
issues found inside this boundary, and update this plan's execution summary.

Approval also authorizes non-destructive local browser/manual testing against
the local EweNote dev server and read-only inspection/comparison of currently
running Bear and Obsidian windows when available.

Approval does not authorize unrelated SDK/shared/backend changes, published
package API changes, database migrations, real access-grant or sharing
implementation, destructive local-data actions, modifying real Obsidian vault
contents, direct pushes to `main`, secret handling, or merging PRs.

## Execution Summary

| Run     | Status   | Files Changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Verification                                                                                                                                                                                                                                                                                                                                                                                                                               | Notes                                                                                                                                                                                                                                                                                                |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `run-1` | Complete | `output/playwright/ewe-note-baseline-*.png`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `IMPECCABLE_CONTEXT_DIR=packages/ewe-note node .agents/skills/impeccable/scripts/load-context.mjs`; `.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status`; Playwright baseline snapshots                                                                                                                                                                                                                 | Runtime refresh still reported Auth API/App UI unknown; local EweNote dev server was started on `http://127.0.0.1:5181/`. Baseline confirmed dashboard-like home, raw numeric workspace modes, native folder prompt, and mobile desktop-pane clipping.                                               |
| `run-2` | Complete | `packages/ewe-note/src/app/components/WorkspaceShell.tsx`; `packages/ewe-note/src/app/components/workspace-layout.ts`; `packages/ewe-note/src/app/components/workspace-layout.test.ts`; `packages/ewe-note/src/app/components/NotesListPane.tsx`; `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`; `packages/ewe-note/src/app/components/RightPanel.tsx`; `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`; `packages/ewe-note/src/app/pages/EnhancedHome.tsx`; `packages/ewe-note/src/app/pages/Settings.tsx`; `packages/ewe-note/src/app/components/ui/use-mobile.ts`; `output/playwright/ewe-note-run-2-*.png` | `npm run test --workspace @eweser/ewe-note -- --run src/app/components/workspace-layout.test.ts src/app/components/WorkspaceShell.test.tsx`; `npm run type-check --workspace @eweser/ewe-note`; Playwright `390x844` pass                                                                                                                                                                                                                  | Added one-pane mobile shell, labeled `Write` / `Browse` / `Organize` / `Inspect` workspace controls, mobile metadata close path, and responsive editor/settings constraints.                                                                                                                         |
| `run-3` | Complete | `packages/ewe-note/src/app/pages/EnhancedHome.tsx`; `packages/ewe-note/src/app/components/NotesListPane.tsx`; `output/playwright/ewe-note-run-3-desktop-home.png`                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `npm run type-check --workspace @eweser/ewe-note`; Playwright desktop home snapshot                                                                                                                                                                                                                                                                                                                                                        | Removed the dashboard metric cards and large shortcut-teaching panel. `/` now presents a quiet library/resume surface while the note list owns search, rows, selected states, tasks empty state, and no-results/no-notes states.                                                                     |
| `run-4` | Complete | `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`; `packages/ewe-note/src/app/components/ShareFolderDialog.tsx`; `e2e/cypress/tests/ewe-note.cy.ts`; `output/playwright/ewe-note-run-4-folder-dialog.png`                                                                                                                                                                                                                                                                                                                                                                                                               | `npm run type-check --workspace @eweser/ewe-note`; `rg -n "prompt\\(                                                                                                                                                                                                                                                                                                                                                                       | window\\.prompt                                                                                                                                                                                                                                                                                      | creates a folder from the sidebar prompt" packages/ewe-note/src/app packages/ewe-note/src/components e2e/cypress/tests/ewe-note.cy.ts`; Playwright folder dialog check | Replaced native folder and note rename prompts with visible dialogs, added folder rename/delete/share/new-note hover actions, added context-menu note move actions, and clarified that folder links do not grant access. |
| `run-5` | Complete | `packages/ewe-note/src/db.tsx`; `packages/ewe-note/src/pwa.ts`; `packages/ewe-note/src/pwa.test.ts`; `packages/ewe-note/public/manifest.webmanifest`; `packages/ewe-note/src/app/pages/Settings.tsx`; `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`; `packages/ewe-note/README.md`; `output/playwright/ewe-note-run-5-settings-status.png`                                                                                                                                                                                                                                                                          | `npm run test --workspace @eweser/ewe-note -- --run src/pwa.test.ts src/config.test.ts`; `npm run type-check --workspace @eweser/ewe-note`; Playwright Settings snapshot                                                                                                                                                                                                                                                                   | Added signed-out/local/sync status model, surfaced status in sidebar and Settings, corrected manifest `start_url`/`scope` to `/`, and downgraded README/Settings claims to optional sync and production PWA install support.                                                                         |
| `run-6` | Complete | `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`; `packages/ewe-note/src/app/components/RightPanel.tsx`; `packages/ewe-note/src/app/components/EnhancedCommandPalette.tsx`; `packages/ewe-note/src/components/editor-toolbar.tsx`; `output/playwright/ewe-note-run-6-desktop-editor-metadata.png`                                                                                                                                                                                                                                                                                                                            | `npm run test --workspace @eweser/ewe-note`; `npm run type-check --workspace @eweser/ewe-note`; Playwright editor/metadata snapshot                                                                                                                                                                                                                                                                                                        | Reduced persistent toolbar opacity/background, made note-info panel structural instead of overlay-like, added command palette Escape/focus-return behavior, and preserved source mode/menu access. Remaining prompt fallbacks are editor insert/link commands in `src/editor/commands.ts`.           |
| `run-7` | Complete | `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts src/cli/import-vault.test.ts src/cli/vault-sync.test.ts`; `npm run build --workspace @eweser/ewe-note`                                                                                                                                                                                                                                                     | Obsidian-sensitive Markdown/import/vault-sync tests passed, and production build generated PWA assets. Checklist now reflects library-first home, visible folder dialogs, truthful sharing, and mobile pane controls. Obsidian desktop open-check was not run; source-format tests are the fallback. |
| `run-8` | Complete | `e2e/cypress/tests/ewe-note.cy.ts`; `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`; `docs/ai/plans/2026-05-03-ewe-note-finish-bear-obsidian-ux.md`; final screenshots in `output/playwright/`                                                                                                                                                                                                                                                                                                                                                                                                                          | `npm run lint --workspace @eweser/ewe-note -- --max-warnings=0`; `npm run type-check --workspace @eweser/ewe-note`; `npm run test --workspace @eweser/ewe-note`; `npm run build --workspace @eweser/ewe-note`; `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`; `npm run code-index:check`; `git diff --check` | Final Cypress passed after rerun. The first Cypress attempt failed because source formatting during the run triggered Vite HMR and blanked the test browser; rerun after formatting passed 10/10.                                                                                                    |

### QA Follow-up: EweNote QA Findings

- Status: Complete.
- Files changed: `packages/ewe-note/src/app/components/ShareFolderDialog.tsx`,
  `packages/ewe-note/src/app/components/WorkspaceShell.tsx`,
  `packages/ewe-note/src/app/components/WorkspaceShell.test.tsx`,
  `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`,
  `packages/ewe-note/src/app/components/EnhancedSidebar.test.ts`,
  `packages/ewe-note/src/app/components/sync-status-visual.ts`,
  `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`,
  `packages/ewe-note/src/components/editor-toolbar.tsx`, and
  `e2e/cypress/tests/ewe-note.cy.ts`.
- Share folder follow-up: `/?folder=<id>` now focuses the folder view in the
  workspace shell, and the share dialog copy stays explicit that the link is
  only local navigation and does not grant access.
- Source mode follow-up: source mode now pauses rich-text toolbar menus and
  keeps only the source-mode toggle visible with a raw-Markdown status message.
- Clipboard follow-up: folder share copy and note copy-link actions only show
  success after `navigator.clipboard.writeText()` resolves, and show scoped
  failure states when clipboard access is denied or unavailable.
- Sync visual follow-up: sidebar status dots now differ across `synced`,
  `connecting`, `offline`, `local-only`, `signed-out`, and error states.
- Verification:
  `npm run lint --workspace @eweser/ewe-note -- --max-warnings=0`;
  `npm run type-check --workspace @eweser/ewe-note`;
  `npm run test --workspace @eweser/ewe-note`;
  `npm run build --workspace @eweser/ewe-note`;
  `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`;
  `npm run code-index:check`; `git diff --check`.
  The first Cypress run failed because the existing dev server did not yet show
  the mounted folder-share affordance; the rerun passed 14/14 after the Vite
  server reflected the current source.

### Manual Tester Fix Pass: 2026-05-03

- Status: Complete.
- Files changed: `packages/ewe-note/src/app/pages/EnhancedEditor.tsx`,
  `packages/ewe-note/src/app/pages/EnhancedHome.tsx`,
  `packages/ewe-note/src/app/components/WorkspaceShell.tsx`,
  `packages/ewe-note/src/app/components/NotesListPane.tsx`,
  `packages/ewe-note/src/app/components/EnhancedSidebar.tsx`,
  `packages/ewe-note/src/config.ts`, `packages/ewe-note/src/config.test.ts`,
  and `e2e/cypress/tests/ewe-note.cy.ts`.
- Manual tester gaps fixed: the open editor note menu now has a visible
  `Move to folder` section; folder actions are persistently visible instead of
  hover-only; mobile and note-list pane labels no longer clip; the home route is
  a quieter notes-first library; the default dev auth server now matches
  `http://localhost:38101`.
- Verification:
  `.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status`;
  `npm run test --workspace @eweser/ewe-note -- --run src/config.test.ts src/app/components/workspace-layout.test.ts src/app/components/WorkspaceShell.test.tsx`;
  `npm run type-check --workspace @eweser/ewe-note`;
  `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`;
  `git diff --check`.
- Evidence: `output/playwright/ewe-note-fixes-desktop-home.png` and
  `output/playwright/ewe-note-fixes-mobile-home.png`.

## Self-Reflection / Instruction Improvements

- QA follow-up work should prefer persistent DOM affordances for actions that
  need Cypress coverage. Hover-only mounted controls are easy to miss in
  automation and weaker for keyboard accessibility.
- Manual tester fixes should add direct coverage for the exact missed flow. The
  note-move gap needed an open-editor action test, not just folder drag/drop
  behavior buried in the sidebar.
- The `eweser-runtime-orientation` skill path in some instructions points at
  `~/.codex/skills/...`; this checkout's available script was repo-local under
  `.codex/skills/...`.
- Do not edit/format source while Cypress is actively driving the Vite dev
  server. The first final Cypress attempt failed from a Vite HMR blank-page
  state during formatting, then passed cleanly after edits stopped.
- `useIsMobile()` should tolerate jsdom without `matchMedia`; keeping this
  fallback avoids layout-test failures for responsive shell work.

### Manual Test Handoff: Run 2

- Delivered behavior: mobile uses a single active pane with explicit
  navigation, notes, editor, and note-info controls. Desktop workspace hotkeys
  remain `Ctrl/Cmd+1..4`, but visible controls now use product labels.
- Local services: EweNote dev server running with
  `VITE_AUTH_SERVER=http://localhost:38101 VITE_AUTH_PAGES_URL=http://localhost:3001 npm run dev --workspace @eweser/ewe-note -- --host 127.0.0.1 --port 5181`.
- Test data/account assumptions: signed-out local default note is sufficient;
  no auth token or real sync service is required for this run.
- Manual steps: open `http://127.0.0.1:5181/`, resize to `390x844`, open a
  note, confirm the editor is reachable, tap `Inspect`, close note info, open
  Settings, and confirm no horizontal clipping.
- Expected results: note list, editor, metadata, and settings each occupy one
  usable mobile pane; labels read `Write`, `Browse`, `Organize`, and `Inspect`.
- Known gaps: Run 4 still owns folder prompt replacement; Run 5 still owns
  truthful sync/offline status.
- Evidence: `output/playwright/ewe-note-run-2-mobile-home.png`,
  `output/playwright/ewe-note-run-2-mobile-editor.png`, and
  `output/playwright/ewe-note-run-2-mobile-settings.png`.

### Manual Test Handoff: Run 3

- Delivered behavior: `/` is now a note/library-first screen, not a metrics or
  shortcut dashboard. Recent notes are quiet list rows, and empty task/note
  states have direct but subdued copy.
- Local services: use the same EweNote dev server at
  `http://127.0.0.1:5181/`.
- Test data/account assumptions: signed-out local notes are enough; a zero-note
  visual check may require clearing local browser storage in a disposable
  browser profile.
- Manual steps: open `/`, compare the page against Bear-style restraint, select
  All Notes/Tasks/Recent from the sidebar, and search for a term with no
  results once Run 6/8 command/search verification is active.
- Expected results: no primary metric tiles, no large shortcut cards, selected
  note rows remain clear, and chrome stays secondary to note titles/previews.
- Known gaps: folder CRUD still uses a native prompt until Run 4.
- Evidence: `output/playwright/ewe-note-run-3-desktop-home.png`.

### Manual Test Handoff: Run 4

- Delivered behavior: folder creation and rename use visible dialogs; folder
  rows expose create-note, rename, share, and delete actions on hover; note
  context menus include move actions; sharing copy states that no access grant
  is created.
- Local services: use `http://127.0.0.1:5181/` with the EweNote dev server.
- Test data/account assumptions: signed-out local folders are enough.
- Manual steps: click the folder `+`, create a folder, hover the folder row,
  rename it, create a note in it, right-click a folder note and move it, open
  the share dialog, and optionally delete the disposable folder.
- Expected results: no native `prompt()` appears for primary folder or note
  rename workflows; destructive delete still asks for confirmation.
- Known gaps: true multi-user folder sharing/access grants remain deferred.
- Evidence: `output/playwright/ewe-note-run-4-folder-dialog.png`.

### Manual Test Handoff: Run 5

- Delivered behavior: sidebar and Settings show truthful local/auth/sync state;
  Settings now covers Account, Sync, Local Data, PWA/Offline, Import/Export, and
  Diagnostics. Manifest routes now match the current app root.
- Local services: use `http://127.0.0.1:5181/`; auth/sync services can be
  unavailable for the signed-out local-only check.
- Test data/account assumptions: signed-out state should read `Signed out` and
  explain that local notes work now.
- Manual steps: open Settings, confirm Auth API/Auth pages match the dev env,
  toggle browser offline if desired, and check sidebar footer status.
- Expected results: the UI does not claim remote sync is active while signed
  out; local writing remains framed as available.
- Known gaps: service-worker offline reload was not proven in dev because PWA
  registration is production-only; copy explicitly says that.
- Evidence: `output/playwright/ewe-note-run-5-settings-status.png`.

### Manual Test Handoff: Run 6

- Delivered behavior: editor chrome is quieter; metadata is an adjacent panel;
  command palette closes with Escape and returns focus; source mode remains
  visible.
- Local services: use `http://127.0.0.1:5181/`.
- Test data/account assumptions: any local note works; richer notes are better
  for outline/link checks.
- Manual steps: open a note, inspect toolbar weight, toggle source mode, open
  command palette with `Cmd/Ctrl+K`, press Escape, open/close note info, and
  verify the note title/body remain visually primary.
- Expected results: no overlay traps, source mode remains reachable, and
  metadata does not obscure the editor.
- Known gaps: editor link/embed insert commands still use native prompt
  fallbacks; replacing those cleanly needs a dedicated editor-dialog pass.
- Evidence: `output/playwright/ewe-note-run-6-desktop-editor-metadata.png`.

### Manual Test Handoff: Run 7

- Delivered behavior: Obsidian-sensitive round-trip/import/vault-sync tests
  still pass after the UX work, and the production EweNote build succeeds.
- Local services: not required for the source-format tests; use the local dev
  server only for visual comparison.
- Test data/account assumptions: existing parity fixtures under
  `packages/ewe-note/test-fixtures/obsidian-parity/`.
- Manual steps: compare the final screenshots against Bear/Obsidian references
  for chrome weight, note-list density, metadata panel weight, and source-mode
  availability. If Obsidian desktop is available, open a disposable exported
  fixture only; do not modify a real vault.
- Expected results: OFM tests pass and UI remains Bear-clean while preserving
  Obsidian-style source/link/metadata capability.
- Known gaps: Obsidian desktop open-check was skipped in this coder pass; source
  tests are the verification fallback.
- Evidence: package test/build output plus final screenshots from Run 8.

### Manual Test Handoff: Run 8

- Delivered behavior: final QA pass completed; Cypress now covers the visible
  folder dialog instead of stubbing `window.prompt`.
- Local services: EweNote dev server at `http://127.0.0.1:5181/`.
- Test data/account assumptions: Cypress uses signed-out local browser state;
  screenshots use the current local default note and disposable Run 4 folder.
- Manual steps: run the checklist in
  `docs/ai/testing/ewe-note-ux-feature-audit-checklist.md`, using the final
  screenshot set as visual reference.
- Expected results: app is usable at desktop and `390x844`, local writing works
  while signed out, folder flows are visible, Settings explains status, and OFM
  source tests remain green.
- Known gaps: true multi-user folder sharing/access grants, editor command
  dialog replacements for link/embed prompts, UI-level vault import/export,
  graph/canvas/plugins, and production service-worker offline reload proof
  remain deferred.
- Evidence:
  - `output/playwright/ewe-note-final-desktop-home.png`
  - `output/playwright/ewe-note-final-desktop-editor.png`
  - `output/playwright/ewe-note-final-desktop-metadata.png`
  - `output/playwright/ewe-note-final-mobile-home.png`
  - `output/playwright/ewe-note-final-mobile-editor.png`
  - `output/playwright/ewe-note-final-settings.png`
