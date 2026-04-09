# ADR-0001: Cross-Agent Memory & Search Architecture

**Status:** Accepted & Implemented  
**Date:** 2026-04-04  
**Supersedes:** —

## Context

AI agents (Claude Code, Copilot, OpenClaw PA) need to share context across sessions without re-reading full transcripts. EweserDB serves as the shared data layer.

## Decision

Built `eweser_search` as a PostgreSQL full-text search tool via the aggregator API, with result ranking that boosts `conversations.summary` and memory/decision docs 1.5×. Agents use `eweser_save_memory` (convenience wrapper around `eweser_create_document`) to write session summaries at end of session.

## Key Points

- Search returns `{ id, _ref, title, summary, collectionKey, roomId, snippet, score }` — never full document content
- Filter parameters: `collectionKey[]`, `memoryType[]`, `agentId`, `tags[]`, `dateRange`
- Agent bearer token auth (not user JWT) via aggregator API
- Zero embeddings/vector search — plain PostgreSQL full-text search is sufficient for recall use cases
- Manual save workflow (not automatic autosync) — upstream session hooks don't exist yet

## Consequences

- Agents must explicitly call `eweser_save_memory` to persist context (discipline required)
- Search quality depends on agents writing good summaries
- No cross-user search (agents only see rooms they're authorized for)

## Related

- [2026-04-04-conversations-collection.md](../plans/2026-04-04-conversations-collection.md)
- [2026-04-06-memory-mcp-wrap-up.md](../plans/2026-04-06-memory-mcp-wrap-up.md)
