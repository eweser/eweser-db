# Plan: MCP Server — "Own Your AI Brain" Core Product

> **Created:** 2026-04-04
> **Status:** Draft — awaiting approval
> **Prerequisites:** Agent auth system (complete), sync server (complete), auth-server-hono (complete)

## Goal

Build `packages/mcp-server/` — a stdio MCP server that lets AI agents (Claude Code, Copilot, OpenClaw PA) read and write the user's EweserDB data through the Model Context Protocol.

## Scope

- **In:**
  - New `packages/mcp-server/` package with full MCP tool definitions
  - New auth-server endpoints for agent-authenticated room listing and sync token generation
  - Permission enforcement (allowedCollections, allowedRooms, read vs readwrite)
  - Access audit logging on every tool call
  - README with Claude Desktop + Copilot configuration examples
  - Unit tests for all logic layers

- **Out:**
  - Browser extension (separate Tier 3 project)
  - New collection schemas (conversations, bookmarks — will be a follow-up)
  - Streamable HTTP transport (future: remote MCP access)
  - UI for managing agent configs (existing auth-server API is sufficient for now)
  - Publishing to npm (follow-up after manual testing)

## Architecture

### How It Works

```
┌─────────────────┐     stdio      ┌──────────────────┐
│  Claude Desktop  │◄──────────────►│  @eweser/mcp     │
│  / Copilot       │   JSON-RPC     │  (Node.js)       │
│  / OpenClaw      │                │                  │
└─────────────────┘                │  ┌────────────┐  │
                                   │  │ DataLayer   │  │
                                   │  │ Yjs + HP    │  │
                                   │  └──────┬─────┘  │
                                   └─────────┼────────┘
                                             │ WebSocket
                                    ┌────────▼────────┐
                                    │  Hocuspocus      │
                                    │  Sync Server     │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Auth Server     │
                                    │  (Hono)          │
                                    └─────────────────┘
```

### Key Design Decisions

1. **Transport: stdio** — Standard for local MCP servers. Client spawns the server as a subprocess and communicates via stdin/stdout JSON-RPC. This is what Claude Desktop, Copilot, and most MCP hosts use.

2. **Auth: Agent bearer token from env var** — MCP server reads `EWESER_AGENT_TOKEN` on startup, calls `POST /api/agents/verify-token` to get permissions. No login flow, no browser, no OAuth.

3. **Data access: @hocuspocus/provider + Yjs directly** — NOT using the full `@eweser/db` SDK. The SDK assumes a browser context with user login (better-auth sessions). The MCP server uses `@hocuspocus/provider` directly to connect to Hocuspocus rooms, managing Yjs Y.Docs in memory. Shares type definitions from `@eweser/shared`.

   _Why not the full SDK?_ The SDK's `login()` calls `syncRegistry()` which requires a user JWT from better-auth. Agents authenticate differently (bearer tokens). Fighting the SDK's assumptions adds complexity for no benefit. The MCP server only needs: Y.Doc ↔ Y.Map ↔ documents, plus a WebSocket connection. That's `yjs` + `@hocuspocus/provider`.

4. **New auth-server endpoints for agents** — Two new endpoints authenticated by agent bearer token (not user JWT):
   - `POST /api/agents/me/rooms` — Returns rooms this agent can access
   - `POST /api/agents/me/sync-token` — Returns a Hocuspocus sync JWT for a specific room

5. **Permission enforcement** — Every tool call checks `allowedCollections`, `allowedRooms`, and `permissions` before executing. Write tools reject if `permissions !== 'readwrite'`.

### MCP Tools

| Tool                     | Description                                                             | Permission |
| ------------------------ | ----------------------------------------------------------------------- | ---------- |
| `eweser_list_rooms`      | List rooms the agent can access, optionally filtered by collection type | read       |
| `eweser_list_documents`  | List documents in a room (returns IDs + summaries)                      | read       |
| `eweser_read_document`   | Read a full document by room + document ID                              | read       |
| `eweser_search`          | Full-text search across documents in allowed rooms                      | read       |
| `eweser_create_document` | Create a new document in a room                                         | readwrite  |
| `eweser_update_document` | Update fields on an existing document                                   | readwrite  |
| `eweser_delete_document` | Soft-delete a document (\_deleted = true)                               | readwrite  |

### Token Flow

