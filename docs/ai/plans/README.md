# AI Plans

Active, in-progress, and historical plans for EweserDB AI features. These are implementation handoffs and historical notes, not the system-of-record for current architecture.

## Status Categories

- **Current** - Active work or planned but not yet started.
- **Completed** - Fully implemented; see the corresponding ADR in `../adr/`.
- **Historical** - Useful as context, but no longer current guidance.

## Current Plans

### In Progress

| Plan                                                                           | Phase                            | Last Updated |
| ------------------------------------------------------------------------------ | -------------------------------- | ------------ |
| [2026-04-05-dogfood-personal-brain.md](./2026-04-05-dogfood-personal-brain.md) | Run 1 complete, runs 2-3 pending | 2026-04-05   |
| [2026-04-06-tiptap-migration.md](./2026-04-06-tiptap-migration.md)             | Runs 1-3 in progress             | 2026-04-06   |
| [2026-04-08-one-click-deploy.md](./2026-04-08-one-click-deploy.md)             | Runs 1-3 pending                 | 2026-04-08   |

### Draft / Not Started

| Plan                                                                               | Priority | Notes                                   |
| ---------------------------------------------------------------------------------- | -------- | --------------------------------------- |
| [2026-04-03-ai-first-launch-strategy.md](./2026-04-03-ai-first-launch-strategy.md) | P1       | Awaiting approval                       |
| [2026-04-03-file-storage.md](./2026-04-03-file-storage.md)                         | P2       | Depends on AI-first launch              |
| [2026-04-04-mcp-server.md](./2026-04-04-mcp-server.md)                             | P1       | MCP server MVP done; full scope pending |
| [2026-04-04-obsidian-vault-sync.md](./2026-04-04-obsidian-vault-sync.md)           | P1       | Awaiting TipTap migration               |
| [2026-04-05-auto-knowledge-graph.md](./2026-04-05-auto-knowledge-graph.md)         | P2       | After doc split complete                |
| [2026-04-08-chatgpt-web-mcp.md](./2026-04-08-chatgpt-web-mcp.md)                   | P2       | Depends on MCP server full scope        |
| [2026-04-08-share-folder-ux.md](./2026-04-08-share-folder-ux.md)                   | P1       | Awaiting approval                       |

## Completed Plans -> ADRs

These plans are fully implemented. See `../adr/` for the permanent records.

| Plan                                                                                         | ADR                                                  | Completed  |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------- |
| [2026-04-04-cross-agent-memory-search.md](./2026-04-04-cross-agent-memory-search.md)         | [ADR-0001](../adr/0001-cross-agent-memory-search.md) | Yes        |
| [2026-04-06-memory-mcp-wrap-up.md](./2026-04-06-memory-mcp-wrap-up.md)                       | [ADR-0002](../adr/0002-memory-mcp-wrap-up.md)        | Yes        |
| [2026-04-04-conversations-collection.md](./2026-04-04-conversations-collection.md)           | [ADR-0003](../adr/0003-conversations-collection.md)  | Yes        |
| [2026-04-03-privacy-and-autonomy.md](./2026-04-03-privacy-and-autonomy.md)                   | [ADR-0004](../adr/0004-privacy-and-autonomy.md)      | Yes        |
| [2026-04-03-remove-legacy-code.md](./2026-04-03-remove-legacy-code.md)                       | [ADR-0005](../adr/0005-remove-legacy-code.md)        | Yes        |
| [2026-04-02-quality-gates-hardening.md](./2026-04-02-quality-gates-hardening.md)             | [ADR-0006](../adr/0006-quality-gates-hardening.md)   | Yes        |
| [2026-04-02-quality-gates-run-3-handoff.md](./2026-04-02-quality-gates-run-3-handoff.md)     | [ADR-0006](../adr/0006-quality-gates-hardening.md)   | Yes        |
| [2026-04-03-testing-plan-examples-db-auth.md](./2026-04-03-testing-plan-examples-db-auth.md) | [ADR-0008](../adr/0008-testing-examples-db-auth.md)  | Yes        |
| [2026-04-07-topology-comparison.md](./2026-04-07-topology-comparison.md)                     | [ADR-0007](../adr/0007-rooms-topology-refactor.md)   | Yes        |
| [2026-04-07-rooms-topology-and-doc-split.md](./2026-04-07-rooms-topology-and-doc-split.md)   | [ADR-0007](../adr/0007-rooms-topology-refactor.md)   | Yes        |
| [2026-04-06-rooms-architecture-refactor.md](./2026-04-06-rooms-architecture-refactor.md)     | [ADR-0007](../adr/0007-rooms-topology-refactor.md)   | Superseded |

## Historical

| Plan                                                                                                   | Notes                                                             |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [2026-04-02-big-refactor.md](./2026-04-02-big-refactor.md)                                             | Historical migration plan; the auth migration portion is complete |
| [2025-04-02-federation-and-aggregator-strategy.md](./2025-04-02-federation-and-aggregator-strategy.md) | Pre-migration; superseded                                         |
