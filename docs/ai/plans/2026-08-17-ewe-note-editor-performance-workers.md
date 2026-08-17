# Plan: Ewe Note Editor Performance Attribution And Web Workers

## Goal

Keep Ewe Note editing visibly responsive under large-note and large-vault stress by attributing main-thread work to Ewe Note-owned processes, removing unnecessary work, and moving proven CPU-heavy plain-data transforms into a reusable typed Web Worker.

## Scope

- In:
  - Browser performance instrumentation for the Ewe Note edit, save, note-derivation, link-analysis, and local-vault-writeback pipeline.
  - Repeatable Cypress stress scenarios for large notes and large synthetic note collections.
  - A lazy, typed Vite module Web Worker with request versioning, stale-result rejection, timing metadata, and a synchronous correctness fallback.
  - Worker-backed unlinked-mention analysis as the first proven pure transform.
  - Further removal, incrementalization, yielding, or workerization of Ewe Note-owned processes only when the stress evidence identifies them as material contributors.
  - Regression gates for input responsiveness, main-thread long tasks, save persistence, and stale async results.
- Out:
  - Replacing or modifying TipTap, ProseMirror, Yjs, Hocuspocus, or their document model.
  - Moving editor state, DOM/layout work, `EditorView`, `Y.Doc`, or `Y.XmlFragment` instances into a worker.
  - Production real-user monitoring, analytics, or transmission of note content or performance traces.
  - Backend, auth, sync-relay, PostgreSQL, schema, migration, or published package API changes.
  - Treating every function with a non-zero duration as a worker candidate.

## Assumptions / Open Questions

- Assumption: The current uncommitted editor-responsiveness fix is the baseline. It already removes whole-document Markdown serialization from the synchronous keystroke path and defers saves by 750 ms; implementation must preserve its behavior and E2E coverage.
- Assumption: TipTap/Yjs remain the canonical editor and CRDT layers. This work targets Ewe Note-owned transforms and React derivations around them.
- Assumption: A Web Worker is valuable only for plain, structured-cloneable data. TipTap editor instances, ProseMirror views/selections, Yjs objects, DOM nodes, layout reads, and file handles remain on their owning thread.
- Assumption: The regular CI scenario uses a 2,500-paragraph note and a bounded synthetic note collection. A larger opt-in stress matrix may use 10,000 paragraphs and a larger collection without making ordinary CI excessively slow.
- Assumption: Performance thresholds need two layers: deterministic architectural assertions that are stable in CI, plus coarse browser latency/long-task budgets with diagnostic percentile output.
- Open question to resolve from Run 1 evidence: Whether global note projection/link/task derivation should become incremental, worker-backed, or both. The selection rule is specified below; this does not authorize unrelated refactoring.

## Verified Current Findings

- `TiptapEditor.onUpdate` still runs Ewe Note input-rule and slash-menu logic synchronously, which is appropriate only while those spans remain below a frame budget.
- After the save debounce, Ewe Note creates a whole-document TipTap JSON snapshot, converts it to Markdown, writes it through `Notes.set`, rereads/sorts room documents, rebuilds derived note models, derives wiki-link/backlink/task state, and may write browser-local vault files.
- Markdown-to-editor HTML conversion runs on the main thread when initializing or externally refreshing editor content.
- Unlinked-mention analysis is a pure plain-data transform and is already restricted to the active Links tab, making it a bounded first worker task.
- A directional local feasibility probe using the real serializer and a 2,500-paragraph, approximately 371 KB JSON document measured a median 1.13 ms synchronous conversion but a median 4.28 ms caller-side worker message cost. This was a Node worker-thread proxy, not browser acceptance evidence, but it shows why JSON-to-Markdown must not be workerized blindly.
- Vite supports a separately emitted module worker through `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`; Ewe Note needs no worker framework dependency for the first implementation.
- Web Worker messages copy ordinary object graphs through structured cloning. Transfer overhead is therefore part of the main-thread budget and must be measured alongside worker compute time.
- The Long Tasks API identifies tasks that monopolize the UI thread, while Event Timing/INP separates input delay, handler time, and presentation delay. Cypress runs inside a test-controlled browser, so results are lab regression evidence rather than field-performance claims.

