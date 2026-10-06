# Plan: Same-note Markdown and collaborative editor synchronization

## Goal

Keep externally updated Markdown and open collaborative editors on one current
note without duplicate content or stale autosave overwrites.

## Scope

- In: EweNote editor reconciliation, deferred-save guards, recoverable conflicting
  human drafts, real Yjs/TipTap regressions, and documentation.
- Out: Credentials, permissions, production writes, restart/deployment/release,
  live browser changes, current-plan content, and filesystem-sync configuration.

## Assumptions / Open Questions

- Text-only MCP and vault updates modify the documents map, while TipTap edits a
  separate XML fragment. The existing bridge treats both as authoritative.
- Real replicas reproduce concurrent in-place `setContent` duplication. TipTap's
  `setEditable` emits an update without a changed document, which the prior
  autosave accepted. The exact live writer remains unidentified.
- All participating editor clients must run the new bridge before resuming live
  external writes. Old clients can still save the legacy fragment.

## Domain Language

- Glossary: EweNote Notes/Note and SDK room/document terminology are unchanged.
- New internal term: selected fragment is the room-backed pointer to the current
  collaborative representation of a note's Markdown.
- No public API, new dependency, PostgreSQL migration, or published package change.

## Runs

## Run Order And Manual Test Handoffs

One scoped source run. The parent reviews the exact source before dispatching an
independent cheap PR shepherd and deciding activation.

### Run 1: Reconcile full replacements and guarded human mirrors

- **Id**: `run-1`
- **UI classification**: `ui: true`
- **Browser checkpoint**: completed with two new managed test tabs and an owned
  loopback fixture after parent scope clarification.
- **Deliverable**: A full Markdown replacement seeds a unique fragment and selects
  it atomically through `tiptap:text-state`. Concurrent replacements choose one
  complete fragment through Y.Map resolution. Human edits retain normal Yjs
  collaboration inside that fragment.
- **Files**: `src/editor/text-sync.ts`, `src/components/tiptap-editor.tsx`,
  `src/notes-room.tsx`, the note-keyed editor host, focused regression files,
  package docs/indexes.
- **Steps**:
  - [x] Reproduce concurrent replacement duplication with two real Y.Doc replicas.
  - [x] Reject update events with unchanged documents and suppress editable updates.
  - [x] Guard saves by active fragment and current canonical text, retaining fresh
        note metadata. Pair the Markdown mirror and acknowledgement in one transaction.
  - [x] Rebind editors after a replacement instead of mutating a shared fragment.
  - [x] Preserve conflicting input in `tiptap:recovered-drafts` and show a copyable
        recovery panel; cancel superseded timers and reject stale unmount flushes.
  - [x] Mirror semantic peer edits and recover unmirrored human fragment edits on
        reopen, without normalizing pristine external Markdown during hydration.
  - [x] Test the actual CLI disk adapter in a temporary directory/in-memory room.
- **Tests**: Real Yjs and mounted React/TipTap cases cover simultaneous opens and
  replacements, focus, reconnect, pending saves, immediate close/reopen, legacy
  initialization, human edit convergence, source mode, read-only mode, exact rich
  Markdown preservation, metadata, and disk input. No production load tests.
- **Dependencies**: Existing installed packages only. Runtime orientation precedes
  local checks; no services were started.
- **Model tier**: Existing Sol6.1/high owner.
- **Risk level**: medium (shared collaborative editor state).
- **Manual test handoff**: After parent-approved activation, use an isolated test
  note and two updated clients. Edit Markdown externally, confirm exact source and
  one copy of headings in both editors. Make pending human input before replacing
  source, confirm the recovery panel and copyable text after reopening. Test normal
  concurrent typing and verify the Markdown mirror includes both edits. Verify
  mobile panel spacing/wrapping and keyboard operation. No user note is required.

## Stop Conditions

Keep production and live notes unchanged. Return any activation or migration
choice to the parent. Do not introduce fragment/draft garbage collection or
credential/access changes inside this fix.

## Approval Boundary

Jacob's bounded bugfix request authorizes source edits, tests, and a reviewable
PR. Parent feedback on 2026-10-06 explicitly pauses live restoration and requires
exact source review before separate cheap shepherd/activation. This PR is not
merge or deployment authority for this session.

## Execution Summary

Source run implemented. All 276 package tests, package lint, type check, code
index validation, and production build passed. Final verification is recorded in
the PR receipt. Focused local browser QA also passed without runtime source
changes. No existing user tabs, live board, or production state changed.

External Markdown updates the existing note's text. The editor seeds a unique
XML fragment and atomically publishes its room-backed pointer. Updated clients
bind that fragment and retain normal Yjs collaboration for human edits. A save
checks the selected fragment and latest source before pairing the Markdown mirror
with its acknowledgement. A superseded save retains the human draft instead.

### Verification gaps and residual risk