```
Startup:
  1. Read EWESER_AGENT_TOKEN + EWESER_AUTH_URL from env
  2. POST /api/agents/verify-token { token } → { agent: AgentConfig }
  3. POST /api/agents/me/rooms { token } → { rooms: Room[] }
  4. For each room: POST /api/agents/me/sync-token { token, roomId }
     → { syncUrl, syncToken, tokenExpiry }
  5. Connect HocuspocusProvider to each room
  6. Wait for initial sync, then register MCP tools

Runtime:
  - Sync tokens auto-refresh before expiry (30-min buffer)
  - Agent token verified periodically (hourly) to detect revocation
  - Access logged after each tool call via POST /api/agents/me/log
```

## Runs

### Run 1: Auth Server — Agent Data Endpoints

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Server-side auth logic, database queries, permission filtering — needs careful security thinking. The existing agent routes and model functions serve as clear patterns to follow.

#### Steps:

- [ ] Create `agentAuthMiddleware` in `packages/auth-server-hono/src/middleware/agent-auth.ts`
  - Reads `Authorization: Bearer <token>` header
  - Hashes token, looks up in `agent_configs` table
  - Validates: `isActive`, not expired, exists
  - Sets `c.set('agent', safeAgent)` for downstream handlers
  - Reuses `hashToken` and `getAgentConfigByTokenHash` from existing model
- [ ] Add `POST /api/agents/me/rooms` to `agents.ts`
  - Protected by `agentAuthMiddleware`
  - Gets agent's `userId` from the agent config
  - Fetches user's rooms via existing `getRoomsByIds` / access grant lookup
  - Filters by `agent.allowedCollections` (room.collectionKey must be in list)
  - Filters by `agent.allowedRooms` (if non-empty, room.id must be in list)
  - Returns `{ rooms: Room[] }` (id, name, collectionKey — no sensitive fields)
- [ ] Add `POST /api/agents/me/sync-token` to `agents.ts`
  - Protected by `agentAuthMiddleware`
  - Body: `{ roomId: string }`
  - Validates room belongs to user AND agent is allowed access
  - Calls existing `generateSyncToken(roomId, collectionKey)` to create Hocuspocus JWT
  - Returns `{ syncUrl, syncToken, tokenExpiry }` using existing `getRefreshedSyncToken()`
- [ ] Add `POST /api/agents/me/log` to `agents.ts`
  - Protected by `agentAuthMiddleware`
  - Body: `{ roomId, collectionKey, action, documentCount }`
  - Calls existing `logAgentAccess()` model function
  - Returns `{ ok: true }`
- [ ] Tests for all 3 new endpoints + middleware

#### Files:

- Create: `packages/auth-server-hono/src/middleware/agent-auth.ts`
- Modify: `packages/auth-server-hono/src/routes/agents.ts`
- Modify: `packages/auth-server-hono/src/routes/agents.test.ts`

---

### Run 2: MCP Server Package Scaffold

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Package setup, build config, entry point — needs correct TypeScript/ESM configuration in the monorepo context. Must work as a standalone CLI binary.

#### Steps:

- [ ] Create `packages/mcp-server/package.json`
  - `name: "@eweser/mcp"`
  - `type: "module"`
  - `bin: { "eweser-mcp": "./dist/index.js" }`
  - Dependencies: `@modelcontextprotocol/sdk`, `zod`, `@hocuspocus/provider`, `yjs`, `@eweser/shared`
  - Dev: `vitest`, `typescript`, `tsx`
- [ ] Create `packages/mcp-server/tsconfig.json`
  - Extends root tsconfig
  - `outDir: "./dist"`, target ESNext, module NodeNext
- [ ] Create `packages/mcp-server/src/index.ts`
  - Entry point: creates McpServer, StdioServerTransport
  - Reads env vars, calls auth startup flow
  - Registers tools, connects transport
  - Graceful shutdown on SIGINT/SIGTERM
- [ ] Create `packages/mcp-server/src/env.ts`
  - Loads and validates: `EWESER_AGENT_TOKEN`, `EWESER_AUTH_URL`, `EWESER_SYNC_URL` (optional override)
- [ ] Create `packages/mcp-server/src/auth.ts`
  - `verifyAgentToken(token, authUrl)` → calls `/api/agents/verify-token`
  - `fetchAgentRooms(token, authUrl)` → calls `/api/agents/me/rooms`
  - `fetchSyncToken(token, authUrl, roomId)` → calls `/api/agents/me/sync-token`
  - `logAccess(token, authUrl, entry)` → calls `/api/agents/me/log`
  - All return typed results, throw on auth failure