## Domain Language

- Glossary docs: `GLOSSARY.md`, `packages/ewe-note/GLOSSARY.md`.
- New terms:
  - **Ewe Note performance span**: a test-enabled named measurement for one Ewe Note-owned stage of an interaction or save pipeline.
  - **Ewe Note compute worker**: the app-local dedicated Web Worker that runs explicitly supported, pure, plain-data transforms without network access.
- Changed terms: None.
- ADR candidates: None. A dedicated app-local worker and test probe are reversible implementation choices. Revisit an ADR only if worker ownership becomes a cross-package/public SDK contract.

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential. Run 1 establishes evidence and budgets. Run 2 introduces the worker and optimizes only evidenced Ewe Note-owned offenders. Run 3 locks in regression coverage and completes browser review.

After each completed run, Coder must update the Execution Summary and add a manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- synthetic test-data assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk;
- performance-report and screenshot paths where applicable.

### Run 1: Attribute The Ewe Note Main-Thread Pipeline

- **Id**: `run-1`
- **Title**: `Attribute The Ewe Note Main-Thread Pipeline`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - A test-enabled performance probe and Cypress stress report that identify which named Ewe Note-owned stages consume main-thread time during typing, debounced save, note switching, and Links-panel analysis.
- **Files**:
  - `packages/ewe-note/src/performance/ewe-note-performance.ts`: add a zero-data, test-enabled span/probe utility with named stages and no production trace export.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: measure input rules, slash-menu resolution, snapshot creation, Markdown serialization, and external Markdown parsing without changing behavior.
  - `packages/ewe-note/src/notes-room.tsx`: measure the local note write and room reread/sort boundaries.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: measure note projection, title/link/backlink derivation, task derivation, and local-vault writeback scheduling.
  - `packages/ewe-note/src/app/components/RightPanel.tsx`: measure outline and unlinked-mention derivation.
  - `e2e/cypress/tests/ewe-note-editor-performance.cy.ts`: retain the existing deterministic no-synchronous-snapshot regression and add attributed stress scenarios.
  - `e2e/cypress/support/commands.ts` or a focused helper beside the spec: add synthetic note/corpus builders and collection/report helpers only if repetition justifies them.
- **Steps**:
  - [x] Enable the probe only when Cypress installs a pre-load test flag/hook; production use must perform no content capture and no network transmission.
  - [x] Record stage name, start time, duration, thread label, input size/count metadata, and request id. Never record note text, titles, IDs, paths, or other user data.
  - [x] Observe `measure`, `longtask`, and supported Event Timing entries inside the application browsing context.
  - [x] Exercise at least these synthetic scenarios: continuous typing in a 2,500-paragraph note; debounced save and reload; Links panel open with a bounded synthetic note corpus; note switch/initial Markdown parse; and source/rich-mode transition.
  - [x] Emit a sorted attribution summary with count, median, p95, maximum, and main-thread/worker classification for each Ewe Note performance span.
  - [x] Keep the existing structural assertion that typing performs no whole-document snapshot before the debounce.
  - [x] Add a regular-CI coarse gate: no Ewe Note-owned synchronous span may itself become a greater-than-50 ms long task during the baseline scenario, and observed keyboard interaction latency must remain at or below 200 ms when Event Timing is supported.
  - [x] Add an opt-in extended matrix controlled by an explicit environment flag for 10,000-paragraph and larger-corpus diagnostics; log percentiles but do not make hardware-sensitive near-frame thresholds a default-CI failure until stable baselines exist.
  - [x] Record the baseline attribution table in this plan's Execution Summary before changing process placement.
- **Tests**:
  - Unit tests for the probe's disabled behavior, content-free records, percentile summary, and unsupported Performance API fallback.
  - `npm test --workspace @eweser/ewe-note`
  - Targeted Cypress run for `e2e/cypress/tests/ewe-note-editor-performance.cy.ts` in Chromium/Electron as supported by the repository runtime.
