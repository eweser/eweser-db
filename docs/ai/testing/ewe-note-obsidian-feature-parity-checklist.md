# EweNote Obsidian Feature Parity Checklist

Audience: developer or manual tester validating the `obsidian-feature-vault`
fixture and the current EweNote import/export contract.

Goal: keep parity claims concrete. This checklist distinguishes features that
EweNote should render and edit, features it must preserve on round trip, and
features that stay intentionally out of scope.

Rule: when checklist prose and `matrix.json` disagree, treat `matrix.json` as
the contract and record the discrepancy instead of improvising.

## Contract Inputs

- Matrix source of truth:
  `packages/ewe-note/test-fixtures/obsidian-feature-vault/matrix.json`
- Existing focused fixture assertions:
  `packages/ewe-note/test-fixtures/obsidian-parity/matrix.json`
- Current scope warning:
  Canvas, Bases, Graph view, Publish, Sync, and Obsidian CLI parity are not
  approved implementation targets for this plan. Preserve files honestly; do
  not report native feature parity where none exists.

## Setup

- From the repo root, confirm the matrix parses:
  `node -e "JSON.parse(require('fs').readFileSync('packages/ewe-note/test-fixtures/obsidian-feature-vault/matrix.json','utf8'))"`
- If you need the local app for later runs, start only the services required by
  the run under test.
- When browser work is involved, use a clean profile or clear local EweNote
  storage before the first import pass.
- Record:
  - date
  - branch or PR
  - app URL
  - whether auth/sync services were running
  - which matrix categories were exercised
  - any claimed feature that only preserved source instead of rendering

## 1. Fixture Vault Sanity In Obsidian

- [ ] Open `packages/ewe-note/test-fixtures/obsidian-feature-vault/` as an
      Obsidian vault.
- [ ] Confirm the fixture opens without obvious parse failures in standard
      Markdown notes.
- [ ] Confirm any `.canvas` fixtures open in Obsidian Canvas.
- [ ] Confirm any `.base` fixtures open in Obsidian Bases.
- [ ] Confirm attachment placeholders are visible as files and previewable where
      Obsidian supports them.
- [ ] Record any syntax that Obsidian itself rejects before blaming EweNote.

## 2. Matrix Coverage Review

- [ ] Read the matrix categories before testing. Do not improvise parity scope.
- [ ] Use feature ids from the matrix in your notes so later runs can tie test
      failures to the same contract item.
- [ ] For each feature marked `render-edit`, verify the fixture contains at
      least one representative example.
- [ ] For each feature marked `preserve-round-trip`, verify the fixture contains
      source or file examples that can survive import and export unchanged.
- [ ] For each feature marked `navigate/search` or `manual-only`, note the UI or
      browser flow that later runs must verify.
- [ ] Confirm the matrix still treats Canvas, Bases, Graph, Publish, Sync, and
      CLI parity as preserve-only or out of scope rather than implemented UI.

## 3. Import Contract Checks In EweNote

- [ ] Import the fixture vault into EweNote using the current supported flow.
- [ ] Verify Markdown notes appear in the note list without obvious data loss.
- [ ] Spot-check frontmatter-backed properties, tags, wiki links, tasks, and
      folder structure against the source files.
- [ ] Verify unsupported vault files are either preserved in the manifest/export
      path or explicitly documented as skipped.
- [ ] Record which matrix items are currently blocked by missing fixture content
      versus missing product behavior.

## 4. Browser Verification For Supported Workflows

- Automated smoke in this run:
  `e2e/cypress/tests/ewe-note.cy.ts` now uses
  `01 Markdown Syntax.md` and `11 Source Mode Edge Cases.md` directly from the
  feature vault fixture.
- Scope warning:
  current Cypress coverage exercises fixture content by pasting real vault notes
  into EweNote source mode. It does not prove the separate import flow; manual
  import/export verification is still required below.
- [ ] Open at least one fixture note for each major supported category:
      Markdown syntax, properties/tags, links/navigation, and tasks.
- [ ] Verify source mode remains available where rich rendering is incomplete.
- [ ] Verify search, backlinks, outgoing links, outline, or related note
      surfaces only for items the matrix marks `navigate/search`.
- [ ] Treat source mode as acceptable evidence only for features the matrix
      marks `preserve-round-trip` or `manual-only`.
- [ ] Do not count hidden controls, forced clicks, or DOM-only state as parity
      evidence for user-facing workflows.

## 5. Export And Round-Trip Check

- [ ] Export the imported fixture to a new temp directory.
- [ ] Compare note contents, folder structure, and preserved non-note files with
      the source fixture.
- [ ] Re-open the exported directory in Obsidian if the run under test changes
      import/export behavior.
- [ ] Record deltas by matrix feature id, not vague prose.

## Run 4 Focused Manual Handoff

