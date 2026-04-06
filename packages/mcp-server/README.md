# @eweser/mcp — EweserDB MCP Server

Lets AI agents (Claude Desktop, GitHub Copilot, OpenClaw PA) read and write the user's EweserDB data through the [Model Context Protocol](https://modelcontextprotocol.io/) over stdio.

## Prerequisites

1. **EweserDB auth server** running (local or remote)
2. **An agent token** created via the auth-server API (`POST /api/agents`)
3. **Node.js 20+**

## Installation

```bash
# From the monorepo root (dev)
npm install

# Or install globally from npm (once published)
npm install -g @eweser/mcp
```

## Configuration

Copy `example.env` and fill in your credentials:

```bash
cp example.env .env
```

| Variable | Required | Description |
|---|---|---|
| `EWESER_AGENT_TOKEN` | ✅ | Agent bearer token from auth server |
| `EWESER_AUTH_URL` | ✅ | Base URL of the auth server, e.g. `http://localhost:3001` |
| `EWESER_SYNC_URL` | optional | Override sync WebSocket URL |

## Available Tools

| Tool | Description |
|---|---|
| `eweser_list_rooms` | List rooms the agent can access, optionally filtered by collection key |
| `eweser_list_documents` | List documents in a room (IDs + summaries) |
| `eweser_read_document` | Read a full document by room ID and document ID |
| `eweser_search` | Full-text search across all accessible rooms |
| `eweser_create_document` | Create a new document in a room |
| `eweser_update_document` | Update fields on an existing document |
| `eweser_delete_document` | Soft-delete a document (sets `_deleted = true`) |

## Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "eweser": {
      "command": "npx",
      "args": ["-y", "@eweser/mcp"],
      "env": {
        "EWESER_AGENT_TOKEN": "your-agent-token",
        "EWESER_AUTH_URL": "http://localhost:3001"
      }
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your project, or to User settings under `github.copilot.mcpServers`:

```json
{
  "servers": {
    "eweser": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@eweser/mcp"],
      "env": {
        "EWESER_AGENT_TOKEN": "your-agent-token",
        "EWESER_AUTH_URL": "http://localhost:3001"
      }
    }
  }
}
```

### OpenClaw PA

Set environment variables in the OpenClaw PA skill config:

```env
EWESER_AGENT_TOKEN=your-agent-token
EWESER_AUTH_URL=https://auth.youreweserdomain.com
```

Then reference the server binary as the MCP command:

```
eweser-mcp
```

## Permissions

Agent tokens have either **read** or **readwrite** permissions, controlled by the token's `permissions` field.

- **read** agents can call: `list_rooms`, `list_documents`, `read_document`, `search`
- **readwrite** agents can additionally call: `create_document`, `update_document`, `delete_document`

Every tool call is audit-logged to the auth server (room, action, document count).

## Troubleshooting

| Error | Fix |
|---|---|
| `Token verification failed: 401` | Check `EWESER_AGENT_TOKEN` is correct and not expired |
| `Room not connected or not accessible` | The room ID may not be in the agent's `allowedRooms` list |
| `Agent does not have write permission` | The token has `permissions: "read"` — create a `readwrite` token |
| WebSocket connection errors | Check `EWESER_AUTH_URL` / `EWESER_SYNC_URL` are reachable |
