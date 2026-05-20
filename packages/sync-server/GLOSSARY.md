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
- **Publication metadata**: The public/private room state attached to update
  forwarding so the aggregator can enforce indexing boundaries.
- **Federation relay**: A server-side relay connection that carries authorized
  room updates between EweserDB auth servers.
- **Origin server**: The server that owns the room's authoritative grants and
  federation policy.
- **Home server**: The server a federated user signs in through when accessing a
  remote room.
- **Backup-listener relay**: A read-only or standby federation relay used for
  recovery, not collaboration.
- **Usage event**: Metadata about a sync session such as duration or room ID.
  Usage events must not contain document content.

## Ambiguous Terms

- **Server copy**: Use `persistence store` for relay recovery and `backup` for
  user-visible backup behavior.
- **Public update**: Use only when a room's explicit publication state permits
  indexing; synced updates are not public by default.
- **Relay**: Clarify whether this means a normal sync relay, federation relay,
  or backup-listener relay.