- **Verification**:
  - The report distinguishes editor input work, editor snapshot/serialization, Yjs-backed note persistence, note-model/link/task derivation, local-vault scheduling, and Links-panel analysis.
  - The test fails if the old per-keystroke whole-document snapshot behavior is temporarily reintroduced.
  - The performance probe contains no note content or network path.
- **Manual test handoff**:
  - Open the synthetic long-note fixture, type a short burst with the Links panel closed and open, then confirm characters paint immediately and the report attributes post-debounce work separately from input work.
- **Dependencies**:
  - Current editor-responsiveness fix and its existing E2E test.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Add The Typed Worker And Remove Proven Offenders

- **Id**: `run-2`
- **Title**: `Add The Typed Worker And Remove Proven Offenders`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - A reusable lazy Ewe Note compute worker running at least unlinked-mention analysis off the main thread, plus focused removal/incrementalization/workerization of any other Run 1 offender that crosses the selection threshold.
- **Files**:
  - `packages/ewe-note/src/workers/ewe-note-compute.protocol.ts`: define discriminated request/response DTOs, timing metadata, errors, and task result types.
  - `packages/ewe-note/src/workers/ewe-note-compute.worker.ts`: implement worker task dispatch using pure modules only.
  - `packages/ewe-note/src/workers/ewe-note-compute-client.ts`: create the lazy singleton client, request ids, scope/version tracking, stale-result rejection, worker failure recovery, and termination support.
  - `packages/ewe-note/src/app/contexts/note-analysis.ts`: extract worker-safe note/link/mention transforms from React context code when needed.
  - `packages/ewe-note/src/app/components/RightPanel.tsx`: request unlinked mentions asynchronously, preserve the last valid result while a newer request runs, and ignore stale results after note/tab changes.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: remove or incrementalize globally repeated derivation identified by Run 1; add a worker task here only if the selection rule is met.
  - `packages/ewe-note/src/components/tiptap-editor.tsx`: preserve debounced serialization on the main thread unless browser measurements meet the worker selection rule after transfer cost.
  - Focused unit tests beside the worker protocol/client and affected pure analysis modules.
- **Steps**:
  - [x] Instantiate the worker with Vite's static module-worker form and no new runtime dependency.
  - [x] Send only minimal plain DTOs. Do not send TipTap, ProseMirror, Yjs, DOM, room, provider, or file-handle objects.
  - [x] Return worker compute duration and correlate it with caller-side message/round-trip spans without including user content.
  - [x] Use request ids plus a logical scope/version so a slow response for an old note, old tab, or old content version can never overwrite newer UI state.
  - [x] Provide a tested synchronous pure-function fallback when `Worker` is unavailable or creation/runtime fails; fallback preserves correctness and records its main-thread placement.
  - [x] Move unlinked-mention analysis into the worker as the first real task. Keep the existing Links-tab demand boundary so the worker does no work while that panel is inactive.
  - [x] For each additional Run 1 offender, apply this order: remove unnecessary work; cache or derive only the changed note; yield non-urgent chunks; then use the worker if the transform is pure and browser measurements show lower caller-thread blocking after structured-clone cost.
  - [x] Do not move JSON-to-Markdown merely because it is serializable. Require its browser p95 main-thread compute to exceed both caller-side worker message p95 and an 8 ms materiality threshold on the same fixture.
  - [x] Verify the production build emits a hashed worker chunk and the PWA precache includes the worker JavaScript so the local-first app remains usable after installation while offline.
