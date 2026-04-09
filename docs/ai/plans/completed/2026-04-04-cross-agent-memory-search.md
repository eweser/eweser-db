# Plan: Cross-Agent Memory & Search

> **Created:** 2026-04-04
> **Status:** Complete
> **Prerequisites:**
>
> - MCP server MVP (complete)
> - Conversations collection (see [2026-04-04-conversations-collection.md](./2026-04-04-conversations-collection.md))
> - Aggregator service (complete — supplies PostgreSQL full-text search API)

## Goal

Make `eweser_search` a genuinely useful cross-agent memory recall tool: fast PostgreSQL full-text search across all allowed rooms (all collection types, not just `conversations`), with result ranking that surfaces summaries and memory notes ahead of raw content.

## The Core Use Case

```
# Claude Code finishes a session, writes a memory note via eweser_save_memory
# (title: "Decision: Hono over Express", memoryType: "decision", tags: ["auth-server"])

# Next day, Copilot agent is helping with auth server work
User: "remind me what we decided about the framework"
Agent → eweser_search({ query: "auth server framework decision" })
→ returns: ConversationDoc { title: "Decision: Hono over Express", summary: "..." }
→ Agent answers directly from search result
# Zero extra tokens beyond what was returned. No re-reading transcripts.
```

This is cross-agent, cross-session recall with no embedding layer and no token overhead. It works because EweserDB is the shared data layer all agents connect to.

## Scope

- **In:**
  - Aggregator search endpoint that accepts agent bearer tokens (not just user JWT)
  - `eweser_search` MCP tool implementation wired to aggregator API
  - Result ranking: `conversations.summary` + `conversations.tags` weighted higher; `memoryType: 'memory' | 'decision'` boosted
  - Result shape: returns `{ id, _ref, title, summary, collectionKey, roomId, snippet, score }` — never full document content in search results
  - Filter parameters: `collectionKey[]`, `memoryType[]`, `agentId`, `tags[]`, `dateRange`
  - Unit tests for search tool

