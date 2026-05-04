# Architecture Decision Records (ADRs)

Short, permanent records of significant architectural decisions made during EweserDB development.

## Index

| ID                                              | Title                                         | Status      | Date       |
| ----------------------------------------------- | --------------------------------------------- | ----------- | ---------- |
| [ADR-0001](./0001-cross-agent-memory-search.md) | Cross-Agent Memory & Search                   | Accepted    | 2026-04-04 |
| [ADR-0002](./0002-memory-mcp-wrap-up.md)        | Memory MCP — Lock Product Boundary            | Accepted    | 2026-04-06 |
| [ADR-0003](./0003-conversations-collection.md)  | Conversations Collection Schema               | Accepted    | 2026-04-04 |
| [ADR-0004](./0004-privacy-and-autonomy.md)      | Privacy & Autonomy Guarantees                 | Accepted    | 2026-04-03 |
| [ADR-0005](./0005-remove-legacy-code.md)        | Remove Legacy Code (Next.js/Supabase/Y-Sweet) | Accepted    | 2026-04-03 |
| [ADR-0006](./0006-quality-gates-hardening.md)   | Quality Gates — Lint/Format/Type-Check        | Implemented | 2026-04-02 |
| [ADR-0007](./0007-rooms-topology-refactor.md)   | Rooms Topology + Doc-Split Combined           | Accepted    | 2026-04-07 |
| [ADR-0008](./0008-testing-examples-db-auth.md)  | Testing Strategy — Examples + DB + Auth       | Implemented | 2026-04-03 |
| [ADR-0009](./0009-base-vault-room-grouping.md)  | Base/Vault Room Grouping                      | Accepted    | 2026-05-04 |

## Format

ADRs are brief (< 100 lines) and contain:

- **Status**: Accepted, Implemented, Deprecated, Superseded
- **Date**: When the decision was made
- **Context**: What problem prompted the decision
- **Decision**: What was decided
- **Key points**: The most important aspects
- **Consequences**: What changed as a result
- **Related**: Links to source plans and other ADRs

## Relationship to Plans

ADRs are created from **completed plans** in `../plans/`. When a plan is finished, its key decisions are extracted into an ADR to make them permanently referenceable.

## Current Plans

See [](../plans/README.md) for active, in-progress, and draft plans.
