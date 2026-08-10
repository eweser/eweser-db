# Plan: Read-only Agent Memory room

## Goal

Publish curated agent-session journals into one private Ewe Note room that the
local publisher can write and the room reader's Ewe Note identity can browse but cannot
modify.

## Scope

- In: read-inclusive room registries, read-only sync tokens and relay
  enforcement, Ewe Note read-only editor behavior, access-token log redaction,
  focused tests, production deployment, and one least-privilege room/grant
  canary.
- Out: Agent Control, bulk journal publication, Omnara archival, room cleanup,
  public sharing, automatic capture, and changes to unrelated existing rooms.

## Assumptions / Open Questions

- Assumption: The existing Hocuspocus connection `readOnly` flag is the
  authoritative server-side write barrier for a read-only room connection.
- Assumption: A non-login service principal can own the private Agent Memory
  room and its single-room publisher grant; it will have no password or browser
  session.
- Assumption: The existing Ewe Note app grant can discover rooms where its owner
  has explicit read access after registry queries include read ACLs.
- Open question: none blocking; stop if production evidence contradicts these
  assumptions.

## Domain Language

- Glossary docs: `packages/auth-server-hono/GLOSSARY.md`,
  `packages/sync-server/GLOSSARY.md`.
- New terms: none.
- Changed terms: a granted room is readable when the grant owner is present in
  the room read, write, or admin ACL; it is writable only through write or admin
  ACL membership.
- ADR candidates: none; this completes the semantics already represented by
  room ACLs and read-only invites.

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential because the production canary depends on the deployed
auth and sync enforcement.

### Run 1: Enforce read-only room grants end to end

- **Id**: `run-1`
- **Title**: `Enforce read-only room grants end to end`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - Read-granted rooms appear in registries, receive read-only sync tokens, and
    cannot submit Yjs updates to the relay.
- **Files**:
  - `packages/auth-server-hono/src/model/rooms/calls.ts`: include explicit read
    ACLs while preserving write/admin behavior.
  - `packages/auth-server-hono/src/routes/access-grant.ts`: issue the correct
    read-only room sync token.
  - `packages/auth-server-hono/src/services/sync-token.ts`: carry the read-only
    claim.
  - `packages/sync-server/src/index.ts`: set Hocuspocus connection read-only.
  - focused tests for all boundaries.
- **Steps**:
  - [x] Add ACL helpers and read-inclusive registry queries.
  - [x] Derive room write authority when refreshing a sync token.
  - [x] Set and test the relay read-only connection flag.
- **Tests**:
  - `npm test --workspace @eweser/auth-server-hono`
  - `npm test --workspace @eweser/sync-server`
- **Verification**:
  - Unit proof that a read grantee can load but a read-only connection cannot
    apply an update.
- **Manual test handoff**:
  - Deferred to Run 3 production canary.
- **Dependencies**:
  - None.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 2: Make Ewe Note visibly read-only and redact tokens

- **Id**: `run-2`
- **Title**: `Make Ewe Note visibly read-only and redact tokens`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Read-only notes have no editable body, raw-source, title, move, duplicate,
    or delete controls; the client never logs access-grant JWTs.
- **Files**:
  - `packages/db/src/methods/connection/syncRegistry.ts` and
    `packages/db/src/utils/localStorageService.ts`: redact credential-bearing
    log values.
  - `packages/ewe-note/src/app/contexts/NotesContext.tsx`: fail closed on room
    mutations without write ACL.
  - `packages/ewe-note/src/app/pages/EnhancedEditor.tsx` and editor components:
    render a clear read-only state and disable all editing paths.
  - focused tests for the mutation guard and UI.
- **Steps**:
  - [x] Add one reusable room-write check.
  - [x] Guard context mutations and editor/source/frontmatter writes.
  - [x] Remove token values from client logging.
- **Tests**:
  - `npm test --workspace @eweser/db`
  - `npm test --workspace @eweser/ewe-note`
- **Verification**:
  - Synthetic browser pass with a read-only room and console inspection.
- **Manual test handoff**:
  - Provide screenshot and interactive fixture preview before PR handoff.
- **Dependencies**:
  - `run-1`.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 3: Deploy and publish one journal canary

- **Id**: `run-3`
- **Title**: `Deploy and publish one journal canary`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `full`
- **Deliverable**:
  - One private service-owned `Agent Memory` notes room, one single-room writer
    grant, explicit read access for an existing reader identity, and one verified
    journal note.
- **Files**:
  - Private runtime token and receipt files only; no credentials or personal
    identifiers in the public repository.
- **Steps**:
  - [ ] Merge the scoped PR and verify all production services on the merged
        commit.
  - [ ] Create the non-login service principal, room, ACL, and publisher grant
        in one fail-closed transaction.
  - [ ] Publish only the reviewed journal and perform fresh server read-back.
  - [ ] Verify Ewe Note can browse/export but cannot edit the note.
- **Tests**:
  - Production access-grant registry and read-only sync canary.
- **Verification**:
  - Exact content hash, deterministic note identity, private receipt, UI
    screenshot, zero credential-bearing console logs, and attempted-write
    rejection.
- **Manual test handoff**:
  - Open the exact Ewe Note route and confirm the journal is scannable and marked
    read-only; the source Omnara session remains unarchived.
- **Dependencies**:
  - `run-1`, `run-2`, green CI, merged deployment.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop and ask for user approval if:

- The production canary would touch an existing room, grant, note, or account.
- A schema migration, public package API change beyond the read-only token
  claim, or destructive cleanup becomes necessary.
- The relay cannot prove server-side write rejection for a read-only token.
- Provisioning cannot remain one new service principal, one room, one writer
  grant, and one read ACL.
- Required credentials or authenticated UI access are unavailable.

## Approval Boundary

The approved rollout is exactly one private Agent Memory room, a single-room
publisher writer grant, read-only access for an existing Ewe Note identity,
one reviewed journal, and production verification. This plan narrows the
prerequisite product changes to making that approved permission model true.

Approval does not authorize bulk publication, Omnara archival, room cleanup,
Agent Control rollout, edits to existing rooms/grants, or unrelated refactors.

## Execution Summary

| Run     | Status      | Files Changed                           | Verification                           | Notes                                      |
| ------- | ----------- | --------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `run-1` | Complete    | Auth registry, token, relay             | 27 focused tests and type checks green | Read-only claim enforced by Hocuspocus     |
| `run-2` | Complete    | DB diagnostics, Ewe Note context/editor | 23 focused tests and type checks green | Browser evidence pending milestone runtime |
| `run-3` | Not started |                                         |                                        | Requires merge and deployment              |

## Self-Reflection / Instruction Improvements

- Production console inspection must filter/redact credential-bearing SDK logs;
  never dump a raw browser console file during auth work.
