import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import {
  createAgentConfig,
  deleteAgentConfig,
  getAgentAccessLogs,
  getAgentConfigById,
  getAgentConfigsByUserId,
  getAgentConfigByTokenHash,
  hashToken,
  revokeAgentConfig,
  rotateAgentToken,
  touchAgentLastAccess,
} from '../model/agents.js';

export const agentsRouter = new Hono();

/**
 * GET /api/agents
 * List all agent configs for the authenticated user.
 */
agentsRouter.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const agents = await getAgentConfigsByUserId(user.id);

  // Never return the token hash — only surface safe fields
  const safeAgents = agents.map(({ tokenHash: _tokenHash, ...rest }) => rest);
  return c.json({ agents: safeAgents });
});

/**
 * POST /api/agents
 * Register a new agent. Returns the agent config + the plaintext token (shown once).
 *
 * Body: { name, type?, endpoint?, allowedCollections, allowedRooms?, permissions?, tokenExpiresAt? }
 */
agentsRouter.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    name: string;
    type?: 'mcp' | 'openclaw' | 'custom';
    endpoint?: string;
    allowedCollections: string[];
    allowedRooms?: string[];
    permissions?: 'read' | 'readwrite';
    tokenExpiresAt?: number;
  }>();

  if (!body.name || !Array.isArray(body.allowedCollections)) {
    return c.json({ error: 'name and allowedCollections are required' }, 400);
  }

  const { agentConfig, token } = await createAgentConfig({
    userId: user.id,
    name: body.name,
    type: body.type ?? 'mcp',
    endpoint: body.endpoint,
    allowedCollections: body.allowedCollections,
    allowedRooms: body.allowedRooms ?? [],
    permissions: body.permissions ?? 'read',
    tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
  });

  const { tokenHash: _tokenHash, ...safeConfig } = agentConfig;

  return c.json(
    {
      agent: safeConfig,
      // Shown only once — the client must store this securely.
      token,
      warning:
        'Store this token securely. It will not be shown again. Use it as a Bearer token for MCP authentication.',
    },
    201
  );
});

/**
 * GET /api/agents/:id
 * Get a single agent config (without token hash).
 */
agentsRouter.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const agentId = c.req.param('id');

  const agent = await getAgentConfigById(agentId, user.id);
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const { tokenHash: _tokenHash, ...safeAgent } = agent;
  return c.json({ agent: safeAgent });
});

/**
 * POST /api/agents/:id/revoke
 * Revoke an agent — sets isActive=false and clears the token hash.
 * The agent will receive 401 on its next MCP call.
 */
agentsRouter.post('/:id/revoke', requireAuth, async (c) => {
  const user = c.get('user');
  const agentId = c.req.param('id');

  const updated = await revokeAgentConfig(agentId, user.id);
  if (!updated) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const { tokenHash: _tokenHash, ...safeAgent } = updated;
  return c.json({ agent: safeAgent, message: 'Agent revoked successfully' });
});

/**
 * POST /api/agents/:id/rotate-token
 * Rotate the agent's token — generates a new token, old token is immediately invalid.
 */
agentsRouter.post('/:id/rotate-token', requireAuth, async (c) => {
  const user = c.get('user');
  const agentId = c.req.param('id');

  const result = await rotateAgentToken(agentId, user.id);
  if (!result) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const { tokenHash: _tokenHash, ...safeAgent } = result.agentConfig;
  return c.json({
    agent: safeAgent,
    token: result.token,
    warning: 'Store this token securely. It will not be shown again.',
  });
});

/**
 * DELETE /api/agents/:id
 * Permanently delete an agent config and its access logs (via cascade).
 */
agentsRouter.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const agentId = c.req.param('id');

  const deleted = await deleteAgentConfig(agentId, user.id);
  if (!deleted) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({ message: 'Agent deleted' });
});

/**
 * GET /api/agents/:id/logs
 * Get the access log for an agent (last 100 entries by default).
 *
 * Query: ?limit=<number>
 */
agentsRouter.get('/:id/logs', requireAuth, async (c) => {
  const user = c.get('user');
  const agentId = c.req.param('id');
  const limitStr = c.req.query('limit');
  const limit = limitStr ? Math.min(parseInt(limitStr, 10), 500) : 100;

  // Verify the agent belongs to the user
  const agent = await getAgentConfigById(agentId, user.id);
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const logs = await getAgentAccessLogs(agentId, user.id, limit);
  return c.json({ logs });
});

/**
 * POST /api/agents/verify-token
 * Used by the MCP server to validate an agent token and get its permissions.
 * This endpoint does NOT require a user session — it's an internal server-to-server call.
 *
 * Body: { token: string }
 * Returns: { agentConfig } with allowed collections/rooms, or 401.
 *
 * Security: The MCP server should call this with the raw token from the Bearer header.
 */
agentsRouter.post('/verify-token', async (c) => {
  const body = await c.req.json<{ token: string }>();

  if (!body.token) {
    return c.json({ error: 'token is required' }, 400);
  }

  const tokenHash = hashToken(body.token);
  const agent = await getAgentConfigByTokenHash(tokenHash);

  if (!agent) {
    return c.json({ error: 'Invalid or revoked token' }, 401);
  }

  // Check token expiry
  if (agent.tokenExpiresAt && agent.tokenExpiresAt < new Date()) {
    return c.json({ error: 'Token expired' }, 401);
  }

  // Update last access timestamp (fire-and-forget)
  void touchAgentLastAccess(agent.id);

  const { tokenHash: _tokenHash, ...safeAgent } = agent;
  return c.json({ agent: safeAgent });
});
