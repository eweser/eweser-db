# ADR-0003: Conversations Collection Schema

**Status:** Accepted & Implemented  
**Date:** 2026-04-04

## Context

Need a typed collection for AI agent session summaries and memory notes, readable by any authorized agent.

## Decision

Added `conversations` to `COLLECTION_KEYS` and defined `ConversationDoc` interface in `@eweser/shared`:

```typescript
interface ConversationDoc extends DocumentBase {
  title: string;
  summary: string; // ≤ ~500 tokens, required
  agentId: string; // 'copilot' | 'claude' | 'openclaw-pa' | custom
  memoryType: 'session' | 'memory' | 'decision' | 'bookmark';
  date: string; // ISO date
  tags: string[];
  turns?: ConversationTurn[]; // optional, capped at 100
  relatedDocIds?: string[];
}
```

## Key Conventions

| memoryType | When to use                      |
| ---------- | -------------------------------- |
| `session`  | End-of-session summary           |
| `memory`   | Specific fact to recall later    |
| `decision` | Architectural/strategic decision |
| `bookmark` | URL or resource reference        |

## Turns Cap Policy

- Default: last 20 turns stored
- Max: 100 (truncated with marker)
- `fullTranscript: true` only for explicit opt-in

## Consequences

- `eweser_save_memory` MCP tool wraps this with sensible defaults
- Agents write summaries manually (no auto-transcription)
- Summary + snippet sufficient for recall; full doc fetched on demand

## Related

- [ADR-0001](./0001-cross-agent-memory-search.md)
