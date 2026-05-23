# EweserDB

EweserDB is a local-first, user-owned database SDK built on Yjs CRDTs. Users own their data, and apps interoperate over shared schemas.

## Self-Hosting

**One-click deploy on Railway**:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/JPbli2?referralCode=WlO5hM&utm_medium=integration&utm_source=template&utm_campaign=generic)

**Self-host on any VPS**:

```bash
curl -fsSL https://raw.githubusercontent.com/eweser/eweser-db/main/scripts/setup-vps.sh | bash
```

[Full deployment guides](docs/deployment/)

## What It Includes

- `@eweser/db` - core JavaScript client for local-first rooms and documents
- `@eweser/shared` - shared types, schemas, and helpers
- `@eweser/auth-server-hono` - Hono + better-auth auth API
- `@eweser/app` - React SPA for login, signup, account management, and access grants
- `@eweser/aggregator` - server-side indexing and public search
- `@eweser/sync-server` - Hocuspocus sync relay
- `@eweser/mcp` - MCP tools for authorized agent access to scoped rooms
- `@eweser/ewe-note` - TipTap-based Obsidian-compatible note-taking app
- example apps under `examples/`

## Quick Start

```bash
npm install @eweser/db yjs
```

This is a simplified example. For more complete usage, see the example apps in `examples/`.

```tsx
import { Database } from '@eweser/db';
import type { Note } from '@eweser/db';

const initialRooms = [
  {
    collectionKey: 'notes',
    name: 'My Notes on Life and Things',
  },
];

const db = new Database({ initialRooms });

db.on('roomsLoaded', () => {
  // Ready to use in offline mode immediately.
});

const notesRoom = db.getRoom<Note>('notes', 'my-notes-on-life-and-things');

// This wrapper exposes CRDT-safe document helpers for the room.
const Notes = db.getDocuments(notesRoom);

Notes.onChange((event) => {
  console.log('ydoc changed', event);
});

Notes.new({ text: 'hello world' });

// To enable remote sync, connect through the auth API and sync relay.
const loginUrl = db.generateLoginUrl({ name: 'Basic Example App' });

if (db.getToken()) {
  db.login();
}
```

That is enough to get a local-first database. It remains usable offline and can
sync between devices and apps when remote sync is connected.

## Core Ideas

### Rooms

A room is a Yjs-backed container with a collection key, shared schema, and room
access control. Rooms are the main authorization and remote-sync boundary.
Folders and bases can organize room content, but they do not replace room
collection boundaries.

### Collections and Schemas

Collections define strongly typed document shapes. Apps that share a schema can interoperate on the same data.

### Remote Sync

Apps load local IndexedDB-backed Yjs state first. Remote sync is optional and
uses the Hocuspocus sync relay with short-lived sync tokens for scoped room
connections. Synced does not mean public.

### References

Documents can be linked by reference using `_ref` values in the form:

`${authServer}|${collectionKey}|${roomId}|${documentId}`

Use `buildRef()` from `@eweser/shared` to construct refs.

### Access Control

The auth API owns room ACLs, access grants, sessions, and sync-token issuance.
Room ACLs define owner/admin/read/write rights. Access grants authorize an app
or agent for selected rooms and capabilities. Sync tokens authorize a specific
remote-sync connection.

### Public Aggregation

The aggregator indexes explicitly public rooms for public search. Public search
is separate from ordinary remote sync, collaborator sharing, and MCP-readable
agent access.

### User Snapshots

A user snapshot is a portable backup bundle for selected rooms. It is not a
sync replica, operator database backup, sync relay persistence store, or
federation backup listener.

### Encrypted Rooms

Ordinary hosted remote sync is not end-to-end encrypted. Encrypted rooms are an
opt-in room-level capability being planned for sensitive data, with explicit
tradeoffs for public search, MCP access, recovery, and collaboration.

### MCP and Agent Access