- **Out:**
  - Embedding / semantic / vector search — not planned
  - Cross-user search (each agent only sees rooms it's authorized for)
  - Search UI (Ewe Note milestone)
  - Search result pagination beyond first page (first-page results are sufficient for agent recall)

## Architecture

### Search Flow

```
Agent → eweser_search({ query, filters? })
  → MCP server validates permissions (allowed rooms only)
  → POST /api/search { query, roomIds: [...agentAllowedRooms], filters }
      (auth: agent bearer token)
  → Aggregator: PostgreSQL full-text search with ts_rank
      SELECT id, ref, title, summary, collection_key, room_id,
             ts_headline(content, query) AS snippet,
             ts_rank(search_vector, query) AS score
      FROM documents
      WHERE room_id = ANY($roomIds)
        AND search_vector @@ plainto_tsquery($query)
        AND deleted = false
      ORDER BY
        -- boost memory/decision docs
        CASE WHEN collection_key = 'conversations'
             AND memory_type IN ('memory','decision') THEN 1.5 ELSE 1.0 END
        * score DESC
      LIMIT 10
  → Returns: SearchResult[]
  → MCP tool formats results for LLM consumption
```

### Result Shape (returned to agent)

```ts
interface SearchResult {
  id: string;
  _ref: string; // e.g. "conversations.roomUUID.docId"
  title: string;
  summary?: string; // ConversationDoc.summary if present
  collectionKey: string;
  roomId: string;
  snippet: string; // ts_headline — keyword in context, ~150 chars
  score: number;
  memoryType?: string; // ConversationDoc.memoryType if present
  agentId?: string; // ConversationDoc.agentId if present
  date?: string;
  tags?: string[];
}
```

Full document content is **never** returned by search. The agent calls `eweser_read_document` to get full content if needed. In practice, for memory recall, the `summary` + `snippet` is usually enough for the agent to answer.

### Token Economy

| Step                                                    | Tokens consumed                       |
| ------------------------------------------------------- | ------------------------------------- |
| `eweser_search` call                                    | ~50 tokens (tool call overhead)       |
| Search results returned (10 results × ~100 tokens each) | ~1,000 tokens                         |
| If agent then reads one full doc                        | ~200–500 tokens depending on doc size |
| **Total for a recall query**                            | **~1,050–1,550 tokens**               |

Compare to: asking the user to repeat context = 0 additional tokens but requires user effort. This is the sweet spot.

## Runs

### Run 1: Aggregator Search Endpoint

- **Recommended Agent:** `02-coder` (Smart)
- **Reason:** New database query with ranking logic + new auth path (agent bearer token, not user JWT). Security-sensitive: must validate that the agent only searches rooms it's authorized for. Wrong room filtering = data leak.

- [ ] Add `POST /api/search` to aggregator service (`packages/aggregator/`)
  - Auth: accepts agent bearer token → verify via auth-server `/api/agents/verify-token` (same pattern as MCP startup)
  - Input: `{ query: string, roomIds: string[], filters?: SearchFilters }`
  - Server validates `roomIds` are ALL in the agent's allowed rooms — reject any not authorized. Never trust the client's room list directly; intersect with server-side agent config.
  - PostgreSQL full-text search using `plainto_tsquery` (handles most user queries safely without injection risk)
  - `search_vector` tsvector column — needs migration to add if not present
  - Ranking: boost `memoryType IN ('memory','decision')` docs by 1.5×
  - Return: `SearchResult[]` (max 10), ordered by score DESC
  - Truncate `snippet` at 200 chars server-side

```ts
interface SearchFilters {
  collectionKey?: string[]; // filter by collection
  memoryType?: string[]; // filter by ConversationDoc.memoryType
  agentId?: string; // filter by which agent wrote doc
  tags?: string[]; // filter by tags (ANY match)
  dateFrom?: string; // ISO date
  dateTo?: string;
}
```

- [ ] Add DB migration: `search_vector` tsvector column on `documents` table if not already indexed
- [ ] Add GIN index on `search_vector`
- [ ] Update document insert/update triggers to populate `search_vector` from: `title || ' ' || summary || ' ' || content || ' ' || tags`
- [ ] Unit tests: search endpoint with mock DB, permission filtering validation

**Files:**

- Modify: `packages/aggregator/src/routes/` — add search route
- Create: DB migration file
- Add: tests

---

### Run 2: `eweser_search` MCP Tool

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Straightforward tool implementation — follows existing MCP tool patterns. HTTP call to aggregator + result formatting.
- **Depends on:** Run 1 (aggregator endpoint must exist)

- [ ] Implement `eweser_search` tool in `packages/mcp-server/src/tools/search.ts`
  - Input: `{ query: string, filters?: SearchFilters }`
  - Permission check: agent must have `read` on at least one allowed room
  - Build `roomIds` list: intersection of agent's `allowedRooms` + (if `filters.collectionKey` provided) rooms of those collection types
  - If `EWESER_AGGREGATOR_URL` not set: fall back to in-memory Y.Doc scan (O(n) but works without aggregator)
  - Call `POST /api/search` on aggregator with agent bearer token
  - Format response for LLM: each result on its own line with emoji prefix for type identification:
    - 🧠 `memory` / `decision` docs
    - 📝 `session` docs / notes
    - 🔖 `bookmark` docs
    - 📚 other collections
  - Return formatted string + raw results array (so host can use structured data if supported)
- [ ] Unit tests: tool handler, permission check, fallback behavior

**Files:**

- Create: `packages/mcp-server/src/tools/search.ts`
- Modify: `packages/mcp-server/src/tools/index.ts` (register tool)
- Modify: `packages/mcp-server/src/index.ts` (pass `EWESER_AGGREGATOR_URL` from env)

---

### Run 3: OpenClaw PA Session-End Hook

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** OpenClaw-specific configuration to wire the `eweser_save_memory` tool call as an automatic session-end action. Purely config + a small PA skill file — no EweserDB code changes needed.
- **Note:** This run is OpenClaw-specific and can be deferred if OpenClaw is not in daily use. Claude Desktop and Copilot do NOT support session-end hooks as of April 2026.

- [ ] Create OpenClaw PA skill: `session-memory-save`
  - Skill triggers automatically when a PA session closes
  - Generates a `session` memoryType summary from conversation context
  - Calls `eweser_save_memory` with the summary
  - Configurable: `EWESER_AUTO_SAVE_SESSIONS=true` env var gates this behavior
- [ ] Document manual workflow for Claude Desktop / Copilot:
  - User instruction: "At the end of every session, I'll say 'save session' and you should call eweser_save_memory with a summary"
  - This goes in `CLAUDE.md` / `.github/copilot-instructions.md` as a standard instruction

**Files:**

- Create: OpenClaw PA skill file (path TBD based on OpenClaw skill directory structure)
- Modify: `CLAUDE.md` — add session save instruction
- Modify: `.github/copilot-instructions.md` — add session save instruction

---

## Risks

| Risk                                                                             | Mitigation                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Room ID injection** — agent passes roomIds not in its allowed list             | Server-side: always intersect client-supplied roomIds with server-side agent config. Never trust client.   |
| **Search too broad** — agent returns irrelevant results in small context windows | `LIMIT 10` server-side. Agent formatting shows score. Agent can filter by `collectionKey` or `memoryType`. |
| **Aggregator not running** — if self-hosted user skips aggregator                | MCP tool has in-memory Y.Doc fallback. Functionally correct, just slower for large datasets.               |
| **`search_vector` migration** — existing data has no tsvector                    | Backfill migration on deploy. One-time cost.                                                               |
| **`plainto_tsquery` injection** — malformed queries                              | `plainto_tsquery` handles arbitrary input safely — no injection risk vs `to_tsquery`.                      |
| **OpenClaw session hook unavailable**                                            | Run 3 is optional. Manual save instruction in `CLAUDE.md` covers Claude Desktop.                           |

## Execution Summary

```text
Run 1: Aggregator Search Endpoint (Smart)  ← no deps beyond aggregator existing
└── Run 2: eweser_search MCP Tool (Fast)   ← depends on Run 1 OR self-contained with fallback
Run 3: OpenClaw PA Session Hook (Fast)     ← independent, can run anytime after conversations collection
```

**Parallelization:** Runs 1 and 3 have no dependency on each other and can be executed concurrently. Run 2 should follow Run 1 to test the real aggregator path, though it can be started with the fallback implementation while Run 1 is in progress.

## Status

- [x] Run 1: Aggregator POST /api/agent-search endpoint — complete
- [x] Run 2: eweser_search MCP tool enhanced — complete
- [x] Run 3: OpenClaw PA skill + CLAUDE.md docs — complete
