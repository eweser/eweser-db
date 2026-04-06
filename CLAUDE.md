# EweserDB — Claude Context

This file provides context for Claude Desktop and Claude Code when working in this repository.

## Project Overview

EweserDB is a local-first, user-owned database SDK built on Yjs CRDTs. See [ARCHITECTURE.md](ARCHITECTURE.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md) for the full picture.

## Session Memory (Manual Workflow)

Claude Desktop and Claude Code do **not** have automatic session-end hooks (as of April 2026).

**Convention:** At the end of every session, say "save session" (or equivalent) and call `eweser_save_memory` with a summary of what was accomplished.

```
# Example prompt at end of session:
"Save session: we decided to use Hono for the auth server migration and completed run 1 of the aggregator search plan."
```

This will call:

```json
{
  "tool": "eweser_save_memory",
  "args": {
    "roomId": "ec8a7adb-45ca-4480-8de9-b4d74173f73f",
    "title": "Session: auth server migration decision",
    "summary": "We decided to use Hono for the auth server migration and completed run 1 of the aggregator search plan.",
    "memoryType": "session",
    "agentId": "claude",
    "tags": ["auth-server", "migration"]
  }
}
```

### Recalling Past Sessions

Use `eweser_search` to recall decisions and session notes:

```json
{
  "tool": "eweser_search",
  "args": {
    "query": "auth server framework decision",
    "filters": { "memoryType": ["decision", "memory"] }
  }
}
```

## Key Conventions

- TypeScript throughout — no `any`
- Monorepo with npm workspaces — changes to `packages/shared` affect all consumers
- Yjs CRDT operations — never direct mutation
- Changesets required for published package changes (`npm run changeset`)

## Common Commands

```bash
npm install           # Install workspace deps
npm run build         # Build all packages
npm test              # Run all tests
```
