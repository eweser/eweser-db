# @eweser/mcp

## Plain English

This package is the local stdio MCP server that lets AI clients access
authorized EweserDB rooms through agent tokens.

## Owns

- Agent token verification and room fetching against the auth API.
- DataLayer connections to EweserDB rooms.
- MCP tool registration for room/document search and CRUD.

## Start Here

- [`README.md`](./README.md): Supported clients, configuration, and tools.
- [`GLOSSARY.md`](./GLOSSARY.md): MCP and agent-memory glossary.
- [`package.json`](./package.json): Workspace scripts.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/index.ts`](./src/index.ts): Stdio MCP server entry point.

## Children

- [`src/`](./src/): MCP runtime, auth client, data layer, and tools.

## Key Contracts

- Agent tokens are secrets and must never be logged.
- Tool writes must respect scoped room access and use EweserDB document helpers.
- Tool output must redact secret-like text.

## Update Triggers

- Update when MCP setup paths, tool names/schemas, auth behavior, DataLayer
  behavior, or key scripts change.

## Testing

- `npm test --workspace @eweser/mcp`: Runs MCP server tests.
- `npm run build --workspace @eweser/mcp`: Builds the package.
- `npm run code-index:check`: Validates index and header format.
