# session-memory-save

Automatic session-end memory save skill for OpenClaw PA agents.

## Description

When a PA session closes, this skill generates a summary of the session and saves it to EweserDB via `eweser_save_memory`. This creates a cross-agent, cross-session memory trail that any agent can recall later via `eweser_search`.

## Prerequisites

- `eweser_save_memory` MCP tool available in the PA agent's tool list
- `EWESER_AUTO_SAVE_SESSIONS=true` environment variable set on the OpenClaw server
- A conversations room UUID configured as `EWESER_CONVERSATIONS_ROOM_ID`

## Deployment

Copy this skill to the OpenClaw PA skills directory:

```bash
cp session-memory-save.skill.md /home/openclaw/.openclaw/workspace-pa-jacob/skills/session-memory-save.md
```

## Trigger

- Fires on session close
- Only active when `EWESER_AUTO_SAVE_SESSIONS=true`
- Also fires when user says "save session" (manual trigger)

## Behavior

When triggered, the PA agent should:

1. Generate a concise summary (≤ 500 tokens) of what was accomplished in the session
2. Extract any decisions, blockers, or notable facts
3. Call `eweser_save_memory` with:
   - `title`: Short descriptive title (e.g. "Session: auth server migration 2026-04-04")
   - `summary`: The generated summary
   - `memoryType`: `"session"`
   - `agentId`: The agent's identifier (e.g. `"openclaw-pa-jacob"`)
   - `date`: Today's ISO date
   - `tags`: Inferred from topics discussed (e.g. `["auth-server", "migration"]`)
4. Confirm the save was successful

## Example Tool Call

```json
{
  "tool": "eweser_save_memory",
  "args": {
    "roomId": "{{EWESER_CONVERSATIONS_ROOM_ID}}",
    "title": "Session: completed aggregator search endpoint 2026-04-04",
    "summary": "Implemented POST /api/agent-search on the aggregator with agent bearer token auth and PostgreSQL FTS. Also enhanced eweser_search MCP tool to call the aggregator with fallback to in-memory scan.",
    "memoryType": "session",
    "agentId": "openclaw-pa-jacob",
    "date": "2026-04-04",
    "tags": ["aggregator", "mcp-server", "search"]
  }
}
```

## Manual Recall

To recall past sessions from any agent:

```json
{
  "tool": "eweser_search",
  "args": {
    "query": "aggregator search endpoint",
    "filters": { "memoryType": ["session", "decision"] }
  }
}
```
