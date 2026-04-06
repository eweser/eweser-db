#!/usr/bin/env node
/**
 * EweserDB MCP Server — stdio transport entry point.
 *
 * Claude Desktop / Copilot / OpenClaw PA spawn this process and communicate
 * via stdin/stdout JSON-RPC (Model Context Protocol).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { env } from './env.js';
import { verifyAgentToken, fetchAgentRooms } from './auth.js';
import { DataLayer } from './data-layer.js';
import { registerTools } from './tools.js';
import { logAccess } from './auth.js';

async function main() {
  // 1. Verify agent token
  let agentConfig;
  try {
    agentConfig = await verifyAgentToken(env.EWESER_AGENT_TOKEN, env.EWESER_AUTH_URL);
  } catch (err) {
    console.error('[eweser-mcp] Failed to verify agent token:', err);
    process.exit(1);
  }

  // 2. Fetch rooms this agent can access
  const rooms = await fetchAgentRooms(env.EWESER_AGENT_TOKEN, env.EWESER_AUTH_URL);

  // 3. Initialize data layer (connect to Hocuspocus rooms)
  const dataLayer = new DataLayer(agentConfig, env.EWESER_AUTH_URL, env.EWESER_AGENT_TOKEN, env.EWESER_SYNC_URL);
  await dataLayer.init(rooms);

  // 4. Create and configure MCP server
  const server = new McpServer({
    name: 'eweser-mcp',
    version: '0.1.0',
  });

  const logFn = (entry: {
    roomId: string;
    collectionKey: string;
    action: 'read' | 'write';
    documentCount?: number;
  }) => logAccess(env.EWESER_AGENT_TOKEN, env.EWESER_AUTH_URL, entry);

  registerTools(server, dataLayer, logFn, env.EWESER_AGGREGATOR_URL);

  // 5. Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // 6. Graceful shutdown
  const shutdown = async () => {
    await dataLayer.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[eweser-mcp] Fatal error:', err);
  process.exit(1);
});
