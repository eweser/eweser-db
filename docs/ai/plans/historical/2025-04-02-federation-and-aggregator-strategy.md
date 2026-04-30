# Plan: Federation, Aggregator, and Cross-Server Interop Strategy

## Goal

Design a feasible federation architecture that lets self-hosted EweserDB instances interoperate — enabling cross-server real-time collaboration, public data discovery, fine-grained permissions, and a simple UX that doesn't punish users for choosing different providers.

## Decisions (Approved)

1. **Server-to-Server Relay (Approach B) from the start** — build the right foundation, not the quick one. Hocuspocus servers act as Yjs clients to each other for shared rooms.
2. **Auto-peer with eweser.com** — self-hosted servers automatically register `eweser.com` as a federation peer on setup. Can be removed for full isolation.
3. **eweser.com is the default aggregator** — indexes all public data from federated peers. "All federated public data" = double opt-in (server registers as peer + room marked public).
4. **User ID format**: `user@server` internally, display-name-first in UI — avoids email confusion by showing "alice" with a small "eweser.com" badge, not the raw `user@server` string.
5. **Share links point to origin server** — `https://origin-server.com/share/room-uuid`. The recipient's home server negotiates a relay to get a local copy.

## Current State Assessment

### What exists

- **ACL model**: Rooms already have `publicAccess` ('private' | 'read' | 'write'), `readAccess[]`, `writeAccess[]`, `adminAccess[]` — per-room, user ID arrays
- **Auth**: JWT tokens with `{access_grant_id, roomIds}` validated by Hocuspocus `onAuthenticate`
- **Room identity**: UUID v4, globally unique
- **Document refs**: `{collectionKey}.{roomId}.{documentId}`
- **Hocuspocus hooks**: Rich lifecycle hooks (`onAuthenticate`, `onChange`, `onStoreDocument`, `onLoadDocument`, `onRequest`) that give us all the extension points we need

### Key constraints

- Yjs CRDTs make cross-server sync _technically natural_ — any two Yjs docs with the same content can merge updates without conflict. The hard part is the plumbing (auth, discovery, routing).
- Hocuspocus is a single-server model by default. No built-in federation.
- EweserDB rooms are already isolated Yjs docs. This maps cleanly to per-doc permissions and federation units.
- `@hocuspocus/provider` works in Node.js — a Hocuspocus server can act as a client to another Hocuspocus server natively.

---

## Feasibility: Is Federation the Right Approach?

**Yes.**

### Why federation (vs. centralized)

- Aligns with "user-owned data" philosophy — you can't claim user ownership if there's one server
- Self-hosters keep full control of their data
- No single point of failure
- Precedent: Mastodon, Matrix, email all prove the model works
- Yjs CRDTs make the hard part (conflict resolution) free — the merge is automatic

### Why NOT full ActivityPub

- ActivityPub is designed for social media (activities, actors, inboxes). It's a poor fit for real-time CRDT sync.
- The protocol is complex and the ecosystem has interop issues.
- We'd end up implementing a custom extension on top of ActivityPub anyway for Yjs sync.
- **Better approach**: Borrow the _patterns_ (WebFinger for discovery, federated identity, server-to-server auth) without adopting the full protocol.

### The hard problems (and whether they're solvable)