- [ ] `npm install` from root to link workspace deps

#### Files:

- Create: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/tsconfig.json`
- Create: `packages/mcp-server/src/index.ts`
- Create: `packages/mcp-server/src/env.ts`
- Create: `packages/mcp-server/src/auth.ts`

---

### Run 3: Data Layer — Yjs + Hocuspocus Client

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Yjs CRDT operations, WebSocket lifecycle, token refresh — requires understanding of Yjs Y.Map patterns and Hocuspocus provider API.

#### Steps:

- [ ] Create `packages/mcp-server/src/data-layer.ts` — the core class
  - `DataLayer` class manages:
    - Map of `roomId → { ydoc: Y.Doc, provider: HocuspocusProvider, meta: RoomMeta }`
    - Agent permissions from startup
    - Token refresh timers
  - Methods:
    - `async init(rooms, agentConfig, tokenFetcher)` — connect to all rooms
    - `async connectRoom(room)` — create Y.Doc + HocuspocusProvider, wait for sync
    - `disconnectRoom(roomId)` — clean shutdown of provider
    - `listRooms(collectionKey?)` — return connected rooms, optionally filtered
    - `getDocuments(roomId)` — read all docs from Y.Map('documents')
    - `getDocument(roomId, docId)` — read single doc
    - `searchDocuments(query, collectionKey?)` — text search across rooms
    - `createDocument(roomId, data)` — create with \_id, \_ref, \_created, \_updated
    - `updateDocument(roomId, docId, updates)` — merge updates, set \_updated
    - `deleteDocument(roomId, docId)` — set `_deleted: true`, `_updated: now`
  - Permission checking:
    - `assertReadAccess(roomId)` — throws if room not in allowed list
    - `assertWriteAccess(roomId)` — throws if permissions !== 'readwrite'
  - Token refresh:
    - Each room's sync token refreshes 5 min before expiry
    - Uses `fetchSyncToken()` from auth module
- [ ] Create `packages/mcp-server/src/data-layer.test.ts`
  - Mock HocuspocusProvider (test Yjs operations in isolation)
  - Test permission checking
  - Test document CRUD on Y.Map
  - Test search across multiple rooms

#### Files:

- Create: `packages/mcp-server/src/data-layer.ts`
- Create: `packages/mcp-server/src/data-layer.test.ts`

---

### Run 4: MCP Tool Implementations

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Straightforward wiring of DataLayer methods to MCP tool definitions. Follows a repetitive pattern with Zod schemas.

#### Steps:

- [ ] Create `packages/mcp-server/src/tools.ts`
  - `registerTools(server: McpServer, dataLayer: DataLayer, logAccess: fn)`
  - Each tool:
    1. Validates input via Zod schema (handled by MCP SDK)
    2. Calls DataLayer method
    3. Logs access via auth module
    4. Returns JSON content
  - Tool definitions:

  **`eweser_list_rooms`**

  ```
  Input: { collectionKey?: string }
  Output: Array of { id, name, collectionKey }
  Annotations: readOnlyHint: true
  ```

  **`eweser_list_documents`**

  ```
  Input: { roomId: string, limit?: number }
  Output: Array of document summaries (id, first 200 chars of text, _created, _updated)
  Annotations: readOnlyHint: true
  ```

  **`eweser_read_document`**

  ```
  Input: { roomId: string, documentId: string }
  Output: Full document object
  Annotations: readOnlyHint: true
  ```

  **`eweser_search`**

  ```
  Input: { query: string, collectionKey?: string, limit?: number }
  Output: Array of matching documents with room context
  Annotations: readOnlyHint: true
  ```

  **`eweser_create_document`**

  ```
  Input: { roomId: string, data: object }
  Output: { id, created: true }
  Annotations: destructiveHint: false
  ```

  **`eweser_update_document`**

  ```
  Input: { roomId: string, documentId: string, updates: object }
  Output: Updated document
  Annotations: destructiveHint: false, idempotentHint: true
  ```

  **`eweser_delete_document`**

  ```
  Input: { roomId: string, documentId: string }
  Output: { deleted: true }
  Annotations: destructiveHint: true
  ```

- [ ] Wire tools in `src/index.ts` — import and call `registerTools()` after DataLayer init

#### Files:

- Create: `packages/mcp-server/src/tools.ts`
- Modify: `packages/mcp-server/src/index.ts`

---

### Run 5: Testing & Integration

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Integration tests require mocking multiple layers (auth, WebSocket, Yjs) and validating the full tool-call → data-access → audit-log pipeline.

#### Steps:

- [ ] Create `packages/mcp-server/src/auth.test.ts`
  - Mock fetch calls to auth server
  - Test verify-token, fetch-rooms, fetch-sync-token, log-access
  - Test error handling (401, network failure, token expiry)
- [ ] Create `packages/mcp-server/src/tools.test.ts`
  - Mock DataLayer, test each tool's input validation and response shape
  - Test permission enforcement (read-only agent can't write)
  - Test audit logging is called after each tool
- [ ] Create `packages/mcp-server/vitest.config.ts`
- [ ] Add `"test": "vitest run"` to package.json scripts
- [ ] Add build script: `"build": "tsc"` or use `tsx` for dev
- [ ] Verify `npm run build` from root still works

#### Files:

- Create: `packages/mcp-server/src/auth.test.ts`
- Create: `packages/mcp-server/src/tools.test.ts`
- Create: `packages/mcp-server/vitest.config.ts`
- Modify: `packages/mcp-server/package.json`

---

### Run 6: Documentation & Config

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Template-driven docs, config examples — no complex logic.

#### Steps:

- [ ] Create `packages/mcp-server/README.md`
  - What it is, prerequisites (auth server running, agent token created)
  - Installation: `npm install -g @eweser/mcp` or local
  - Configuration examples:
    - Claude Desktop (`claude_desktop_config.json`)
    - VS Code Copilot (`.vscode/settings.json` or `mcp.json`)
    - OpenClaw (env vars)
  - Available tools table
  - Troubleshooting (common errors, token issues, connectivity)
- [ ] Create `packages/mcp-server/example.env`
  - `EWESER_AGENT_TOKEN=`, `EWESER_AUTH_URL=http://localhost:3001`
