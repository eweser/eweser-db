# Plan: Obsidian Vault Feature Parity Harness

## Goal

Create a comprehensive, machine-testable Obsidian fixture vault and parity matrix
that can verify EweNote import/export fidelity and user-visible Obsidian-style
feature behavior without relaxing the current Bear-minimal UI direction.

<!-- eweser-orchestration -->

```yaml
orchestration:
  enabled: true
  maxParallel: 1
  baseBranch: codex/ewe-note-obsidian-editor-pr
  finalStages: []
runs:
  - id: run-1
    title: Define The Obsidian Feature Matrix
    agent: eweser-coder
    model: strong
    ui: false
    parallel: false
    dependsOn: []
    writeScope:
      - packages/ewe-note/test-fixtures/obsidian-feature-vault
      - packages/ewe-note/test-fixtures/obsidian-feature-vault/**
      - docs/ai/testing/ewe-note-obsidian-feature-parity-checklist.md
      - packages/ewe-note/README.md
    tests:
      - node -e JSON.parse\(require\(\"fs\"\).readFileSync\(\"packages/ewe-note/test-fixtures/obsidian-feature-vault/matrix.json\",\"utf8\"\)\)
    changeset: no
  - id: run-2
    title: Build The Comprehensive Fixture Vault
    agent: eweser-coder
    model: coding
    ui: false
    parallel: false
    dependsOn:
      - run-1
    writeScope:
      - packages/ewe-note/test-fixtures/obsidian-feature-vault/**
    tests:
      - node -e JSON.parse\(require\(\"fs\"\).readFileSync\(\"packages/ewe-note/test-fixtures/obsidian-feature-vault/matrix.json\",\"utf8\"\)\)
    changeset: no
  - id: run-3
    title: Extend Import/Export To Preserve Vault File Types
    agent: eweser-coder
    model: strong
    ui: false
    parallel: false
    dependsOn:
      - run-1
      - run-2
    writeScope:
      - packages/ewe-note/src/cli/**
      - packages/ewe-note/test-fixtures/obsidian-feature-vault/**
    tests:
      - npm run test --workspace @eweser/ewe-note -- --run src/cli/import-vault.test.ts src/cli/vault-sync.test.ts
      - npm run type-check --workspace @eweser/ewe-note
    changeset: no
  - id: run-4
    title: Add Editor And App Parity Assertions
    agent: eweser-coder
    model: strong
    ui: true
    browserCheckpoint: focused
    parallel: false
    dependsOn:
      - run-3
    writeScope:
      - packages/ewe-note/src/editor/**
      - packages/ewe-note/src/app/**
      - e2e/cypress/tests/ewe-note.cy.ts
      - docs/ai/testing/ewe-note-obsidian-feature-parity-checklist.md
    tests:
      - npm run test --workspace @eweser/ewe-note
      - npm run type-check --workspace @eweser/ewe-note
      - npm run build --workspace @eweser/ewe-note
    changeset: no
  - id: run-5
    title: Final Gap Report And Parity Gate
    agent: eweser-coder
    model: strong
    ui: true
    browserCheckpoint: focused
    parallel: false
    dependsOn:
      - run-4
    writeScope:
      - docs/ai/testing/ewe-note-obsidian-feature-parity-checklist.md
      - docs/ai/plans/2026-05-04-obsidian-vault-feature-parity.md
      - packages/ewe-note/README.md
    tests:
      - npm run lint --workspace @eweser/ewe-note -- --max-warnings=0
      - npm run type-check --workspace @eweser/ewe-note
      - npm run test --workspace @eweser/ewe-note
      - npm run build --workspace @eweser/ewe-note
      - git diff --check
    changeset: no
```

## Scope

- In:
  - A stronger `packages/ewe-note/test-fixtures/obsidian-feature-vault/`
    fixture vault covering current Obsidian Markdown, attachments, `.canvas`,
    `.base`, properties, links, and core-plugin-relevant file patterns.
  - A documented parity matrix that separates `must preserve`,
    `must render/edit`, `must navigate/search`, and `intentionally out of
scope`.
  - Import/export and editor tests proving supported features survive round
    trip and unsupported features are preserved or explicitly skipped.
  - A manual QA checklist for opening the fixture vault in Obsidian and testing
    the imported/exported EweNote vault.
- Out:
  - Implementing Canvas, Bases, Graph view, Publish, Sync, community plugins, or
    Obsidian CLI command parity as product features.
  - Changing backend auth, sync-server, PostgreSQL, deployment, or published
    package APIs.
  - Reworking the Bear-minimal workspace UI beyond test selectors or docs needed
    to exercise existing features.

