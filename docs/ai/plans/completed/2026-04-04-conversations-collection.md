# Plan: Conversations Collection — AI Session Memory

> **Created:** 2026-04-04
> **Status:** Draft — awaiting approval
> **Prerequisites:** MCP server MVP (complete), `@eweser/shared` collections pattern established

## Goal

Add a `conversations` collection to `@eweser/shared` so any MCP-connected AI agent can persist session summaries, memory notes, and optionally capped turn-by-turn transcripts — readable by any other authorized agent.

## Scope

- **In:**
  - `ConversationDoc` interface in `@eweser/shared`
  - `conversations` added to `COLLECTION_KEYS`
  - `eweser_save_memory` MCP tool — convenience wrapper for writing memory notes fast (avoids verbose `eweser_create_document` call)
  - Changeset for `@eweser/shared` (minor version bump — new collection + new export)
  - Unit tests for the schema and any helper logic

- **Out:**
  - Embedding / vector search (no RAG layer planned)
  - UI for browsing conversations (Ewe Note milestone)
  - Session-end hooks for Claude Desktop or Copilot (blocked on upstream providers)
  - Auto-transcription (opt-in only, described but not wired)

## Collection Schema

```ts
// packages/shared/src/collections/conversation.ts

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO
}

export interface ConversationDoc extends DocumentBase {
  title: string;
  summary: string; // agent-written ≤ ~500 tokens. Required.
  agentId: string; // 'copilot' | 'claude' | 'openclaw-pa' | custom string
  memoryType: 'session' | 'memory' | 'decision' | 'bookmark';
  date: string; // ISO date of session/note
  tags: string[];
  turns?: ConversationTurn[]; // optional, capped — see maxTurns note below
  relatedDocIds?: string[]; // refs to other EweserDB documents mentioned
}
```

### `memoryType` semantics

| Type       | When to use                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| `session`  | End-of-session summary: what was discussed, what was decided, what's next        |
| `memory`   | A specific fact the agent wants to recall later: "User prefers tabs over spaces" |
| `decision` | Architectural / strategic decision with rationale                                |
| `bookmark` | A URL, resource, or reference worth keeping                                      |

### `turns` cap policy (enforced in MCP tool, not schema)

- Default: last 20 turns stored. Never full transcript unless user explicitly passes `fullTranscript: true`
- Tool validates: if `turns.length > 100`, truncate to last 100 with a `[N turns truncated]` prefix marker
- Reading: `eweser_read_document` returns `summary` + `turns` as-is (already capped). No special logic needed.

## MCP Tool: `eweser_save_memory`

A convenience tool that wraps `eweser_create_document` with sensible defaults for memory writes. Reduces friction for agents saving a quick note.

```ts
// Tool input schema
{
  roomId: string;            // which conversations room to write to
  title: string;
  summary: string;
  memoryType: ConversationDoc['memoryType'];
  agentId: string;           // injected from agent config if not provided
  tags?: string[];
  turns?: ConversationTurn[];
  relatedDocIds?: string[];
}
```

**Why a dedicated tool?** `eweser_create_document` requires knowing the full document structure + `_ref` format. Agents frequently write memory notes mid-session and the extra scaffolding adds friction + token overhead. `eweser_save_memory` hides that.

## How Agents Use This in Practice

### End-of-session summary (OpenClaw PA, session-end hook)

```
// Agent calls at end of every PA session automatically
eweser_save_memory({
  roomId: "conversations-pa",
  title: "PA session: deploy BD bot changes",
  summary: "Discussed deploying BD bot changes. Decision: deploy at 2am cron. Next: verify Smartlead API key rotation.",
  memoryType: "session",
  tags: ["bd-bot", "deployment"],
  agentId: "openclaw-pa"
})
```

### Quick mid-session memory (any agent, on user request)

```
User: "remember that we decided to use Hono not Express"
Agent → eweser_save_memory({
  title: "Decision: Hono over Express for auth server",
  summary: "Decided to use Hono (not Express) for auth-server-hono. Reason: smaller bundle, native fetch API, Cloudflare Workers compatible.",
  memoryType: "decision",
  tags: ["auth-server", "architecture"]
})
```

### Cross-agent recall (any agent, later)

```
User: "what did I decide about the auth server?"
Agent → eweser_search("auth server decision")
→ returns ConversationDoc with memoryType: "decision", summary visible
→ Agent answers from search result — zero extra tokens beyond results returned
```

## Runs

### Run 1: Schema + Collection Key

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Straightforward pattern — mirrors existing collection file structure exactly. Just new types + adding to the COLLECTION_KEYS array.

- [x] Create `packages/shared/src/collections/conversation.ts` with `ConversationTurn` and `ConversationDoc` interfaces
- [x] Add `conversations` to `COLLECTION_KEYS` array in `packages/shared/src/collections/index.ts`
- [x] Add `ConversationDoc` to `EweDocument` union type in `index.ts`
- [x] Export from `packages/shared/src/collections/index.ts`
- [x] Export from `packages/shared/src/index.ts`
- [x] Add unit test: type validation for `ConversationDoc` (follows pattern in existing collection tests if any)
- [x] Create changeset: `@eweser/shared` minor bump

**Files:**

- Create: `packages/shared/src/collections/conversation.ts`
- Modify: `packages/shared/src/collections/index.ts`
- Modify: `packages/shared/src/index.ts`
- Create: changeset

---

### Run 2: `eweser_save_memory` MCP Tool

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Follows the exact pattern of existing MCP tools in `packages/mcp-server/`. Read existing tool implementations before writing.
- **Depends on:** Run 1 (needs `ConversationDoc` type)

- [x] Add `eweser_save_memory` tool definition to `packages/mcp-server/src/tools/`
  - Input validation: `title` required, `summary` required, `memoryType` enum check
  - Auto-inject `agentId` from the agent config loaded at startup if caller doesn't pass it
  - Auto-set `date` to today ISO string if not passed
  - Enforce `turns` cap: truncate to last 100 with prefix marker
  - Calls `eweser_create_document` logic internally (don't duplicate CRUD — share the implementation)
- [x] Add permission check: requires `readwrite` on a `conversations` room
- [x] Write unit test: tool handler with mocked Y.Doc
- [x] Update `eweser_list_rooms` to include `conversations` as a recognized `collectionKey`

**Files:**

- Create: `packages/mcp-server/src/tools/save-memory.ts`
- Modify: `packages/mcp-server/src/tools/index.ts` (register tool)

---

## Risks

| Risk                                | Mitigation                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Agents write huge summaries**     | `summary` field capped at 2000 chars in tool validation. Agents are instructed in tool description to keep summaries concise.  |
| **`turns` array grows unbounded**   | Enforced 100-turn cap in `eweser_save_memory`. Raw `eweser_create_document` bypasses this — accept as power user escape hatch. |
| **`EweDocument` union grows large** | Already has 5 members. Adding one more is fine. If it becomes unwieldy, refactor to a discriminated union — out of scope here. |
| **Changeset discipline**            | `@eweser/shared` is published. Must create changeset before merge. Flag in PR checklist.                                       |

## Execution Summary

```text
Run 1: Schema + Collection Key (Fast)  ← no deps
└── Run 2: eweser_save_memory MCP Tool (Fast)  ← depends on Run 1
```

## Status

- [x] Approved by user
- [x] Completed (all runs implemented, all tests pass)
- [x] Run 1 complete
- [x] Run 2 complete
