# MCP Server Source

## Plain English

This source root contains the stdio MCP entry point, auth client, DataLayer, env
parsing, and tool registration for agent access to EweserDB.

## Owns

- MCP server startup and stdio transport.
- Agent-token auth validation and room discovery.
- Tool schemas, secret redaction, and document operations.

## Start Here

- [`index.ts`](./index.ts): Stdio process entry point.
- [`tools.ts`](./tools.ts): MCP tool definitions and validation.
- [`data-layer.ts`](./data-layer.ts): Room connections and document operations.
- [`auth.ts`](./auth.ts): Auth API calls for token verification and room access.
- [`env.ts`](./env.ts): Environment variable parsing.

## Children

- [`auth.ts`](./auth.ts): Agent auth API client.
- [`data-layer.ts`](./data-layer.ts): EweserDB room data layer.
- [`tools.ts`](./tools.ts): MCP tool registration.
- [`lib.ts`](./lib.ts): Package library exports.

## Key Contracts

- MCP tools expose only rooms available to the verified agent token.
- Secret-like text is redacted before returning tool content.
- Stdio logging must not corrupt JSON-RPC stdout.

## Update Triggers

- Update when tools, auth flows, env variables, DataLayer methods, or transport
  behavior change.

## Testing

- `npm test --workspace @eweser/mcp`: Runs MCP tests.
- `npm run type-check --workspace @eweser/mcp`: Type-checks source.