| Problem                              | Difficulty | Solvable? | Notes                                                                                         |
| ------------------------------------ | ---------- | --------- | --------------------------------------------------------------------------------------------- |
| Cross-server Yjs sync                | Medium     | ✅        | Hocuspocus can act as a client to another Hocuspocus. Yjs merges are conflict-free by design. |
| User identity across servers         | Easy       | ✅        | `user@server` internally, display-name-first in UI. WebFinger for discovery.                  |
| Cross-server auth                    | Medium     | ✅        | Server-to-server signed requests (keypair per server, like Matrix's server signing keys).     |
| Sharing links that work cross-server | Easy       | ✅        | Link points to origin server. Recipient's server negotiates relay.                            |
| Global search / aggregation          | Medium     | ✅        | Each server indexes its public data. Federated search fans out queries to peers.              |
| Fine-grained permissions             | Easy       | ✅        | Already have per-room ACLs. Extend user IDs to `user@server` format.                          |
| UX simplicity                        | Hard       | ⚠️        | Avoid the Mastodon trap: default to eweser.com, hide server choice behind a subtle link.      |
| Abuse / spam in open federation      | Hard       | ⚠️        | Allowlists/blocklists, rate limiting, reputation. Can be deferred to later runs.              |

---

## Architecture

### 1. Federated Identity

**Internal format: `username@server.com`**

- Local users: stored as `username@this-server.com` (fully qualified everywhere for consistency)
- Remote users: `username@their-server.com`
- Bare `username` (no `@`) treated as local for backward compatibility
- Discovery: WebFinger endpoint at `/.well-known/webfinger`

**Display format: name-first, server as badge**

Users rarely see the raw `user@server` string. In the UI:

- Sharing dialog: **alice** with small subtitle "eweser.com"
- Profile pages: `https://eweser.com/@alice`
- When typing to invite: autocomplete from contacts, or type `alice@their-server.com` — UI renders it prettily
- Share links: `https://their-server.com/@alice` resolves to profile

```
GET https://their-server.com/.well-known/webfinger?resource=acct:alice@their-server.com

{
  "subject": "acct:alice@their-server.com",
  "properties": {
    "http://eweser.com/ns/display-name": "Alice"
  },
  "links": [
    { "rel": "self", "type": "application/json", "href": "https://their-server.com/api/users/alice" },
    { "rel": "http://eweser.com/ns/hocuspocus", "href": "wss://their-server.com/sync" },
    { "rel": "http://eweser.com/ns/federation", "href": "https://their-server.com/api/federation" }
  ]
}
```

### 2. Cross-Server Room Sharing — Server Relay Model

**The core mechanism**: when a room is shared across servers, each participating server maintains its own copy of the Yjs doc by acting as a Hocuspocus client to the origin server. Users only ever connect to their home server.

```
Alice (server1) shares a note with Bob (server2)

Alice's Browser                              Bob's Browser
└── WS → wss://server1.com/sync             └── WS → wss://server2.com/sync
         ↑                                            ↑
    server1 Hocuspocus ←——WS (Yjs sync)——→ server2 Hocuspocus
    (origin, stores doc)                    (relay, stores local copy)
```

**Flow**:

1. Alice invites `bob@server2.com` to a room
2. Server1 sends a federation invite to server2's federation API
3. Server2 verifies the invite (checks server1's signing key)
4. Server2 opens a `HocuspocusProvider` connection to `wss://server1.com/sync` with a server-level federated token, subscribing to that room's document
5. Server2 persists its own copy via the same `onStoreDocument` hook it uses for local rooms
6. Bob connects to `wss://server2.com/sync` as usual — the shared room appears alongside his own rooms
7. Updates flow: Bob → server2 → server1 → Alice (and vice versa), all via Yjs CRDT sync
8. If server1 goes down, Bob still has his local copy and can sync with other server2 users. When server1 comes back, Yjs merges everything cleanly.

**Direct connection as lightweight fallback**: For temporary/anonymous access (e.g., "view this shared link" before signing up), the client can connect directly to the origin server's Hocuspocus without a relay. This avoids needing a home server for casual viewers.

```
Anonymous viewer
└── WS → wss://server1.com/sync (direct, read-only, temporary token)
```

### 3. Sharing Flow & UX

#### Sharing a link

```
https://server1.com/share/room-uuid-here
```

When someone opens this link:

1. If they're logged in on server1 → direct room access
2. If they're logged in on a different server → their home server negotiates a relay with server1, room appears in their local rooms
3. If they're not logged in → landing page with the shared content preview + sign up / log in options
4. Casual/anonymous access → direct read-only connection to server1 (no relay needed)

#### UX for choosing a server

```
[Sign up with eweser.com]  (big, prominent, default)

"Want to self-host or use another provider?" (small, muted text link below)
→ Opens a simple form: [Enter your server URL: ________]
→ Redirects to that server's auth pages
```

The happy path is dead simple. Power users find the self-host option without it cluttering the default experience.

#### Sharing permissions UI (per-room)

- **Private** (default) — only you
- **Specific people** — invite by `user@server` (autocomplete from contacts), choose read/write/admin
- **Anyone with the link** — read or read+write (generates a share link)
- **Public** — listed in aggregator index, searchable by anyone on the federation

### 4. Fine-Grained Permissions

The current model is already per-room and supports read/write/admin levels. Extensions needed:

```typescript
// Extended ServerRoom type
type ServerRoom = {
  // ... existing fields ...
  publicAccess: 'private' | 'read' | 'write';
  readAccess: string[]; // 'user@server.com' format
  writeAccess: string[]; // 'user@server.com' format
  adminAccess: string[]; // 'user@server.com' format

  // New fields for federation
  federatedWith: string[]; // server domains that have relay copies
  shareLink?: string; // generated share URL (null if no link sharing)
  shareLinkAccess?: 'read' | 'write'; // what the share link grants
};
```

#### Permission Matrix

| Capability                        | Read | Write | Admin             |
| --------------------------------- | ---- | ----- | ----------------- |
| View documents in room            | ✅   | ✅    | ✅                |
| Yjs sync — receive updates        | ✅   | ✅    | ✅                |
| Yjs sync — send updates           | ❌   | ✅    | ✅                |
| Create/edit/delete documents      | ❌   | ✅    | ✅                |
| Invite others (read/write)        | ❌   | ❌    | ✅                |
| Change room permissions           | ❌   | ❌    | ✅                |
| Remove users from room            | ❌   | ❌    | ✅                |
| Change publicAccess level         | ❌   | ❌    | ✅                |
| Generate/revoke share links       | ❌   | ❌    | ✅                |
| Delete the room                   | ❌   | ❌    | ✅ (creator only) |
| Approve federation relay requests | ❌   | ❌    | ✅                |

#### Hocuspocus Enforcement — `onAuthenticate`

Hocuspocus natively supports `connection.readOnly` in the `onAuthenticate` hook. This is enforced **server-side** — a read-only client can receive Yjs updates but any updates it tries to send are silently dropped. This is the enforcement mechanism for the read vs write distinction.

```typescript
// In Hocuspocus onAuthenticate hook
async onAuthenticate({ token, documentName, connection }) {
  const { userId, access, serverDomain, type } = verifyToken(token);
  const room = await getRoomByDocumentName(documentName);

  // Share link — anonymous, direct connection, no relay
  if (type === 'share-link') {
    connection.readOnly = room.shareLinkAccess !== 'write';
    return { user: 'anonymous', role: room.shareLinkAccess ?? 'read' };
  }

  // Federated server relay — server-to-server token
  if (type === 'federation-relay') {
    if (!room.federatedWith.includes(serverDomain)) {
      throw new Error('Server not authorized for relay');
    }
    // Relay gets the highest access level needed by its users
    connection.readOnly = access === 'read';
    return { server: serverDomain, role: access };
  }

  // Local or federated user — user-level token
  if (room.adminAccess.includes(userId)) {
    connection.readOnly = false;
    return { user: userId, role: 'admin' };
  }
  if (room.writeAccess.includes(userId)) {
    connection.readOnly = false;
    return { user: userId, role: 'write' };
  }
  if (room.readAccess.includes(userId)) {
    connection.readOnly = true;
    return { user: userId, role: 'read' };
  }

  throw new Error('Not authorized');
}
```

#### Permissions with Federation Relay

When server2 relays a room from server1, the relay connection itself needs a permission level. Critically, **server2 must also enforce permissions locally** — just because the relay has write access doesn't mean every user on server2 gets write access.

```
Alice (admin on server1) invites Bob (write) and Carol (read), both on server2

1. server1 stores:
   writeAccess: [..., 'bob@server2.com']
   readAccess: [..., 'carol@server2.com']

2. server1 issues federated token:
   { serverDomain: 'server2.com', roomId: '...', access: 'write' }
   (write because at least one server2 user needs write)

3. server2's relay connects to server1 with this token
   → server1 onAuthenticate: connection.readOnly = false ✅

4. server2 enforces locally:

   Bob connects to server2 → onAuthenticate:
     bob@server2.com is in writeAccess → connection.readOnly = false
     Bob's updates flow: Bob → server2 → relay → server1 → Alice ✅

   Carol connects to server2 → onAuthenticate:
     carol@server2.com is in readAccess → connection.readOnly = true
     Carol receives updates but can't push through the relay ✅
```

The relay connection to the origin server uses the **highest permission level needed by any local user**. Server2 is responsible for enforcing that read-only users can't push updates through the relay.

#### Admin Actions Flow Across Federation

Admin actions (inviting, changing permissions, deleting rooms) are **not Yjs operations** — they're REST API calls authorized by the origin server. Yjs handles document content; permissions live in the auth server's database.

```
Bob is admin on a room hosted on server1, but Bob is on server2

Bob clicks "invite carol@server3.com with write access"
→ Bob's client calls: POST server2.com/api/federation/proxy-admin-action
→ server2 forwards to: POST server1.com/api/federation/admin-action
   (request signed with server2's key, includes bob@server2.com as actor)
→ server1 verifies:
   1. server2's signature is valid
   2. bob@server2.com is in adminAccess for this room → yes
→ server1 updates room: writeAccess: [..., 'carol@server3.com']
→ server1 sends federation invite to server3
→ server3 sets up relay connection
→ Carol sees the room on server3
```

#### Permission Upgrade/Downgrade Mid-Session

If an admin changes someone's access level while they're connected, the change takes effect in real-time using Hocuspocus's `onTokenSync` hook — no reconnection required:

```typescript
// Hocuspocus onTokenSync hook — handles mid-session permission changes
async onTokenSync({ token, connection, context }) {
  const room = await getRoomByDocumentName(context.documentName);
  const userId = context.user;

  if (room.adminAccess.includes(userId) || room.writeAccess.includes(userId)) {
    connection.readOnly = false;
  } else if (room.readAccess.includes(userId)) {
    connection.readOnly = true; // downgraded to read-only
  } else {
    throw new Error('Access revoked'); // disconnects the user
  }
}
```

#### Share Links and Anonymous Access

Share links bypass the `user@server` identity system entirely. Viewers connect directly to the origin server (no relay needed — they don't have a home server in this flow):

| Share link access | Hocuspocus behavior                                         |
| ----------------- | ----------------------------------------------------------- |
| `read`            | `connection.readOnly = true`, anonymous identity, no relay  |
| `write`           | `connection.readOnly = false`, anonymous identity, no relay |

#### Enforcement Summary

| Layer                                | What it enforces                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| **Hocuspocus `onAuthenticate`**      | Initial connection: set read-only flag based on role, reject unauthorized users |
| **Hocuspocus `onTokenSync`**         | Mid-session permission changes (upgrade, downgrade, revocation)                 |
| **Hocuspocus `beforeHandleMessage`** | Optional extra validation (e.g., token expiry mid-session)                      |
| **Origin server REST API**           | Admin actions (invite, permission change, room deletion) — source of truth      |
| **Relay server (local Hocuspocus)**  | Per-user permission enforcement for federated users on its server               |
| **Client SDK**                       | UI-level hints (hide edit controls for read-only) — not a security boundary     |

The system is layered: Hocuspocus enforces read vs write at the protocol level (Yjs updates rejected server-side), admin actions are separate API calls authorized by the origin server, and relay servers are responsible for enforcing per-user permissions locally.

### 5. Aggregator / Global Search

**Each server runs a local indexer**:

1. Hocuspocus `onChange` hook watches rooms marked `publicAccess: 'read' | 'write'`
2. Extracts searchable content (document text, metadata, collection type, owner)
3. Stores in Postgres full-text search index (already in the stack)
4. Exposes a search API endpoint: `GET /api/search?q=...&collection=notes`

**Federated search** (fans out to peers):

1. User searches on their home server
2. Home server queries its local index
3. Home server fans out the query to registered federation peers (with timeout)
4. Results are merged, deduplicated, and returned
5. Results include origin server info so the client can request relay access

**eweser.com as default aggregator**:

- All self-hosted servers auto-register `eweser.com` as a peer on setup
- This means eweser.com can query all peers' search APIs — effectively a global search
- Servers that don't want this can remove eweser.com as a peer
- Public data = double opt-in: server is a peer AND room is marked public
- eweser.com can optionally **cache** peer search results for faster global search (like a search engine index)

```
User on server2 searches "machine learning notes"
→ server2 searches local Postgres FTS index
→ server2 queries eweser.com search API (peer)
→ eweser.com queries its own index + its other peers
→ Results merged, deduplicated by room ID
→ Each result links to origin server for access
```

### 6. Server-to-Server Authentication

Each EweserDB server has a **signing keypair** (Ed25519, generated on first run):

```
/.well-known/eweser-server
{
  "serverDomain": "my-server.com",
  "publicKey": "base64-encoded-ed25519-public-key",
  "hocuspocusUrl": "wss://my-server.com/sync",
  "federationApiUrl": "https://my-server.com/api/federation",
  "searchApiUrl": "https://my-server.com/api/search"
}
```

**Federation handshakes** (invites, relay setup, search queries):

1. Server signs the request body + timestamp with its private key
2. Receiving server fetches sender's `/.well-known/eweser-server` to get the public key (cached with TTL)
3. Receiving server verifies the signature
4. Requests include: `X-Eweser-Server: my-server.com`, `X-Eweser-Signature: base64`, `X-Eweser-Timestamp: epoch`
5. Replay protection: reject requests with timestamps older than 5 minutes

**Federated room tokens** (for Hocuspocus relay connections):

- Origin server issues a JWT signed with its server key
- Contains: `{ serverDomain, roomIds, access: 'read'|'write', exp }`
- Relay server presents this token in `HocuspocusProvider({ token })` when connecting

### 7. Peer Registration & Discovery

**Auto-registration on setup**:

```
POST https://eweser.com/api/federation/register
{
  "serverDomain": "my-server.com",
  "publicKey": "...",
  "hocuspocusUrl": "wss://my-server.com/sync",
  "searchApiUrl": "https://my-server.com/api/search"
}
// Signed with my-server.com's private key
```

**Peer management**:

- Servers maintain a `federation_peers` table: domain, public key, last seen, status (active/blocked)
- Health checks: periodic ping to `/.well-known/eweser-server`
- Blocklist: server admin can block specific peers (spam/abuse mitigation)
- eweser.com can maintain a public peer directory for discovery

---

## Implementation Runs (Ordered by Dependency)

### Run 1: Server Identity & Keypair Infrastructure

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Cryptographic foundation, needs careful design
- [ ] Generate Ed25519 keypair on first server start, store in DB
- [ ] `/.well-known/eweser-server` endpoint serving public key + server metadata
- [ ] Signature verification middleware for federation requests
- [ ] `federation_peers` table (Drizzle schema)
- [ ] Peer registration endpoint: `POST /api/federation/register`
- [ ] Auto-register `eweser.com` as peer on first start
- [ ] Tests: keypair generation, signature creation/verification, peer registration
- Files: `packages/auth-server/` (or `auth-server-hono/`), `packages/shared/src/`

### Run 2: Federated Identity & WebFinger

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Core identity model change, touches shared types
- [ ] Update user ID format to `user@server` across `@eweser/shared` types
- [ ] Backward compatibility: bare `username` → `username@{this-server}`
- [ ] `/.well-known/webfinger` endpoint
- [ ] User ID parsing utilities: `parseUserId(id) → { username, server }`
- [ ] Display name resolution (for UI: name + server badge)
- [ ] Tests: WebFinger resolution, user ID parsing, backward compat
- Files: `packages/shared/src/`, `packages/auth-server/`
- ⚠️ Changeset needed: `@eweser/shared` type changes

### Run 3: Federation API & Room Invite Flow

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Complex server-to-server protocol, auth flow
- [ ] Federation API endpoints: `POST /api/federation/invite` (send room invite to remote server)
- [ ] Federation API endpoints: `POST /api/federation/accept-invite` (accept and initiate relay)
- [ ] Federated room token issuance (JWT signed with server key)
- [ ] Room access list updates for federated users (`user@remote-server`)
- [ ] Tests: invite flow, token issuance, cross-server auth
- Files: `packages/auth-server/`, `packages/shared/src/api/`

### Run 4: Hocuspocus Server Relay Extension

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Core federation mechanism, Hocuspocus extension development
- [ ] Hocuspocus extension that acts as `HocuspocusProvider` client to remote servers
- [ ] Manage relay connections lifecycle (connect, reconnect, disconnect)
- [ ] Local persistence of relayed rooms (same `onStoreDocument` path as local rooms)
- [ ] `onAuthenticate` updates: accept federated server tokens, verify server signatures
- [ ] Room appears in local user's room registry after relay is established
- [ ] Tests: relay connection, bidirectional sync, persistence, reconnection
- Files: Hocuspocus server package, new extension module
- ⚠️ Changeset needed: `@eweser/db` if SDK changes are needed

### Run 5: Share Links & Direct Access Fallback

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Simpler endpoint + token generation, well-scoped
- [ ] Share link generation: `POST /api/rooms/:roomId/share-link`
- [ ] Share link landing page (static HTML preview + auth options)
- [ ] Direct anonymous read-only connection for share link viewers
- [ ] Share link token validation in Hocuspocus `onAuthenticate`
- [ ] Tests: link generation, anonymous access, permission enforcement
- Files: `packages/auth-server/`, Hocuspocus config

### Run 6: Sharing UX & Permissions UI

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: UI work, patterns already established in ewe-note
- [ ] "Share" dialog in ewe-note: private / specific people / link / public
- [ ] Invite by `user@server` with autocomplete from contacts
- [ ] Server selection UI in sign-up flow (big eweser.com button + subtle "self-host" link)
- [ ] Display federated users with name + server badge (not raw `user@server`)
- [ ] Tests: sharing dialog interactions, permission changes
- Files: `packages/ewe-note/`, `packages/examples-components/`

### Run 7: Local Aggregator / Search Index

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Indexing pipeline, Postgres FTS setup
- [ ] Hocuspocus `onChange` hook → extract text from public rooms → Postgres FTS index
- [ ] `search_index` table (Drizzle schema): room_id, collection, content, owner, server, updated_at
- [ ] Search API endpoint: `GET /api/search?q=...&collection=...`
- [ ] Debounced indexing (don't re-index on every keystroke)
- [ ] Search UI in ewe-note
- [ ] Tests: indexing pipeline, search queries, relevance
- Files: Hocuspocus server, `packages/auth-server/`, `packages/ewe-note/`

### Run 8: Federated Search

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Distributed systems, fan-out with timeouts
- [ ] Fan-out search queries to registered peers with timeout (e.g., 2s)
- [ ] Result merging and deduplication (by room ID)
- [ ] Caching of peer search results (optional, for eweser.com global search)
- [ ] Rate limiting on search API to prevent abuse
- [ ] Tests: fan-out, timeout handling, merge, rate limiting
- Files: `packages/auth-server/`, federation module

---

## Risks

| Risk                                           | Mitigation                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Complexity creep — federation is a rabbit hole | Each run is independently valuable and testable. Don't start next run until current is solid.   |
| UX confusion (Mastodon problem)                | Default to eweser.com. Server choice hidden behind subtle link. Display names, not raw IDs.     |
| Abuse/spam on open federation                  | Peer blocklists, rate limiting, auto-register only eweser.com by default. Trust is opt-in.      |
| Relay connection management at scale           | Lazy relay — only open relay connections when users are active. Disconnect idle relays.         |
| Auth complexity with federated tokens          | Ed25519 keypairs + JWT is well-understood. Single verification path.                            |
| Backward compat with `@eweser/shared` types    | Bare usernames treated as local. Existing data migrated with `user@{this-server}` suffix.       |
| Performance of federated search                | Fan-out with hard 2s timeout. Cache results. Start with small peer lists.                       |
| Server impersonation                           | Public keys fetched from `/.well-known/eweser-server` over HTTPS. TLS provides server identity. |

## What This Is NOT

- **Not ActivityPub**: We borrow patterns (WebFinger, federated identity) but don't implement the full protocol. ActivityPub is for social media activities, not CRDT sync.
- **Not blockchain**: No consensus needed. Yjs CRDTs are the consensus mechanism.
- **Not pure peer-to-peer**: Servers are the sync backbone. P2P (WebRTC) can be added later for bonus resilience, but servers provide persistence and availability.
- **Not a walled garden**: eweser.com is the default, not the requirement. Self-hosters are first-class citizens.

## Execution Summary

```text
Run 1: Server Identity & Keypair Infrastructure (Smart)
├── Run 2: Federated Identity & WebFinger (Smart) [after Run 1]
│   ├── Run 3: Federation API & Room Invite Flow (Smart) [after Run 2]
│   │   └── Run 4: Hocuspocus Server Relay Extension (Smart) [after Run 3]
│   │       ├── Run 5: Share Links & Direct Access Fallback (Fast) [after Run 4]
│   │       └── Run 6: Sharing UX & Permissions UI (Fast) [parallel with Run 5]
│   └── Run 7: Local Aggregator / Search Index (Smart) [parallel with Run 3-6]
│       └── Run 8: Federated Search (Smart) [after Run 7 + Run 1]
```

Runs 5 & 6 can be parallelized. Run 7 can be developed in parallel with Runs 3-6 since it only depends on Hocuspocus hooks (not federation). Run 8 needs both the search index (Run 7) and peer infrastructure (Run 1).

## Status

- [ ] Approved by user
