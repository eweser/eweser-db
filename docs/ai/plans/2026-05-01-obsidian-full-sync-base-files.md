# Plan: Full Obsidian-Syncable Notes Bases

## Goal

Make Ewe Note fully syncable with Obsidian vaults, including Markdown notes, folder structure, renames/deletes, metadata, and binary attachments, with a user-facing base/vault unit that can be shared and synced across devices.

## Scope

- In: live EweserDB-backed Obsidian vault sync, base/vault metadata, note/folder path reconciliation, attachment metadata, local and remote file handling, conflict behavior, tests, docs, and changesets for published package API changes.
- Out: an Obsidian plugin, mobile filesystem sync, block-level CRDT merge for Markdown files edited outside Ewe Note, embedded Obsidian query runtime, and full E2EE.

## Current Findings

- `docs/ai/plans/completed/2026-04-04-obsidian-vault-sync.md` completed the first compatibility pass: OFM fixtures, shared Markdown helpers, import/export manifests, OFM rendering helpers, and a `vault-sync.ts` prototype.
- `packages/ewe-note/src/cli/vault-sync.ts` currently syncs between an Obsidian vault and a JSON state file. It intentionally does not connect to live `@eweser/db` rooms or Hocuspocus.
- `packages/ewe-note/src/cli/import-vault.ts` indexes attachments in the import manifest, but does not upload, persist, or sync binary file contents through EweserDB.
- `packages/shared/src/collections/note.ts` already has optional `sourcePath`, `sourceVault`, `frontmatter`, `aliases`, `tags`, and `folderIds`, which are enough for a better first live sync pass.
- `docs/ai/plans/2026-04-03-file-storage.md` is still deferred. It sketches `fileAttachments`, object storage, upload APIs, SDK helpers, and offline pinning, but those capabilities are not implemented.

## Architecture Decision

- Treat the user-visible unit as a **Base**. For Obsidian compatibility, one base maps to one Obsidian vault.
- Internally, a base should group rooms rather than replace rooms:
  - `notes` room: Markdown note documents for the vault.
  - future `fileAttachments` room: binary attachment metadata for the same base.
  - optional `baseMetadata` or room metadata: vault name, local mount paths by device, sync settings, ignored patterns, attachment folder policy.
- Keep `Room` as the collection/schema boundary. Do not mix arbitrary attachment and note documents in one room unless a later architecture plan deliberately changes room semantics.
- Use local vault folders as one sync peer, not the canonical source of truth. EweserDB remains the user-owned sync layer; Obsidian reads/writes through the filesystem bridge.

## Assumptions / Open Questions

- Assumption: "base" means a user-facing data workspace or vault-level access unit, not necessarily the existing `Room` class.
- Assumption: Phase 1 should support local filesystem attachments before remote object storage, because Eweser file handling is not built yet.
- Assumption: Markdown notes can remain last-writer-wins at the whole-file level for external Obsidian edits; Ewe Note/Yjs collaborative edits still merge inside the notes room.
- Open question: Should a base have its own first-class shared collection type now, or should it initially be represented by room metadata plus naming conventions?
- Open question: Should remote binary storage use MinIO/R2 first, or should desktop vault sync remain filesystem-only until the broader file-storage plan is approved?

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential by default. Runs 1 and 2 can be parallelized after Run 0 if implemented in separate worktrees. Runs 4 and 5 depend on the file model from Run 3.

After each completed run, Coder must update the Execution Summary and add a manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 0: Base/Vault Model Decision

- **Id**: `run-0`
- **Title**: `Base/Vault Model Decision`
- **Deliverable**:
  - A committed ADR or docs note defining base/vault terminology and how it maps to EweserDB rooms.
- **Files**:
  - `docs/ai/adr/`: add an ADR for base/vault grouping, or update an existing current architecture doc if preferred.
  - `ARCHITECTURE.md`: mention bases only if the concept becomes current product architecture.
- **Steps**:
  - [ ] Decide whether to add a `bases` collection now or start with room metadata.
  - [ ] Define `baseId`, `vaultName`, local mount path, ignored paths, and attachment folder policy.
  - [ ] Document why base groups rooms instead of replacing room collection boundaries.
- **Tests**:
  - Documentation-only unless a schema is introduced.
- **Verification**:
  - `npm run format:check` if docs formatting is enforced by the repo.
- **Manual test handoff**:
  - Not needed: architecture/documentation run only.
- **Dependencies**:
  - None
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 1: Live Room Sync Engine

- **Id**: `run-1`
- **Title**: `Live Room Sync Engine`
- **Deliverable**:
  - Replace the JSON-state prototype path with a reusable sync engine that can bind a vault folder to a live EweserDB notes room.
- **Files**:
  - `packages/ewe-note/src/cli/vault-sync.ts`: convert CLI from state-file-only prototype to live room sync.
  - `packages/ewe-note/src/cli/vault-sync.test.ts`: cover live-room behavior with local IndexedDB/fake IndexedDB or a test harness.
  - `packages/ewe-note/src/cli/import-vault.ts`: reuse parsing and deterministic ID helpers.
