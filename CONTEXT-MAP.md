# EweserDB Context Map

This file maps the DDD-style bounded contexts that agents should use when
stress-testing plans and naming changes. `CONTEXT.md` files are glossaries only:
they define shared language, not implementation plans, specs, or scratch notes.

## How To Use

- Read the root `CONTEXT.md` before substantial product, SDK, auth, sync, app,
  or agent-access work.
- Read the package context below when work touches that bounded context.
- When a term is resolved during planning, update the relevant `CONTEXT.md`
  immediately with the canonical wording.
- If a decision is hard to reverse and surprising without context, consider an
  ADR under `docs/ai/adr/`; do not use ADRs for ordinary implementation notes.

## Contexts

| Context                   | Glossary                                                                         | Use when                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Shared product language   | [`CONTEXT.md`](./CONTEXT.md)                                                     | Naming product concepts that span packages, docs, plans, and user-facing copy.                                 |
| SDK rooms and documents   | [`packages/db/CONTEXT.md`](./packages/db/CONTEXT.md)                             | Changing `@eweser/db`, room/document helpers, local persistence, sync client behavior, or public SDK APIs.     |
| Auth and grants           | [`packages/auth-server-hono/CONTEXT.md`](./packages/auth-server-hono/CONTEXT.md) | Changing sessions, OAuth, room access grants, sync tokens, agent tokens, or auth-server PostgreSQL boundaries. |
| Sync relay                | [`packages/sync-server/CONTEXT.md`](./packages/sync-server/CONTEXT.md)           | Changing Hocuspocus room sync, token authentication, persistence, or webhook forwarding.                       |
| Public aggregation        | [`packages/aggregator/CONTEXT.md`](./packages/aggregator/CONTEXT.md)             | Changing public indexing, webhook ingestion, search, or de-indexing behavior.                                  |
| Ewe Note bases and vaults | [`packages/ewe-note/CONTEXT.md`](./packages/ewe-note/CONTEXT.md)                 | Changing notes, bases, vault import/export, editor behavior, or Obsidian compatibility.                        |
| MCP and agent memory      | [`packages/mcp-server/CONTEXT.md`](./packages/mcp-server/CONTEXT.md)             | Changing MCP tools, agent room access, memory capture, project scopes, or tool output rules.                   |

## ADR Policy

`docs/ai/adr/README.md` is the current index for accepted EweserDB ADRs. Treat
individual ADRs with `Accepted` or `Implemented` status as current decision
records unless a newer ADR or active plan explicitly supersedes them.
