# ADR-0002: Memory MCP — Lock Product Boundary

**Status:** Accepted & Implemented  
**Date:** 2026-04-06

## Context

The MCP memory/search infrastructure was built (PR 15). Need to formally close the effort and define what's intentionally deferred.

## Decision

1. **Lock the product boundary** at structured cross-agent memory recall (manual save + search)
2. **Explicit non-goals:** universal automatic context sync, embeddings/vector search, cross-platform baton passing
3. **Keep existing tools:** `eweser_save_memory` and `eweser_search`
4. **Preserve OpenClaw PA auto-save** as the only automated session-end path
5. **Define helper conventions** (not new infrastructure): `remember`, `decision`, `bookmark`, `next`, `scratch` as prompt-layer aliases

## Deferred Work

Automatic cross-agent context sync is off the table until:

- Upstream session hooks (Claude Desktop / Copilot provide session-end callbacks)
- Reliable cross-client triggers
- UX for zero-token-bloat capture

## Consequences

- Memory MCP effort is "done for now"
- Next product-facing work: Ewe Note UX for browsing stored memories
- Helper commands are conventions only, not implemented MCP tools

## Related

- [ADR-0001](./0001-cross-agent-memory-search.md)
