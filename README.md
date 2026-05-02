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

const room = db.getRoom<Note>(collectionKey, aliasSeed);

// This wrapper exposes CRDT-safe document helpers for the room.
const Notes = db.getDocuments(notesRoom);

Notes.onChange((event) => {
  console.log('ydoc changed', event);
});

Notes.new({ text: 'hello world' });

// To sync to the cloud, connect to the auth API.
const loginUrl = db.generateLoginUrl({ name: 'Basic Example App' });

if (db.getToken()) {
  db.login();
}
```

That is enough to get a local-first database that syncs between devices and apps.

## Core Ideas

### Rooms

A room is a Yjs-backed container with access control. It groups documents that share a collection key and schema.

### Collections and Schemas

Collections define strongly typed document shapes. Apps that share a schema can interoperate on the same data.

### References

Documents can be linked by reference using `_ref` values in the form:

`${authServer}|${collectionKey}|${roomId}|${documentId}`

Use `buildRef()` from `@eweser/shared` to construct refs.

### Access Control

The auth API handles ACL and access grants. Apps request access through the auth pages SPA and receive room-scoped tokens.

### Aggregator

Aggregator services index public room data so apps can search shared content without querying every client directly.

## Example Apps

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

In separate terminals, run the frontend workspaces you need:

```bash
npm run dev
npm run dev --workspace @eweser/app
npm run dev --workspace @eweser/ewe-note
```

`npm run dev` covers the shared SDK and example workspaces under `examples/`.

- Auth API health: `http://localhost:38101/health`
- Auth pages dev server: `http://localhost:3001/auth/`
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

- Users should be told that signing in grants the app read/write access to their user-owned database for the duration of the session.
- Historical migration notes are kept in `docs/ai/` and `docs/ai/adr/`.
- Keep the docs in this repository aligned with the current package layout and workspace scripts.
