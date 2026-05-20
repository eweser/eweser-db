# SDK Rooms And Documents Language

This file is a glossary for `@eweser/db`. Keep it free of implementation steps,
TODOs, and temporary design notes.

## Terms

- **Database client**: The SDK object an app creates to load local rooms,
  manage auth state, and coordinate sync.
- **Room client**: The SDK representation of one room. It owns document helpers,
  local state, and optional sync connection state for that room.
- **Initial room**: A room definition the SDK should ensure exists for the app
  during startup.
- **Loaded room**: A room whose local Yjs state is available to the app.
- **Document helper**: The public wrapper for creating, setting, deleting, and
  listing documents in a CRDT-safe way.
- **Soft delete**: A document state where `_deleted` is true and cleanup may
  later purge the item after its TTL.
- **Local persistence**: Browser IndexedDB-backed Yjs state that keeps the app
  useful offline.
- **Remote sync**: Optional Hocuspocus synchronization using a scoped sync token.
- **Seed data**: First-run documents inserted idempotently by the SDK or app.
  Seed data is not a migration.
- **Snapshot**: A portable backup bundle for selected rooms. A snapshot is not a
  live sync replica.

## Ambiguous Terms

- **Room registry**: Use only for the SDK-visible list of rooms; do not confuse
  it with auth-server grant storage.
- **Migration**: Clarify whether this means a local room data migration, a
  shared schema compatibility migration, or a PostgreSQL migration.