- **Tests**:
  - Worker protocol request/response exhaustiveness and error serialization.
  - Client tests for lazy creation, concurrent requests, latest-result wins, note switch, worker crash, fallback, and terminate/recreate.
  - Pure-function parity tests proving worker and fallback results are identical.
  - RightPanel tests for loading/retained-result behavior and stale-result rejection.
  - `npm test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
- **Verification**:
  - The worker chunk loads from the built app without a network service or credential.
  - Run 1's report shows unlinked-mention compute on the worker, with only bounded request/response work on the main thread.
  - Any additional optimization has before/after attribution evidence and no content or persistence drift.
- **Manual test handoff**:
  - Open Links for a synthetic large note collection, switch rapidly between two notes, and confirm the panel never displays an old note's mentions and typing remains responsive while analysis completes.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 3: Lock Performance And Persistence Regressions

- **Id**: `run-3`
- **Title**: `Lock Performance And Persistence Regressions`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `full`
- **Deliverable**:
  - Stable E2E performance gates, before/after attribution evidence, persistence/race coverage, and a safe browser-review handoff for the optimized editor.
- **Files**:
  - `e2e/cypress/tests/ewe-note-editor-performance.cy.ts`: finalize baseline and worker-backed stress scenarios and sanitized report output.
  - `packages/ewe-note/src/components/tiptap-editor-refresh.test.ts`: extend pending-save/async race coverage if worker placement affects refresh timing.
  - Worker/client/analysis tests from Run 2: add any regression cases found in browser QA.
  - `docs/ai/plans/2026-08-17-ewe-note-editor-performance-workers.md`: record final metrics, selected optimizations, rejected worker candidates, and residual risks.
- **Steps**:
  - [x] Prove the long-note test red by temporarily restoring a known synchronous offender, then restore the final code and prove green.
  - [x] Assert continuous typing does not synchronously snapshot/serialize the whole document and does not wait for worker results.
  - [x] Assert debounced save persists and survives reload, including a save followed quickly by note navigation.
  - [x] Assert Links-panel worker results are correct, latest-wins, and isolated by note/content version.
  - [x] Assert the baseline scenario contains no Ewe Note-owned greater-than-50 ms synchronous span and stays within the supported Event Timing interaction budget.
  - [x] Keep raw near-frame numbers diagnostic and report median/p95/max so future hardware-normalized budgets can tighten without guessing.
  - [x] Run focused browser review at desktop and a narrow viewport with synthetic/local-only data; inspect typing, note switching, Links panel, source mode, save/reload, console, layout, wrapping, clipping, and overflow.
  - [x] Provide the required screenshot, sanitized HTTPS evidence gallery, and separate interactive HTTPS application tunnel at milestone/PR handoff.
- **Tests**:
  - `npm test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
  - Focused ESLint/Prettier on changed files.
  - `npm run build --workspace @eweser/ewe-note`
  - Targeted performance Cypress spec, then the main Ewe Note Cypress spec.
  - `npm run code-index:check`
  - `git diff --check`
- **Verification**:
  - Final report contains before/after per-stage attribution, main-thread long-task count, supported interaction percentiles, worker compute/round-trip timing, fixture sizes, browser/version, and pass/fail budgets.
  - No private note content, user identity, local path, credential, production binding, or provider response appears in test artifacts or preview surfaces.
  - Review distinguishes local/reviewable status from committed, pushed, merged, deployed, and production-verified status.
- **Manual test handoff**:
  - Separate tester follows the interactive synthetic long-note route, types bursts with Links closed/open, switches notes during analysis, toggles source mode, reloads, and compares observed behavior with the attached attribution report and screenshots.