- **Steps**:
  - [ ] Add CLI flags for `--room`, `--auth-url`, `--token` or existing login-token loading, and `--offline-only`.
  - [ ] Instantiate `Database` with `IndexedDB` and optional `Hocuspocus` providers.
  - [ ] Load the target notes room and bind filesystem events to `Notes.set`, `Notes.new`, and `Notes.delete`.
  - [ ] Bind `Notes.onChange` back to filesystem writes with content comparison and write-origin suppression.
  - [ ] Preserve source paths and frontmatter through `serializeFrontmatter`.
- **Tests**:
  - `npm test --workspace @eweser/ewe-note -- vault-sync`
- **Verification**:
  - Manual two-process smoke test: run Ewe Note and vault sync against the fixture vault, edit in Obsidian-compatible Markdown files, verify updates appear in the notes room and vice versa.
- **Manual test handoff**:
  - Start local backend if remote sync is enabled, start Ewe Note, run the vault-sync CLI against a copied fixture vault, edit one `.md` file and one Ewe Note note, and verify both sides converge without repeated rewrites.
- **Dependencies**:
  - `run-0`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 2: Rename, Delete, and Conflict Semantics

- **Id**: `run-2`
- **Title**: `Rename/Delete/Conflict Semantics`
- **Deliverable**:
  - Robust reconciliation for create, update, rename, delete, and simultaneous edits.
- **Files**:
  - `packages/ewe-note/src/cli/vault-sync.ts`: path index, tombstone handling, conflict copy handling.
  - `packages/shared/src/collections/note.ts`: optional sync metadata if needed.
  - `packages/shared/src/utils/obsidian-markdown.test.ts`: add relevant path/frontmatter edge cases if needed.
- **Steps**:
  - [ ] Track deterministic note identity separately from mutable `sourcePath` when a rename is detected.
  - [ ] Soft-delete notes on file deletion instead of hard removing Yjs data.
  - [ ] Add per-note sync metadata such as `sourceMtimeMs`, `lastFileHash`, `lastEweserHash`, and `lastSyncedAt` if needed.
  - [ ] On true conflicts, keep both versions by writing an Obsidian-visible conflict note and preserving the EweserDB document.
  - [ ] Normalize paths across Windows/macOS/Linux.
- **Tests**:
  - `npm test --workspace @eweser/ewe-note -- vault-sync`
  - Shared package tests if note metadata changes.
- **Verification**:
  - Fixture-based tests for rename, delete, same-title notes in different folders, and simultaneous edit conflicts.
- **Manual test handoff**:
  - Rename a note in the vault, delete another, edit the same note from both Ewe Note and the filesystem inside the debounce window, and verify the expected note identity and conflict behavior.
- **Dependencies**:
  - `run-1`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 3: Attachment Metadata Model

- **Id**: `run-3`
- **Title**: `Attachment Metadata Model`
- **Deliverable**:
  - A file/attachment metadata schema that can represent Obsidian attachments before and after remote object storage exists.
- **Files**:
  - `packages/shared/src/collections/file-attachment.ts`: add if approved.
  - `packages/shared/src/collections/index.ts`: add collection key if approved.
  - `packages/ewe-note/src/utils/attachment-resolver.ts`: resolve by base/vault metadata and attachment records.
  - `.changeset/*`: changeset for published shared package changes.
- **Steps**:
  - [ ] Define `FileAttachmentBase` with stable content hash, source path, filename, MIME type, size, parent note refs, base ID, local availability, and optional remote object key.
  - [ ] Decide whether attachment metadata lives in a new `fileAttachments` collection or a `files` map inside the notes room for phase 1.
  - [ ] Keep binary bytes out of Yjs except for tiny test fixtures; store references and hashes in Yjs.
  - [ ] Update import/export manifests to include hashes and source paths, not just names and sizes.
- **Tests**:
  - Shared type/build tests.
  - Ewe Note import tests for attachment hash/path metadata.
- **Verification**:
  - `npm run build --workspace @eweser/shared`
  - `npm test --workspace @eweser/ewe-note -- import-vault`
- **Manual test handoff**:
  - Import a fixture vault with `Attachments/test-image.png` and verify the manifest or room metadata can identify the file by source path and content hash.
- **Dependencies**:
  - `run-0`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 4: Filesystem Attachment Sync

- **Id**: `run-4`
- **Title**: `Filesystem Attachment Sync`
- **Deliverable**:
  - Full local vault attachment sync without requiring remote object storage.
- **Files**:
  - `packages/ewe-note/src/cli/vault-sync.ts`: watch and reconcile binary attachment files.
  - `packages/ewe-note/src/utils/attachment-resolver.ts`: support note-relative and configured attachment folders.
  - `packages/ewe-note/src/extensions/image-embed.ts`: render synced local attachments.
  - `packages/ewe-note/src/cli/vault-sync.test.ts`: binary create/update/delete cases.