- Live stale writer identity and the running filesystem-sync route are unproven.
  The repository's CLI route is tested, not claimed to be configured in production.
- Focused local browser and recovery-panel QA passed as recorded below. The full
  Notes application shell, real authentication, and production sync deployment
  remain outside this disposable fixture check.
- Prior XML fragments and recovery drafts are retained rather than deleted. Each
  full replacement adds a fragment; retention/cleanup needs separate authority.
- Legacy fragment content remains intact. Pending drafts from updated clients are
  recoverable. An old client can still overwrite source until it is replaced.
- Whole external replacement intentionally selects the new source; conflicted
  human drafts are not automatically replayed into it.

### Safe activation/restoration proposal (not executed)

Keep Markdown authoritative now. Once the parent approves and activates reviewed
source, replace all old editor clients while preserving any unsaved input. Use one
parent-owned writer to restore the current canonical Markdown once, then confirm
exact readback and two updated clients. Do not blindly repeat live rewrites.

## Self-Reflection / Instruction Improvements

A successful immediate MCP readback does not establish editor stability. Future
external-write QA must include an already-open client, deferred save, and two
real Yjs replicas; unchanged-document update events must not count as human edits.

### Managed browser verification outcome

The parent accepted runtime source at `16fcd3f` and clarified that an existing
managed virtual write lease is suitable for disposable local testing. The earlier
empty-profile requirement was a scope interpretation, not a missing shared
capability. No browser runtime or profile change was required.

After fresh pool status, the normal synthetic-capability route allocated a managed
worker. The test created exactly two new tabs and retained their explicit page
handles. Calls targeted those handles only. An owned Vite fixture loaded the real
TipTap component, real keyboard input, separate Y.Doc replicas, and an in-memory
Hocuspocus relay on separately bound loopback listeners. Tab broadcasting was
disabled for the WebSocket-only cases. No dependency installation, account login,
production connection, or existing user tab interaction occurred.

| Case                                                  | Observed result                                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Already-open focused editor receives external text    | Both clients show one current heading/body; canonical Markdown keeps exact trailing newlines; zero automatic saves.                                                                                           |
| Pending keyboard input during replacement             | The external source wins; the human input remains in a recovery draft and survives editor close/reopen.                                                                                                       |
| Ordinary concurrent keyboard typing                   | Both clients and Markdown contain both typed contributions; editor JSON converges; one debounced save per client.                                                                                             |
| Source-mode typing and return to rich editor          | Both clients receive exact source; explicit save/exit actions complete; idle save counters remain stable.                                                                                                     |
| Actual socket disconnect/reconnect with pending input | Client A records connected/disconnected/connecting/connected, misses the external change while offline, then receives it after reconnect. Pending input is preserved; A's save count stays unchanged.         |
| Source-mode external replacement with task list/table | Keyboard shortcut enters source mode; superseded source draft is retained; the fresh source textarea and both rich editors converge. Exact Markdown, one heading, one table, and note metadata remain intact. |
| Recovery panel keyboard and layout                    | Enter opens the disclosure; Select All selects 55/55 draft characters; a keystroke cannot modify the read-only draft. At a 390-pixel viewport, page width stays 390 pixels.                                   |

No page errors occurred in the successful cases. The fixture's document text,
selected pointer, fragment JSON, save counts, connection events, and recovery draft
were read back after operations and idle debounce intervals. These are actual
browser and local WebSocket results, not mounted-test results.

Screenshots inspected:

- [Desktop recovery panel](./pr104-qa/recovery-desktop.png): aligned panel and note
  margins; clear padding, readable text, and visible keyboard focus. The panel is
  spacious and the draft field does not clip content.
- [Mobile recovery panel](./pr104-qa/recovery-mobile.png): summary wraps onto two
  lines; the 316-pixel draft field fits inside the 342-pixel panel. No horizontal
  overflow or cramped controls appeared at 390 pixels.
- [Rich source after replacement](./pr104-qa/rich-desktop.png): one heading,
  correctly aligned task controls, a legible table, and a distinct recovery panel.

The recovery panel looks acceptable at both tested widths. These screenshots show
an isolated editor fixture, not the full authenticated application shell.

Temporary fixture startup encountered the host's file-watcher limit. Disabling
watching in the owned fixture resolved it without changing host settings. Vite's
middleware ordering was corrected inside that temporary fixture. Neither issue
required a runtime source change. All owned tabs, test processes, and the managed
lease were closed or released after evidence capture. The fixture source and raw
readback proof remain in private state for reproducibility.

Limits: this checks updated clients only, one short disconnect/reconnect, and
uncommitted pending input. It does not establish long-offline whole-text conflict
policy, legacy-client safety, live writer identity, live filesystem-sync setup,
production authentication, or production deployment. The parent still owns the
PR hold, separate cheap shepherd, activation, and current-plan restoration.