- **Dependencies**:
  - `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

## Worker Candidate Decision Table

| Process                                             | Current placement                      | Worker eligibility                                                                     | Planned treatment                                                                    |
| --------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TipTap/ProseMirror input transaction                | Main thread                            | No; owns editor state and DOM rendering                                                | Keep synchronous and minimize callback work                                          |
| Markdown input rules                                | Main thread                            | No practical benefit; selection/editor commands are not transferable                   | Measure and keep local unless a specific rule is rewritten incrementally             |
| Slash-menu state and `coordsAtPos`                  | Main thread                            | No; includes selection and layout read                                                 | Measure, avoid unnecessary layout reads, keep local                                  |
| TipTap `getJSON()` snapshot                         | Main thread                            | No; editor state cannot move                                                           | Keep after debounce and measure                                                      |
| TipTap JSON to Markdown                             | Main thread after debounce             | Technically yes, but JSON clone cost may dominate                                      | Keep local unless browser selection threshold passes                                 |
| Markdown to editor HTML                             | Main thread                            | Yes for string/plain context, but result integration stays main-thread                 | Measure switch/load path; workerize only if material after transfer                  |
| Unlinked-mention analysis                           | Main thread only while Links is active | Yes; pure strings/plain candidates and previously measured near a frame on a long note | First worker task                                                                    |
| Wiki-link/backlink/task derivation across all notes | Main thread on note collection changes | Yes if expressed as plain DTOs                                                         | Prefer changed-note incrementalization; workerize remaining material pure batch work |
| `Notes.set` / Yjs transaction and observers         | Main thread                            | No; CRDT ownership and synchronous consistency boundary                                | Keep local; reduce downstream observer work                                          |
| Browser-local vault file write                      | Browser main thread/API boundary       | File handles and permission state should remain local                                  | Measure scheduling; debounce/coalesce/yield preparation rather than passing handles  |

## Performance Acceptance Contract

- The editor paints ordinary keystrokes without first taking or serializing a whole-document snapshot.
- The regular synthetic stress case produces no Ewe Note-owned synchronous span longer than 50 ms.
- Supported keyboard Event Timing entries remain at or below 200 ms in the regular stress case; median/p95/max are always reported.
- Debounced save still persists the exact final content and survives reload/navigation races.
- Worker candidates are accepted only with browser evidence showing reduced caller-thread blocking after message-transfer cost.
- Worker responses are versioned and cannot update a different note, older content version, or inactive view.
- Stress fixtures and reports contain synthetic data only.

## External References

- Vite Web Workers: https://vite.dev/guide/features#web-workers
- MDN `Worker.postMessage()` and structured-clone behavior: https://developer.mozilla.org/docs/Web/API/Worker/postMessage
- MDN structured clone algorithm: https://developer.mozilla.org/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
- W3C Long Tasks API: https://www.w3.org/TR/longtasks-1/
- Interaction to Next Paint and interaction subparts: https://web.dev/articles/optimize-inp
- Off-main-thread Web Worker guidance: https://web.dev/articles/off-main-thread

## Stop Conditions

Stop and ask for user approval if:

- Implementation requires changing TipTap/ProseMirror/Yjs document semantics, collaboration wiring, or a published package API.
- A proposed worker task requires sending DOM nodes, editor/Yjs objects, file handles, credentials, private service data, or note content outside the local browser process.
- Browser measurement shows a candidate's worker message/clone overhead is equal to or worse than its main-thread compute and no removal/incremental alternative exists.
- Stable E2E attribution requires a new paid service, production telemetry, or production note access.
- Verification exposes content loss, stale save, cross-note result leakage, collaboration regression, or offline/PWA worker-loading failure that cannot be fixed inside this plan.
- Work would overwrite or discard the current uncommitted responsiveness changes.

## Approval Boundary

Approval of this plan authorizes Coder to implement the three runs above, preserve and extend the current editor-responsiveness changes, add app-local performance instrumentation and a typed Ewe Note Web Worker, move unlinked-mention analysis to that worker, optimize additional Ewe Note-owned processes only when Run 1 evidence and the selection rule justify it, write/update tests, run relevant verification, perform internal QA, fix issues found inside this boundary, and update this plan's execution summary.

Approval does not authorize replacing TipTap/Yjs, changing CRDT or sync semantics, adding production analytics, transmitting note data, changing auth/security, modifying published APIs, unrelated refactors, destructive git operations, direct pushes to `main`, deployment, or production-data testing.

## Execution Summary

| Run     | Status   | Files Changed                                                                                 | Verification                                                                                                                                  | Notes                                                                                                                                                                                                                                                                                                                                                         |
| ------- | -------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-1` | Complete | Performance probe, editor/room/context/panel instrumentation, Cypress stress spec             | Baseline and final performance E2E both 2/2 passing                                                                                           | Baseline showed unlinked mentions at 1,802.2 ms median / 1,960.1 ms max on the main thread. All other named edit/save stages stayed below 8 ms in the original typing scenario.                                                                                                                                                                               |
| `run-2` | Complete | Typed protocol/client/worker, extracted pure analysis, async Links hook and tests             | Focused tests, type-check, production build, worker/precache inspection                                                                       | On the rebased head, the 400-note scan measured 1,902.4 ms median / 2,005.8 ms p95 in the worker and only 0.8 ms maximum blocking `postMessage` work. Serializer stayed after debounce on main because final browser cost was 3.0 ms and did not meet the 8 ms worker threshold. Markdown parse p95 was 27.2 ms and stayed below the 50 ms acceptance budget. |
| `run-3` | Complete | Final stress budgets, extended opt-in fixture, narrow viewport proof, plan/evidence artifacts | 237 unit tests, lint, type-check, build, code-index check, diff check, performance Cypress 2/2; main Ewe Note Cypress 14/15 at known baseline | The known source-mode toolbar assertion still fails because the pre-existing Lists control remains visible. No new regression was found. Browser checkpoint passed with synthetic local-only data; Event Timing did not expose Cypress synthetic interactions, so the deterministic no-snapshot assertion and named-span budgets remain the CI input guard.   |

