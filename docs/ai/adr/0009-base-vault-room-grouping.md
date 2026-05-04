# ADR-0009: Base/Vault Room Grouping

**Status:** Accepted  
**Date:** 2026-05-04

## Context

Ewe Note needs to sync Obsidian-compatible vaults without making filesystem
folders act like EweserDB room boundaries. A vault contains notes, folders,
attachments, Canvas files, Bases files, local mount settings, ignored patterns,
and device-specific sync state.

Rooms already provide collection and access-control boundaries. The existing
note schema also has optional `sourcePath`, `sourceVault`, `frontmatter`,
`aliases`, `tags`, and `folderIds`, which are enough for the first desktop
vault sync pass.

## Decision

Use **Base** as the user-facing vault/workspace unit. For Obsidian
compatibility, one base maps to one vault.

Internally, a base groups rooms instead of replacing rooms:

- `notes` room: Markdown note documents for the vault.
- Future `fileAttachments` room: binary attachment metadata for the same base.
- Optional metadata room or metadata document: vault name, `baseId`, local mount
  paths by device, ignored paths, attachment folder policy, and sync settings.

Do not add a first-class `bases` collection in this pass. Start with room
metadata, stable naming, and note-level `sourceVault`/`sourcePath` until the
product needs a cross-room base API.

## Key Points

- `baseId` is the stable logical identifier for a vault/workspace.
- `vaultName` is display metadata and can change.
- Local mount paths are device-local settings and should not be treated as a
  canonical synced path.
- Folders remain organizational metadata inside rooms, not room boundaries.
- Attachments should be represented as metadata and hashes, with binary bytes
  stored through local files or future object storage rather than inside note
  documents.

## Consequences

- Run 1 can bind a vault folder to a notes room without changing shared
  collection keys.
- Run 3 can add attachment metadata later without mixing note and file schemas
  in one room.
- The product can expose a simple "base/vault" concept without changing the
  lower-level `Room` collection boundary.
- No published package API or changeset is required for this documentation-only
  decision.

## Related

- [2026-05-01-obsidian-full-sync-base-files.md](../plans/2026-05-01-obsidian-full-sync-base-files.md)
- [ADR-0007: Rooms Topology + Doc-Split Combined Architecture](./0007-rooms-topology-refactor.md)
