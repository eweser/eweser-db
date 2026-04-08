/**
 * Library entry point for @eweser/mcp.
 * Exports DataLayer, registerTools, and auth helpers for use
 * by the auth-server-hono HTTP MCP endpoint.
 */
export { DataLayer } from './data-layer.js';
export { registerTools } from './tools.js';
export {
  verifyAgentToken,
  fetchAgentRooms,
  fetchSyncToken,
  logAccess,
} from './auth.js';
export type { AgentConfig, AgentRoom, SyncTokenResult } from './auth.js';