### Baseline Attribution Before Worker Placement

| Stage                                     | Thread / blocking | Median         | p95            | Maximum        | Decision             |
| ----------------------------------------- | ----------------- | -------------- | -------------- | -------------- | -------------------- |
| `notes.unlinked-mentions`                 | Main / blocking   | 1,802.2 ms     | 1,960.1 ms     | 1,960.1 ms     | Move to worker       |
| `editor.serialize-markdown`               | Main / blocking   | 7.2 ms         | 7.2 ms         | 7.2 ms         | Keep after debounce  |
| `notes.persist`                           | Main / blocking   | 7.0 ms         | 7.0 ms         | 7.0 ms         | Keep at Yjs boundary |
| `editor.snapshot`                         | Main / blocking   | 4.3 ms         | 4.3 ms         | 4.3 ms         | Keep after debounce  |
| `editor.input-rules`                      | Main / blocking   | 0.5 ms         | 2.5 ms         | 4.0 ms         | Keep synchronous     |
| Note projection / links / tasks / outline | Main / blocking   | at most 1.5 ms | at most 1.5 ms | at most 1.5 ms | No additional worker |

### Manual Test Handoffs

- **Run 1**: Start the Ewe Note dev server and run the focused performance Cypress spec against synthetic local IndexedDB data. Type in the 2,500-paragraph note, wait for the debounce, toggle source/rich mode, reload, then open Links. Expected: input takes no synchronous whole-document snapshot and the reports contain content-free named timing spans. Evidence: `e2e/cypress/screenshots/ewe-note-editor-performance-baseline.json` and `ewe-note-editor-performance-links.json`.
- **Run 2**: Open Links for the synthetic 400-note corpus and switch note/content versions while analysis is pending. Expected: the last valid mentions remain visible, stale responses are ignored, and the report labels compute as `worker` with bounded main-thread `postMessage`. Unit tests cover fallback, termination/recreation, deduplication, and latest-result behavior.
- **Run 3**: Use the interactive synthetic/local-only preview and evidence gallery listed in the final handoff. At desktop and narrow widths, type, toggle source mode, reload, and inspect Links. Expected: no horizontal page overflow, no clipping, saved text survives reload, and the Links result appears without freezing the editor. The public production build has no external credentials; the browser review reported zero console errors and one unrelated deprecated PWA meta-tag warning.

## Self-Reflection / Instruction Improvements

- The current performance E2E correctly protects a structural invariant but cannot attribute all post-save work. This plan adds named, content-free spans and separates stable structural gates from environment-sensitive timing diagnostics.
- Future editor features should add their derived work to the performance-span vocabulary when they run in or immediately after an interaction, instead of waiting for a user-visible regression.
