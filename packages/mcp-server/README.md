# @eweser/mcp — EweserDB MCP Server

Lets AI clients connect to EweserDB through the [Model Context Protocol](https://modelcontextprotocol.io/). Eweser currently ships six supported setup paths: Claude Desktop, Claude web, ChatGPT web, GitHub Copilot, Codex, and OpenClaw.

## Prerequisites

1. **EweserDB auth server** running (local or remote)
2. **Either** an OAuth-capable remote MCP client **or** an agent token created from the signed-in Connect AI page
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

| Variable              | Required | Description                                                          |
| --------------------- | -------- | -------------------------------------------------------------------- |
| `EWESER_AGENT_TOKEN`  | ✅       | Agent bearer token from auth server                                  |
| `EWESER_AUTH_URL`     | ✅       | Base URL of the auth server, e.g. `http://localhost:3001`            |
| `EWESER_WORKTREE_TAG` | optional | Workspace/tag label used to scope saved memory docs to this worktree |
| `EWESER_SYNC_URL`     | optional | Override sync WebSocket URL                                          |

## Available Tools

| Tool                     | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `eweser_list_rooms`      | List rooms the agent can access, optionally filtered by collection key |
| `eweser_list_documents`  | List documents in a room (IDs + summaries)                             |
| `eweser_read_document`   | Read a full document by room ID and document ID                        |
| `eweser_search`          | Full-text search across all accessible rooms                           |
| `eweser_create_document` | Create a new document in a room                                        |
| `eweser_update_document` | Update fields on an existing document                                  |
| `eweser_delete_document` | Soft-delete a document (sets `_deleted = true`)                        |

## Supported Clients

### Claude Desktop

Primary path: local stdio with an agent token. The signed-in Connect AI page generates this exact config for you.

```json
{
  "mcpServers": {
    "eweser": {
      "command": "npx",
      "args": ["-y", "@eweser/mcp"],
      "env": {
        "EWESER_AGENT_TOKEN": "your-agent-token",
        "EWESER_AUTH_URL": "https://auth.eweser.com"
      }
    }
  }
}
```

### Claude Web

Primary path: remote HTTP MCP with OAuth.

- MCP URL: `https://auth.eweser.com/mcp`
- OAuth metadata: `https://auth.eweser.com/.well-known/oauth-authorization-server`
- Add the connector in Claude.ai and complete the OAuth flow when prompted.

### ChatGPT Web

Primary path: remote HTTP MCP with OAuth.

- MCP URL: `https://auth.eweser.com/mcp`
- OAuth metadata: `https://auth.eweser.com/.well-known/oauth-authorization-server`
- Enable ChatGPT developer mode before importing the connector.

### GitHub Copilot

Current launch path: token-backed remote HTTP fallback.

```json
{
  "servers": {
    "eweser": {
      "type": "http",
      "url": "https://auth.eweser.com/mcp",
      "headers": {
        "Authorization": "Bearer your-agent-token"
      },
      "tools": ["*"]
    }
  }
}
```

This is the shipped fallback because current GitHub Copilot cloud agent docs explicitly call out that remote OAuth-backed MCP servers are not supported there.

### Codex

Current launch path: token-backed remote HTTP fallback using `bearer_token_env_var`.

```toml
[mcp_servers.eweser]
url = "https://auth.eweser.com/mcp"
bearer_token_env_var = "EWESER_MCP_TOKEN"
```

Set `EWESER_MCP_TOKEN` in the environment that launches Codex Desktop, then fully restart Codex before opening a fresh session. A project `.env` file is useful for manual shell tests, but Codex does not automatically read repo `.env` files when it boots native MCP servers.

```bash
export EWESER_MCP_TOKEN="your-agent-token"
```

Common setup patterns:

```bash
# macOS: make the token available to GUI apps like Codex Desktop
launchctl setenv EWESER_MCP_TOKEN "your-agent-token"
```

```bash
# Linux: launch Codex from a shell that already has the token
export EWESER_MCP_TOKEN="your-agent-token"
codex
```

```powershell
# Windows PowerShell: set the user environment variable, then restart Codex
[Environment]::SetEnvironmentVariable("EWESER_MCP_TOKEN", "your-agent-token", "User")
```

Verification checklist:

- `~/.codex/config.toml` contains the `mcp_servers.eweser` block above
- `EWESER_MCP_TOKEN` is present in the desktop app environment
- Codex has been fully quit and reopened
- A fresh session exposes native `eweser_*` tools

### OpenClaw

Current launch path: token-backed remote HTTP config with explicit headers.

```json
{
  "mcpServers": {
    "eweser": {
      "type": "http",
      "url": "https://auth.eweser.com/mcp",
      "headers": {
        "Authorization": "Bearer your-agent-token"
      }
    }
  }
}
```

## OAuth vs Token Paths

- OAuth: Claude web and ChatGPT web use `https://auth.eweser.com/mcp` plus the OAuth discovery document at `https://auth.eweser.com/.well-known/oauth-authorization-server`.
- Token bootstrap: Claude Desktop uses local stdio, while Copilot, Codex, and OpenClaw use token-backed remote HTTP fallback snippets from the signed-in Connect AI page.
- Smart-link rule: bearer tokens are never placed in URLs. Tokens are minted or rotated only from authenticated Eweser pages.

## Permissions

Agent tokens use separate read and write scopes.

- Read scope controls `list_rooms`, `list_documents`, `read_document`, and `search`.
- Write scope controls `create_document`, `update_document`, `delete_document`, and `save_memory`.
- For notes, writable scope can be narrowed further by room plus `folderIds` or `sourcePath` prefixes.
- Legacy `permissions: "readwrite"` tokens keep their existing room-level behavior when no explicit write scope is present.

The recommended writable setup is a dedicated room named `AI Notes`.

1. Create or choose an `AI Notes` room in Eweser.
2. Open the signed-in Connect AI page.
3. Select only that room in the Writable AI area.
4. Prepare or rotate the token for Codex, Claude Desktop, Copilot, or OpenClaw.

With that setup, the AI client can read the rooms granted by the token but can only create, update, or delete documents in the selected writable room. If no writable room is selected, token clients are read-only.

Every tool call is audit-logged to the auth server (room, action, document count).

## Troubleshooting

| Error                                                               | Fix                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Token verification failed: 401`                                    | Check `EWESER_AGENT_TOKEN` is correct and not expired                                                                     |
| OAuth client not connecting                                         | Verify the client is using `https://auth.eweser.com/mcp` and the OAuth metadata document on the same origin               |
| `Room not connected or not accessible`                              | The room ID may not be in the agent's `allowedRooms` list                                                                 |
| `Agent does not have write permission`                              | Select a writable room on the Connect AI page, then prepare or rotate the client token                                    |
| `Agent does not have write permission for this note folder or path` | The note is outside the token's configured folder/path write scope                                                        |
| WebSocket connection errors                                         | Check `EWESER_AUTH_URL` / `EWESER_SYNC_URL` are reachable                                                                 |
| Codex does not show `eweser_*` tools                                | Confirm `EWESER_MCP_TOKEN` is available to the Codex app at startup, not only in a repo `.env`, then fully relaunch Codex |
