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
- **Browser checkpoint**: deferred under the source-only boundary.
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
the PR receipt. No live board, browser, or production changes.

External Markdown updates the existing note's text. The editor seeds a unique
XML fragment and atomically publishes its room-backed pointer. Updated clients
bind that fragment and retain normal Yjs collaboration for human edits. A save
checks the selected fragment and latest source before pairing the Markdown mirror
with its acknowledgement. A superseded save retains the human draft instead.

### Verification gaps and residual risk

- Live stale writer identity and the running filesystem-sync route are unproven.
  The repository's CLI route is tested, not claimed to be configured in production.
- Browser screenshots and visual assessment are deferred because the parent
  explicitly disallowed live browser/tab changes in this source phase. Mounted
  tests prove behavior, not responsive appearance or real WebSocket reconnects.
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

### Isolated browser verification attempt

The parent accepted runtime source at `16fcd3f` for isolated integration QA.
Runtime orientation found no local Eweser services. The approved browser pool
routes `write` leases to a saved virtual-worker profile. It routes fresh
`isolated` leases only for `read` or `interact`. Those leases prohibit keyboard
and JavaScript execution; permitted clicks and typing are limited to filters,
tabs, disclosures, and pagination.

The saved-worker lease was released after inventory only. A fresh isolated
inspection lease was also acquired and released. No tab was navigated, edited,
or closed, and no local test process or fixture was started. The actual-browser,
keyboard, visual, and real reconnect gaps remain open. Mounted tests are not live
browser proof.

The small missing capability is a pool-supported `isolated` **write** lease for
an empty disposable profile, retaining the same ownership/scope restrictions.
That routing change belongs to the shared browser runtime, outside this PR.
Once available, an owned loopback fixture can use the existing Vite, Yjs,
TipTap, and Hocuspocus packages without a new dependency or real authentication.