- [ ] Import `packages/ewe-note/test-fixtures/obsidian-feature-vault/` into the
      current EweNote branch under test.
- [ ] Open `01 Markdown Syntax.md` in source mode and confirm task lines,
      comments, escaped syntax, and literal embed syntax remain truthful.
- [ ] Open `04 Properties and Tags.md` and verify tags and frontmatter-backed
      metadata appear without losing linked references.
- [ ] Open `06 Links Navigation Edge Cases.md` and verify outgoing links or
      related navigation resolve folder paths such as `Projects/Overview`,
      heading refs like `05 Link Targets#Canonical Heading Target`, and leave
      missing targets visibly unresolved rather than mis-linking.
- [ ] Open `11 Source Mode Edge Cases.md`, switch between source and preview,
      and confirm raw HTML, Obsidian comments, and escaped callout syntax
      remain available in source mode.
- [ ] Visit the tasks view after opening `01 Markdown Syntax.md` and confirm the
      two checklist items appear there.
- [ ] Record any mismatch between automated unit/Cypress assertions and the live
      imported-note behavior as a parity gap, not as an implied pass.

## Run 5 Final Gap Report And Parity Gate

Status: blocked. The fixture contract is materially stronger than before, but
this run cannot honestly claim full parity sign-off yet.

### Environment

- Date: 2026-05-04
- Branch: `codex/ewe-note-obsidian-editor-pr`
- EweNote app URL used for local checks: `http://127.0.0.1:5181/`
- Runtime orientation snapshot:
  Auth API unknown, App UI unknown, Sync `38181`, Postgres `5432`,
  Aggregator `38190`
- Obsidian desktop reopen check: attempted, but not accepted as parity evidence

### Automated Gate Results

- `npm run type-check --workspace @eweser/ewe-note`: passed
- `npm run test --workspace @eweser/ewe-note`: passed
  `19` files, `135` tests
- `npm run build --workspace @eweser/ewe-note`: passed
- `git diff --check`: passed after final docs and scoped formatting
- `npm run lint --workspace @eweser/ewe-note -- --max-warnings=0`: passed

### Focused Import/Export Inventory Comparison

Executed with the existing TypeScript CLI modules through Node 22
`--experimental-strip-types`:

- Imported fixture vault: `25` notes, `22` preserved files
- Exported vault: `25` notes, `22` preserved files
- Missing exported notes: none
- Extra exported notes: none
- Missing preserved files: none
- Extra preserved files: none
- Preserved file hash mismatches: none
- Explicitly skipped paths: `.obsidian`, `matrix.json`

This is enough to support the current preserve-only contract for attachments,
Canvas files, and Bases files. It is not enough to claim native Canvas/Bases
product parity.

### Browser And Manual Checkpoint Outcome

- Local EweNote dev server started and served at `http://127.0.0.1:5181/`
- Cypress initially crashed with `SIGABRT`, then passed after rerunning with
  the explicit base URL:
  `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`
- Final Cypress result: `14` passing, `0` failing, screenshots `0`, video
  disabled.
- No exported-vault reopen in Obsidian was performed in this session, so
  Obsidian-side deltas remain a manual follow-up. An exported temp vault was
  generated at `/tmp/ewe-note-obsidian-feature-parity-export`, but `open -a
Obsidian` did not switch Obsidian to that vault, and the Obsidian URI attempt
  landed on the vault picker instead of opening the exported note.

### Gap Table

| Category                   | Current state                                                                                                       | Evidence                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented                | Markdown/source-mode preservation, link parsing/navigation logic, tasks extraction, fixture-backed editor/app tests | `npm run test --workspace @eweser/ewe-note` passed with `135` tests; fixture-driven unit coverage in `src/editor`, `src/app`, and `src/cli` |
| Preserved only             | Vault file inventory, attachments, `.canvas`, `.base`, export byte preservation                                     | Focused import/export inventory comparison found `25` notes and `22` preserved files round-tripped with no missing paths or hash mismatches |
| Intentionally out of scope | Native Canvas UI, Bases UI/querying, Graph, Publish, Sync product parity, CLI parity                                | Still matches `matrix.json` contract; no evidence of native UI implementation added                                                         |
| Failing                    | Final parity gate                                                                                                   | Obsidian exported-vault reopen evidence was not completed in this session                                                                   |

## Report Template

```markdown
# EweNote Obsidian Feature Parity Report

## Environment

- Date:
- Branch or PR:
- App URL:
- Obsidian version:
- Auth/sync running: yes/no

## Verified Matrix Categories

- ...

## Implemented As Expected

- [feature id] expected behavior, evidence

## Preserved Only

- [feature id] preserved behavior, evidence

## Failures Or Regressions

- [feature id] repro, expected, actual

## Out Of Scope Confirmed

- [feature id] confirmed not claimed as implemented
```