## Assumptions / Open Questions

- Assumption: The existing `packages/ewe-note/test-fixtures/obsidian-vault/`
  and `packages/ewe-note/test-fixtures/obsidian-parity/` are useful but not
  comprehensive enough to claim "all Obsidian features."
- Assumption: "Feature parity with Obsidian" should be split into three
  contracts:
  - file/vault fidelity: import/export does not lose user data;
  - note workflow parity: links, backlinks, outline, search, tags, properties,
    templates, daily notes, and source mode work in EweNote;
  - explicit non-goals: plugin ecosystem, paid services, and large product
    surfaces that EweNote should preserve as files before it renders them.
- Assumption: `.canvas` and `.base` files should be preserved and indexed as
  vault files before EweNote builds native Canvas/Bases UI.
- Open question: Should Coder replace the existing `obsidian-vault` fixture or
  add a new `obsidian-feature-vault` and leave the older fixture stable? Default
  to adding a new fixture to avoid disturbing current passing tests.
- Open question: Should audio/video/PDF fixtures use tiny checked-in binaries or
  generated placeholder files during tests? Default to tiny checked-in fixtures
  only if they are safe, small, and license-clean.

## Verified Current State

- `packages/ewe-note/test-fixtures/obsidian-vault/` exists and covers Markdown
  formatting, callouts, code blocks, embeds, footnotes, math/Mermaid,
  properties/tags, tables, wiki links, nested folders, and one PNG attachment.
- `packages/ewe-note/test-fixtures/obsidian-parity/` exists and is wired to
  `packages/ewe-note/src/editor/markdown.test.ts` and
  `packages/ewe-note/src/cli/import-vault.test.ts`.
- The current parity fixture matrix covers five focused Markdown notes:
  `basic-parity.md`, `wiki-embeds-parity.md`,
  `callouts-footnotes-parity.md`, `tables-math-parity.md`, and
  `real-note.md`.
- The current import scanner imports `.md` notes plus a limited attachment list
  of `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.pdf`, `.mp3`, `.mp4`,
  `.wav`, and `.ogg`; it does not scan `.canvas`, `.base`, `.avif`, `.bmp`,
  `.flac`, `.m4a`, `.webm`, `.3gp`, `.mkv`, `.mov`, or `.ogv`.
- Current focused verification passes:
  `npm run test --workspace @eweser/ewe-note -- --run src/editor/markdown.test.ts src/cli/import-vault.test.ts`
  reports 2 files and 35 tests passing.
- Runtime orientation note: the documented `~/.codex/skills/...` runtime
  command was not present; the repo-local
  `.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status`
  command worked and reported Auth API/App UI unknown, Sync 38181, Postgres
  5432, Aggregator 38190.
- The working tree was already dirty before this plan. Coder must preserve
  existing local changes and should avoid broad refactors.

## External Facts Checked

- Obsidian accepted file formats include Markdown, `.base`, `.canvas`, images,
  audio, video, and PDF files. Source: https://help.obsidian.md/file-formats
- Obsidian Bases is a core plugin; base views are stored as `.base` files or
  embedded in Markdown code blocks, and the data comes from Markdown files and
  properties. Source: https://help.obsidian.md/bases
- Obsidian Bases syntax exposes file properties such as backlinks, embeds,
  links, folder, path, modified time, and note properties. Source:
  https://help.obsidian.md/bases/syntax
- Obsidian Canvas is a core plugin stored as `.canvas` files using the JSON
  Canvas open format, with cards for notes, attachments, web pages, and text.
  Source: https://help.obsidian.md/plugins/canvas
- Obsidian properties are YAML-backed, include default `tags`, `aliases`, and
  `cssclasses`, and nested properties are not fully supported in the property
  UI. Source: https://help.obsidian.md/properties
- Obsidian core plugins include Backlinks, Bases, Bookmarks, Canvas, Command
  palette, Daily notes, File explorer, Graph view, Outgoing links, Outline,
  Page preview, Properties view, Quick switcher, Search, Slash commands,
  Templates, Tags view, Word count, Workspaces, Publish, Sync, Slides, and more.
  Source: https://help.obsidian.md/plugins
- Obsidian CLI exposes everyday commands and developer commands for search,
  properties, publish, sync, tags, tasks, templates, and active-file reads.
  Source: https://help.obsidian.md/cli

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential. Run 1 defines the contract; Runs 2 and 3 can be split
into separate worktrees after Run 1 if write scopes are kept disjoint. Run 4
depends on the fixture and test updates. Run 5 is final QA.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Define The Obsidian Feature Matrix

