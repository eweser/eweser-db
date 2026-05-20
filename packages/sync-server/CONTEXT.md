# Sync Relay Language

This file is a glossary for `@eweser/sync-server`. Keep it free of
implementation steps, TODOs, and temporary design notes.

## Terms

- **Sync relay**: The Hocuspocus WebSocket service that relays Yjs updates for
  authenticated room connections.
- **Room connection**: One authenticated client connection to a scoped room.
- **Persistence store**: Server-side storage of Yjs updates for relay recovery.
- **Sync token claim**: A signed token field used to authorize a room
  connection, including room ID, collection key, user identity, and capabilities.
- **Webhook forwarding**: The sync relay's optional notification path to the
  aggregator after room updates.
- **Publication context**: The public/private room state attached to update
  forwarding so the aggregator can enforce indexing boundaries.
- **Usage event**: Metadata about a sync session such as duration or room ID.
  Usage events must not contain document content.

## Ambiguous Terms

- **Server copy**: Use `persistence store` for relay recovery and `backup` for
  user-visible backup behavior.
- **Public update**: Use only when a room's explicit publication state permits
  indexing; synced updates are not public by default.