- **Steps**:
  - [ ] Watch supported attachment extensions in addition to `.md`.
  - [ ] Hash attachment bytes on change and update attachment metadata.
  - [ ] Copy or materialize attachments from Eweser metadata/local cache back to the vault attachment folder when needed.
  - [ ] Preserve Obsidian embed syntax such as `![[image.png]]` and `![[image.png|300]]`.
  - [ ] Use keep-both conflict behavior for binary changes.
- **Tests**:
  - `npm test --workspace @eweser/ewe-note -- vault-sync`
- **Verification**:
  - Manual fixture vault smoke test with image add, image replace, and image delete.
- **Manual test handoff**:
  - Add an image to the vault and embed it in a note, verify Ewe Note renders it, then create/update an attachment through Ewe Note or test metadata and verify it appears on disk.
- **Dependencies**:
  - `run-1`, `run-3`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 5: Remote File Storage Integration

- **Id**: `run-5`
- **Title**: `Remote File Storage Integration`
- **Deliverable**:
  - Binary attachments can sync across devices without a shared local vault folder.
- **Files**:
  - `docker-compose.dev.yml` / production compose files: add object storage if not already present.
  - `packages/auth-server-hono/src/routes/files.ts`: upload/download/presign routes.
  - `packages/auth-server-hono/src/lib/storage.ts`: S3-compatible storage adapter.
  - `packages/db/src/utils/files.ts`: SDK upload/download/cache helpers.
  - `packages/ewe-note/src/cli/vault-sync.ts`: push/pull attachment bytes through SDK helpers.
  - `.changeset/*`: changesets for public package API changes.
- **Steps**:
  - [ ] Implement or revive the relevant parts of `docs/ai/plans/2026-04-03-file-storage.md`.
  - [ ] Validate auth/session and room access for file upload/download.
  - [ ] Store object keys and hashes in attachment metadata documents.
  - [ ] Cache files locally and materialize them into the local Obsidian vault when a device mounts that base.
  - [ ] Enforce size limits and keep self-hosted configuration documented.
- **Tests**:
  - Auth server route tests with storage mock.
  - DB SDK file helper tests with mock fetch and hash verification.
  - Ewe Note attachment sync integration tests.
- **Verification**:
  - `npm run check`
  - Local MinIO or mocked object storage integration smoke test.
- **Manual test handoff**:
  - On one device/session, add an image attachment; on another fresh vault mount, sync the same base and verify the image materializes and renders in Obsidian-style embeds.
- **Dependencies**:
  - `run-3`, `run-4`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 6: Base/Vault UX and Docs

- **Id**: `run-6`
- **Title**: `Base/Vault UX and Docs`
- **Deliverable**:
  - Users can understand and operate base-level Obsidian sync without CLI-only tribal knowledge.
- **Files**:
  - `packages/ewe-note/src/app/**`: base/vault sync settings UI if in-app management is approved.
  - `README.md`, `ARCHITECTURE.md`, `LOCAL_DEVELOPMENT.md`: current behavior and commands.
  - `packages/ewe-note/README.md`: Obsidian sync guide.
- **Steps**:
  - [ ] Add or document "Mount Obsidian vault" flow.
  - [ ] Show sync status, last synced time, attachment storage status, and conflict count.
  - [ ] Document current limitations clearly: whole-file conflict behavior, desktop-first filesystem sync, no E2EE claim.
  - [ ] Document how one base maps to rooms and files.
- **Tests**:
  - Component tests or Cypress tests if UI is added.
  - Docs-only verification if only docs are changed.
- **Verification**:
  - `npm run check` if UI changes are included.
- **Manual test handoff**:
  - Follow the docs from a clean checkout and verify a fixture vault can be mounted, synced, and inspected.
- **Dependencies**:
  - `run-1`, `run-4`; `run-5` if remote file storage is documented as available.
- **Model tier**: `coder`
- **Risk level**: `medium`

## Stop Conditions

Stop and ask for user approval if:

- The implementation would require changing `Room` semantics to allow mixed collection schemas.
- Remote file storage is required before the user has approved the file-storage architecture and quota/security model.
- Auth/security behavior changes beyond file upload/download access checks are needed.
- A PostgreSQL migration is needed but not explicitly planned.
- A public package API change is needed without a changeset.
- Verification requires secrets, provider credentials, or unavailable external services.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above, make focused supporting edits needed for those runs, write/update tests, run relevant verification, perform internal QA, fix issues found inside this boundary, create required changesets, and update this plan's execution summary.

Approval does not authorize unrelated refactors, destructive git operations, direct pushes to `main`, deleting migrations, broad E2EE claims, reintroducing Next.js/Supabase patterns, or making remote binary storage a hosted paid feature without a separate product/security review.

## Execution Summary

| Run     | Status      | Files Changed | Verification | Notes |
| ------- | ----------- | ------------- | ------------ | ----- |
| `run-0` | Not started |               |              |       |
| `run-1` | Not started |               |              |       |
| `run-2` | Not started |               |              |       |
| `run-3` | Not started |               |              |       |
| `run-4` | Not started |               |              |       |
| `run-5` | Not started |               |              |       |
| `run-6` | Not started |               |              |       |

## Self-Reflection / Instruction Improvements

- None yet.