- **Id**: `run-1`
- **Title**: `Define The Obsidian Feature Matrix`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - A versioned JSON or Markdown matrix that states exactly which Obsidian
    features the fixture vault covers and what EweNote must do with each.
- **Files**:
  - `packages/ewe-note/test-fixtures/obsidian-feature-vault/matrix.json`: new
    source-of-truth feature matrix.
  - `docs/ai/testing/ewe-note-obsidian-feature-parity-checklist.md`: manual
    checklist for fixture setup, import/export, and browser verification.
  - `packages/ewe-note/README.md`: link the fixture and checklist if the README
    already documents import/export testing.
- **Steps**:
  - [ ] Create a matrix with categories for Markdown syntax, properties, links,
        embeds/attachments, folders/files, Obsidian core plugin workflows, `.canvas`,
        `.base`, and explicit non-goals.
  - [ ] Mark each item as one of `render-edit`, `preserve-round-trip`,
        `navigate/search`, `manual-only`, or `out-of-scope`.
  - [ ] Include Obsidian Help source URLs for current feature categories that
        affect the contract.
  - [ ] Keep the matrix honest: do not mark Canvas/Bases/Graph/Publish/Sync as
        implemented unless product code actually supports them.
- **Tests**:
  - Not needed for the matrix itself.
- **Verification**:
  - `node -e "JSON.parse(require('fs').readFileSync('packages/ewe-note/test-fixtures/obsidian-feature-vault/matrix.json','utf8'))"`
- **Manual test handoff**:
  - Not needed: contract/documentation run only.
- **Dependencies**:
  - None.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Build The Comprehensive Fixture Vault

- **Id**: `run-2`
- **Title**: `Build The Comprehensive Fixture Vault`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - A realistic Obsidian vault fixture with representative files for every
    matrix item that is not out of scope.
- **Files**:
  - `packages/ewe-note/test-fixtures/obsidian-feature-vault/.obsidian/app.json`:
    minimal safe vault config.
  - `packages/ewe-note/test-fixtures/obsidian-feature-vault/**/*.md`: Markdown
    notes covering syntax, properties, links, backlinks, tags, templates, daily
    notes, slides, tasks, search targets, and source-mode edge cases.
  - `packages/ewe-note/test-fixtures/obsidian-feature-vault/**/*.canvas`: JSON
    Canvas fixture with note, text, file, web, and edge cards.
  - `packages/ewe-note/test-fixtures/obsidian-feature-vault/**/*.base`: Bases
    fixture with table/list/card-like views, filters, sorts, formulas, and
    references to note properties.
  - `packages/ewe-note/test-fixtures/obsidian-feature-vault/Attachments/**`:
    tiny image/audio/video/PDF placeholders that are safe to commit.
- **Steps**:
  - [ ] Add notes for headings H1-H6, emphasis, highlight, comments, inline and
        fenced code, tables, tasks, nested lists, blockquotes, callouts, footnotes,
        tags, properties, YAML/JSON frontmatter, math, Mermaid, raw HTML, external
        Markdown links, wiki links, aliases, heading refs, block refs, embeds, and
        escaped syntax.
  - [ ] Add folder/path cases for duplicate note names in different folders,
        aliases that collide with titles, non-existent links, renamed-title
        expectations, and case/punctuation differences.
  - [ ] Add core-plugin workflow notes for daily notes, templates, slides,
        search queries, tags view, outline, backlinks, outgoing links, quick
        switcher, bookmarks, and word count.
  - [ ] Add `.canvas` and `.base` fixtures as files that import/export must
        preserve, even if EweNote only lists or round-trips them initially.
  - [ ] Keep binary fixtures small and license-clean; if that is not practical,
        generate them in test setup instead of committing large files.
- **Tests**:
  - Fixture lint/check script from Run 3 once available.
- **Verification**:
  - Open the fixture vault in Obsidian manually and confirm there are no obvious
    parse errors in Markdown, Canvas, or Bases.
- **Manual test handoff**:
  - Tester should open the new fixture directory as an Obsidian vault, inspect
    Markdown preview/source, Canvas, and Bases, and record any syntax Obsidian
    itself rejects.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 3: Extend Import/Export To Preserve Vault File Types

- **Id**: `run-3`
- **Title**: `Extend Import/Export To Preserve Vault File Types`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - Import/export manifests can represent all fixture vault files needed for
    parity testing, including unsupported-but-preserved Obsidian files.