MCP tools expose only rooms included in an agent's readable or writable room
scope. MCP-readable rooms are not public-searchable unless the room is also
explicitly public.

## Example Apps

### Landing

- Dev URL: `http://localhost:4000/`
- Source: `packages/landing`

### Kitchen Sink (All Features)

- Dev URL: `http://localhost:38110/`
- Source: `examples/example-basic`
- Demonstrates multi-room notes, flashcards, profiles, cross-collection linking, sharing, room rename, connection status, auth flow, and offline-first loading

### Multi-Room Notes

- Dev URL: `http://localhost:38120/`
- Source: `examples/example-multi-room`

### Interop Notes + Flashcards

- Notes app: `http://localhost:38130/`
- Flashcards app: `http://localhost:38140/`
- Source: `examples/example-interop-notes` and `examples/example-interop-flashcards`

## Development

```bash
npm install
npm run dev:docker
```

`npm run dev:docker` starts the backend services from `docker-compose.dev.yml`.

For all apps in one shot (recommended when using VS Code), prepare local ports
and start the backend:

```bash
cp -n .worktree-ports.example .worktree-ports
source .worktree-ports 2>/dev/null || true
npm run dev:docker
```

If this checkout was created with `ewtnew`, `.worktree-ports` is generated for
the worktree automatically by `scripts/worktree-env.mjs`.

Then in VS Code: `Tasks: Run Task` → `Run All Dev`.

That task starts:

- Docker backend
- DB dev server
- Shared package dev server
- Landing page
- App SPA
- Example basic, multi-room, interop notes, and interop flashcards
- Examples components watcher
- Ewe Note

If you are not in VS Code, start these in separate terminals:

```bash
npm run dev --workspace @eweser/db
npm run dev --workspace @eweser/shared
cd packages/landing && npm run dev -- --host 127.0.0.1 --port "${LANDING_PORT:-4000}" --strictPort
cd packages/app && npm run dev -- --host 127.0.0.1 --port "${AUTH_PAGES_PORT:-${APP_PORT:-3001}}" --strictPort
cd examples/example-basic && npm run dev -- --host 127.0.0.1 --port "${EXAMPLE_BASIC_PORT:-38110}" --strictPort
cd examples/example-multi-room && npm run dev -- --host 127.0.0.1 --port "${EXAMPLE_MULTI_ROOM_PORT:-38120}" --strictPort
cd examples/example-interop-notes && npm run dev -- --host 127.0.0.1 --port "${EXAMPLE_INTEROP_NOTES_PORT:-38130}" --strictPort
cd examples/example-interop-flashcards && npm run dev -- --host 127.0.0.1 --port "${EXAMPLE_INTEROP_FLASHCARDS_PORT:-38140}" --strictPort
cd packages/ewe-note && npm run dev -- --host 127.0.0.1 --port "${EWE_NOTE_PORT:-5181}" --strictPort
```

`npm run dev` covers shared package + example packages, but not landing or app, so use the full command list above when you need every app.

- Landing page: `http://localhost:4000/`
- Auth API health: `http://localhost:38101/health`
- Auth pages dev server: `http://localhost:3001/auth/`
- Example basic app: `http://localhost:38110/`
- Multi-room app: `http://localhost:38120/`
- Notes interop: `http://localhost:38130/`
- Flashcards interop: `http://localhost:38140/`
- Ewe Note dev server: `http://localhost:5181/`

Run unit tests with `npm run test`.
Run e2e tests with `npm run test:e2e` or `npm run dev-e2e` for the Cypress UI.

## Quality and Contributing

All code must pass linting, formatting, type-checking, and tests before merging:

```bash
npm run check
```

Any change to a published package requires a changeset:

```bash
npm run changeset
```

## Notes

- Users should be told which room scopes and capabilities an app or agent is
  being granted for the duration of the session.
- Historical migration notes are kept in `docs/ai/` and `docs/ai/adr/`.
- Keep the docs in this repository aligned with the current package layout and workspace scripts.
