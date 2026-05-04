# EweNote Real Obsidian Vault Sync Handoff

Date: 2026-05-04
Branch: `codex/ewe-note-obsidian-editor-pr`

## Current State

- EweNote Obsidian parity harness is committed on this branch.
- Package gates passed after the last commit:
  - `npm run lint --workspace @eweser/ewe-note -- --max-warnings=0`
  - `npm run type-check --workspace @eweser/ewe-note`
  - `npm run test --workspace @eweser/ewe-note`
  - `npm run build --workspace @eweser/ewe-note`
  - Cypress: `14/14` passing with
    `EWE_NOTE_BASE_URL=http://127.0.0.1:5181/ ELECTRON_RUN_AS_NODE= npx cypress run --config baseUrl=http://127.0.0.1:5181,video=false --spec e2e/cypress/tests/ewe-note.cy.ts`
- The user now has real Obsidian vaults synced and open.
- The user says those vaults contain secrets.

## Hard Stop

Do not run a real vault import, sync, export, room write, remote upload, or
manifest generation against the user's real vaults until the user approves the
exact vault paths, exact destination, and secret handling mode.

Do not infer vault paths from Obsidian windows, recent files, screenshots, or
system history. Ask for explicit paths.

Do not write raw secret values to terminal output, manifests, docs, screenshots,
logs, commits, ordinary memory, or EweserDB rooms.

## Recommended Next Run

Use [2026-05-01-obsidian-full-sync-base-files.md](../plans/2026-05-01-obsidian-full-sync-base-files.md),
starting with `run-0a`.

First deliverable:

- A local-only real-vault inventory preflight that reports:
  - vault path and vault name;
  - Markdown note count;
  - Canvas/Base count;
  - attachment count by extension and MIME family;
  - total attachment bytes and largest files;
  - skipped paths;
  - redacted secret-risk findings by rule id/path/line only.

The preflight must not:

- write note bodies into a manifest;
- copy binary files;
- write to an EweserDB room;
- upload to hosted storage;
- create persistent sync state;
- print raw secret values.

## File Handling Product Gap

The biggest remaining product issue is attachment handling:

- Current import/export can preserve attachment inventory and byte-for-byte
  exported preserved files.
- EweNote does not yet have the object storage layer for cross-device binary
  sync.
- The S3-compatible bucket and bring-your-own-storage provider work is still
  unimplemented.
- Local filesystem attachment rendering/materialization is still needed before
  a real vault can feel usable.

Relevant plans:

- [2026-05-01-obsidian-full-sync-base-files.md](../plans/2026-05-01-obsidian-full-sync-base-files.md)
- [2026-04-03-file-storage.md](../plans/2026-04-03-file-storage.md)

## Suggested Prompt

```text
[$eweser-planner] update and execute the first safe preflight slice of docs/ai/plans/2026-05-01-obsidian-full-sync-base-files.md. Start with run-0a only. My real Obsidian vaults contain secrets, so do not read or sync full contents until you have a local-only inventory mode that redacts secret-like values and reports only paths, line numbers, rule ids, and counts. Ask me for exact vault paths and destination before running it on real vaults.
```

## Manual Approval Needed Before Running On Real Vaults

Ask the user for:

- exact vault path or paths;
- whether the run is local-only inventory, local EweNote room sync, hosted sync,
  or remote object storage sync;
- whether secret-like notes should be skipped, redacted, or allowed into a
  private/local-only room;
- whether attachments should be counted only, copied locally, or uploaded;
- which storage provider profile is approved, if any.

Until those answers exist, use synthetic fixtures only.