- **Files**:
  - `packages/ewe-note/src/cli/import-vault.ts`: add generic vault file records
    or expand attachment/file scanning for accepted Obsidian file types.
  - `packages/ewe-note/src/cli/export-vault.ts`: write preserved non-note vault
    files back out when a manifest contains them.
  - `packages/ewe-note/src/cli/import-vault.test.ts`: assert `.canvas`, `.base`,
    broader media formats, folders, and unsupported files are preserved or
    explicitly skipped according to the matrix.
  - `packages/ewe-note/src/cli/vault-sync.test.ts`: add coverage only if the
    sync prototype owns the same manifest contract.
- **Steps**:
  - [ ] Add a manifest section for `files` or expand `attachments` so `.canvas`
        and `.base` are not invisible to import/export.
  - [ ] Align accepted file extensions with Obsidian's current documented file
        formats where safe.
  - [ ] Preserve relative paths, file size, MIME/type category, and content hash
        for non-note files.
  - [ ] Export preserved files byte-for-byte when import data contains file
        contents or copy source paths are available.
  - [ ] Keep `.obsidian` config ignored unless a specific safe config file is
        intentionally whitelisted for fixture validation.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note -- --run src/cli/import-vault.test.ts src/cli/vault-sync.test.ts`
  - `npm run type-check --workspace @eweser/ewe-note`
- **Verification**:
  - Import the feature vault, export it to a temp folder, and compare expected
    file inventory against the source fixture.
- **Manual test handoff**:
  - Tester should import/export the fixture vault, then open the exported folder
    in Obsidian and confirm Markdown, Canvas, Bases, and attachments are still
    visible.
- **Dependencies**:
  - `run-1`, `run-2`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 4: Add Editor And App Parity Assertions

- **Id**: `run-4`
- **Title**: `Add Editor And App Parity Assertions`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Automated and manual checks prove the fixture content works in EweNote for
    supported note-workflow features.
- **Files**:
  - `packages/ewe-note/src/editor/markdown.test.ts`: load feature-vault notes
    that must preserve or render Markdown syntax.
  - `packages/ewe-note/src/app/contexts/note-links.test.ts`: cover aliases,
    heading refs, block refs, non-existent links, embeds excluded from outgoing
    note links, and unlinked mention edge cases.
  - `packages/ewe-note/src/app/contexts/NotesContext.test.ts`: cover search,
    tasks, properties, templates, daily-note behavior, tags, and title
    derivation if current tests do not already cover them.
  - `e2e/cypress/tests/ewe-note.cy.ts`: add focused fixture-driven smoke tests
    only for high-value user-visible behavior.
  - `docs/ai/testing/ewe-note-obsidian-feature-parity-checklist.md`: record
    manual browser steps and expected results.
- **Steps**:
  - [ ] Add a fixture loader helper that can select notes by matrix category.
  - [ ] Assert lossless or normalized round trips for all `preserve-round-trip`
        Markdown notes.
  - [ ] Assert app-level behavior for links, backlinks, outgoing links,
        unlinked mentions, outline, properties, tags, tasks, search, templates, and
        daily notes.
  - [ ] Keep Canvas/Bases assertions at file preservation unless native UI is
        approved later.
  - [ ] Add a focused browser checkpoint for opening imported fixture notes,
        using Source Mode where rich rendering is intentionally absent.
- **Tests**:
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
  - Cypress fixture smoke if the local EweNote app is running.
- **Verification**:
  - Focused browser check against EweNote showing at least one fixture note with
    properties, links/backlinks, source mode, tasks, and search.
- **Manual test handoff**:
  - Tester should import the fixture vault, open the feature notes in EweNote,
    verify user-visible note workflow features, export, and compare in Obsidian.
- **Dependencies**:
  - `run-3`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 5: Final Gap Report And Parity Gate

- **Id**: `run-5`
- **Title**: `Final Gap Report And Parity Gate`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - A maintained parity report that says what EweNote currently matches, what it
    only preserves, and what remains intentionally out of scope.
- **Files**:
  - `docs/ai/testing/ewe-note-obsidian-feature-parity-checklist.md`: final
    checked manual results.
  - `docs/ai/plans/2026-05-04-obsidian-vault-feature-parity.md`: execution
    summary and residual risks.
  - `packages/ewe-note/README.md`: brief developer-facing pointer to the parity
    fixture and tests if not handled in Run 1.
- **Steps**:
  - [ ] Run the full EweNote unit test suite, type-check, and build.
  - [ ] Run the focused fixture import/export inventory comparison.
  - [ ] Run the browser checkpoint for imported fixture note workflows.
  - [ ] Open exported fixture vault in Obsidian and record any deltas.
  - [ ] Produce a gap table with categories: implemented, preserved only,
        intentionally out of scope, and failing.
- **Tests**:
  - `npm run lint --workspace @eweser/ewe-note -- --max-warnings=0`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
  - `git diff --check`
- **Verification**:
  - Manual Obsidian open/export check plus focused EweNote browser checkpoint.
- **Manual test handoff**:
  - Not needed after this run; this run produces the final handoff artifact.
- **Dependencies**:
  - `run-4`.
- **Model tier**: `strong`
- **Risk level**: `medium`

## Stop Conditions

Stop and ask for user approval if:

- Implementing the fixture requires product behavior outside this plan's scope,
  such as native Canvas, Bases, Graph, Publish, Sync, or plugin compatibility.
- The work requires published package API changes, backend changes, migrations,
  or changesets not explicitly approved here.
- Fixture binary files would materially bloat the repo or have unclear license
  status.
- Verification requires secrets, paid Obsidian services, or unsafe local file
  access.
- Existing dirty working-tree changes conflict with fixture/test edits and
  cannot be separated safely.

## Approval Boundary

Approval of this plan authorizes Coder to add the comprehensive fixture vault,
extend EweNote import/export manifest handling for Obsidian file preservation,
write/update EweNote tests and manual QA docs, run relevant verification, perform
internal QA, fix issues found inside this boundary, and update this plan's
execution summary.

Approval does not authorize native implementation of Canvas, Bases, Graph,
Publish, Sync, community plugins, paid Obsidian services, backend/API changes,
database migrations, published package API changes, unrelated UI redesign,
destructive git operations, direct pushes to `main`, or secret handling.

## Execution Summary

| Run     | Status    | Files Changed                                                                                                                                                        | Verification                                                                                                                                                                                                                                               | Notes                                                                                                                                |
| ------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `run-1` | Completed | `packages/ewe-note/test-fixtures/obsidian-feature-vault/matrix.json`, `docs/ai/testing/ewe-note-obsidian-feature-parity-checklist.md`, `packages/ewe-note/README.md` | Matrix JSON parse passed                                                                                                                                                                                                                                   | Added the source-of-truth matrix and manual checklist pointer                                                                        |
| `run-2` | Completed | `packages/ewe-note/test-fixtures/obsidian-feature-vault/**`                                                                                                          | Matrix JSON parse passed; app config and Canvas JSON parse checks passed; `.base` structure parsed                                                                                                                                                         | Built the comprehensive fixture vault with Markdown, attachments, Canvas, Bases, templates, daily notes, slides, and path edge cases |
| `run-3` | Completed | `packages/ewe-note/src/cli/**`, feature-vault fixture refinements                                                                                                    | `npm run test --workspace @eweser/ewe-note -- --run src/cli/import-vault.test.ts src/cli/vault-sync.test.ts` passed (`32` tests); `npm run type-check --workspace @eweser/ewe-note` passed                                                                 | Manifest now preserves non-note vault files and export round-trips preserved files byte-for-byte                                     |
| `run-4` | Completed | `packages/ewe-note/src/editor/**`, `packages/ewe-note/src/app/**`, `e2e/cypress/tests/ewe-note.cy.ts`, checklist                                                     | `npm run test --workspace @eweser/ewe-note` passed (`19` files, `135` tests); `npm run type-check --workspace @eweser/ewe-note` passed; `npm run build --workspace @eweser/ewe-note` passed                                                                | Added fixture-driven editor/app assertions and sourcePath-aware link resolution while preserving existing local EweNote WIP          |
| `run-5` | Blocked   | `docs/ai/testing/ewe-note-obsidian-feature-parity-checklist.md`, this plan, `packages/ewe-note/README.md`                                                            | Import/export inventory comparison passed with `25` notes and `22` preserved files; package lint/type-check/tests/build and `git diff --check` passed; Cypress passed `14/14` with explicit `127.0.0.1:5181` base URL; Obsidian reopen evidence incomplete | Final parity sign-off remains blocked pending Obsidian reopen evidence                                                               |

## Self-Reflection / Instruction Improvements

- The orchestrator should normalize Git-quoted paths before scope checks and
  staging. Filenames with spaces caused false scope violations and staging
  failures until `scripts/codex/lib/eweser-plan-orchestrator.mjs` was patched.
- The runtime-orientation instruction path should document the repo-local
  `.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh`
  fallback because the `~/.codex/skills/...` path was missing in this
  environment.
- For final UI gates, the plan should state the expected browser-control path
  and fallback order explicitly. In this run, Cypress initially crashed and a
  later retry passed only after using the explicit `127.0.0.1:5181` base URL.
