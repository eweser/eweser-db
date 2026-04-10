# @eweser/sync-server

WebSocket sync server for EweserDB, powered by [Hocuspocus](https://hocuspocus.dev/).

## Overview

This server handles real-time CRDT synchronization between clients:

- **WebSocket connections** — Maintains persistent connections for live sync
- **Yjs CRDT protocol** — Uses Yjs for conflict-free replicated data types
- **Token-based auth** — Validates JWT tokens from the auth server
- **SQLite persistence** — Stores document state locally

## Architecture

```
Client A ←──WebSocket──→ Hocuspocus Server ←──WebSocket──→ Client B
                ↑                                    ↑
                └─── Yjs document updates ───────────┘
```

## Development

```bash
# Install dependencies
npm install

# Run directly (development)
SYNC_PORT=38181 SYNC_DB_PATH=/tmp/sync.sqlite SYNC_AUTH_SECRET=dev-secret npm run dev

# Or via Docker Compose (recommended)
npm run dev:docker  # From repo root
```

## Environment Variables

| Variable           | Default              | Description                       |
| ------------------ | -------------------- | --------------------------------- |
| `SYNC_PORT`        | `8080`               | WebSocket server port             |
| `SYNC_DB_PATH`     | `./sync-data.sqlite` | SQLite database path              |
| `SYNC_AUTH_SECRET` | Required             | Secret for validating auth tokens |

## Docker

Included in the main Docker Compose setup as `sync-server` and `sync-server-2` services for horizontal scaling testing.

## Authentication Flow

1. Client requests a sync token from auth server (`/access-grants/refresh-sync-token/:roomId`)
2. Auth server issues a JWT signed with `SYNC_AUTH_SECRET`
3. Client connects to Hocuspocus with token
4. Hocusp validates token via `onAuthenticate` hook
5. Connection established, Yjs updates flow bidirectionally

## Related Packages

- `@eweser/db` — Client SDK with Hocuspocus provider
- `@eweser/auth-server-hono` — Issues sync tokens