- [ ] Update root `package.json` workspaces if needed
- [ ] Update `ARCHITECTURE.md` to reference MCP server
- [ ] If `@eweser/shared` types change → create changeset

#### Files:

- Create: `packages/mcp-server/README.md`
- Create: `packages/mcp-server/example.env`
- Modify: `ARCHITECTURE.md` (add MCP section)
- Maybe: `package.json` (workspace entry)

---

## Risks

| Risk                                                                                          | Mitigation                                                                                                                  |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Hocuspocus provider in Node.js** — The `@hocuspocus/provider` may assume browser WebSocket. | It uses `ws` under the hood in Node.js environments. Verify in Run 3; fallback: use `ws` directly with Hocuspocus protocol. |
| **Yjs memory with many rooms** — Each room loads a full Y.Doc into memory.                    | Lazy-load rooms on first access instead of all at startup. Add disconnect-after-idle timer.                                 |
| **Token refresh race conditions** — Sync token expires during a long operation.               | HocuspocusProvider supports token callback (not static token). Use the same pattern as the browser SDK.                     |
| **Agent token revocation latency** — User revokes token in UI but MCP server doesn't know.    | Periodic re-verify (every 60 min). On any 401 from sync server, re-verify immediately.                                      |
| **Large document search performance** — Full-text search across all Yjs docs is O(n).         | Start with simple substring match. Index in a follow-up (SQLite FTS or similar).                                            |
| **Changeset needed?** — If `@eweser/shared` gets new types (e.g., `bookmarks`).               | Deferred. This plan only uses existing collection types.                                                                    |

## Execution Summary

```text
Run 1: Auth Server Agent Endpoints (Smart)
├── Run 2: MCP Package Scaffold (Smart) [Parallel with Run 1]
│   └── Run 3: Data Layer - Yjs + Hocuspocus (Smart) [Depends on Run 2]
│       └── Run 4: MCP Tool Implementations (Fast) [Depends on Run 3]
└── Run 5: Testing & Integration (Smart) [Depends on Runs 1 + 4]
    └── Run 6: Documentation & Config (Fast) [Depends on Run 5]
```

**Parallelization:** Runs 1 and 2 are independent and can execute concurrently. Run 3 depends on Run 2 (package exists). Run 4 depends on Run 3 (DataLayer exists). Run 5 depends on both Run 1 (auth endpoints to test against) and Run 4 (tools to test). Run 6 is final.

## Status

- [ ] Approved by user
