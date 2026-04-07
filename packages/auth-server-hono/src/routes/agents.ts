import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { requireAuth } from '../middleware/auth.js';
import { agentAuth } from '../middleware/agent-auth.js';
import {
  createAgentConfig,
  deleteAgentConfig,
  getAgentAccessLogs,
  getAgentConfigById,
  getAgentConfigsByUserId,
  getAgentConfigByTokenHash,
  hashToken,
  logAgentAccess,
  revokeAgentConfig,
  rotateAgentToken,
  touchAgentLastAccess,
} from '../model/agents.js';
import { getRoomsByIds } from '../model/rooms/calls.js';
import { getUserById } from '../model/users.js';
import { generateSyncToken } from '../services/sync-token.js';
import { env } from '../env.js';
import { COLLECTION_KEYS } from '@eweser/shared';

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

  const invalidCollections = body.allowedCollections.filter(
    (k) => !COLLECTION_KEYS.includes(k as (typeof COLLECTION_KEYS)[number])
  );
  if (invalidCollections.length > 0) {
    return c.json(
      {
        error: `Invalid collection keys: ${invalidCollections.join(', ')}. Allowed: ${COLLECTION_KEYS.join(', ')}`,
      },
      400
    );
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
 * Rate-limited to 30 requests per minute per IP to prevent brute-force attacks.
 */
const verifyTokenRateLimiter = (() => {
  const counts = new Map<string, { count: number; resetAt: number }>();
  const WINDOW_MS = 60_000;
  const MAX = 30;

  const getClientKey = (
    c: Parameters<ReturnType<typeof createMiddleware>>[0]
  ) => {
    // Only trust x-forwarded-for when a known proxy set it; cf-connecting-ip and x-real-ip
    // are client-supplied headers that can be spoofed to bypass rate limits.
    // In production, Caddy (reverse proxy) sets x-forwarded-for; do not trust it from direct clients.
    const xForwarded = c.req.header('x-forwarded-for');
    const clientIp =
      (xForwarded ? xForwarded.split(',')[0] : null) ??
      c.req.header('x-real-ip') ??
      'unknown';
    return clientIp.trim().slice(0, 64) || 'unknown';
  };

  const evictStaleEntries = (now: number) => {
    if (counts.size < 10_000) return;

    for (const [key, entry] of counts) {
      if (now > entry.resetAt) {
        counts.delete(key);
      }
    }

    while (counts.size > 10_000) {
      const oldestKey = counts.keys().next().value;
      if (!oldestKey) break;
      counts.delete(oldestKey);
    }
  };

  return createMiddleware(async (c, next) => {
    const now = Date.now();
    evictStaleEntries(now);

    const clientKey = getClientKey(c);
    const entry = counts.get(clientKey);
    if (!entry || now > entry.resetAt) {
      counts.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      entry.count++;
      if (entry.count > MAX) {
        return c.json({ error: 'Too many requests' }, 429);
      }
    }
    await next();
  });
})();

agentsRouter.post('/verify-token', verifyTokenRateLimiter, async (c) => {
  let body: { token?: unknown };
  try {
    body = await c.req.json<{ token?: unknown }>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body.token !== 'string' || body.token.length === 0) {
    return c.json({ error: 'token is required' }, 400);
  }

  const tokenHash = hashToken(body.token);
  const agent = await getAgentConfigByTokenHash(tokenHash);

  if (!agent) {
    return c.json({ error: 'Invalid or revoked token' }, 401);
  }

  if (!agent.isActive) {
    return c.json({ error: 'Agent is revoked' }, 401);
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

/**
 * POST /api/agents/me/rooms
 * Agent-authenticated: returns rooms this agent is allowed to access.
 * Filters by agent.allowedCollections and agent.allowedRooms.
 */
agentsRouter.post('/me/rooms', agentAuth, async (c) => {
  const agent = c.get('agent');

  // Get the owning user to find their room IDs
  const user = await getUserById(agent.userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const userRoomIds: string[] = user.rooms ?? [];
  if (userRoomIds.length === 0) {
    return c.json({ rooms: [] });
  }

  let allRooms = await getRoomsByIds(userRoomIds);

  // Filter by allowedCollections
  if (agent.allowedCollections.length > 0) {
    allRooms = allRooms.filter((r) =>
      agent.allowedCollections.includes(r.collectionKey)
    );
  }

  // Filter by allowedRooms (if non-empty, restrict to specific room IDs)
  if (agent.allowedRooms.length > 0) {
    allRooms = allRooms.filter((r) => agent.allowedRooms.includes(r.id));
  }

  // Return only safe fields
  const rooms = allRooms.map(
    ({ id, name, collectionKey, syncUrl, syncBaseUrl }) => ({
      id,
      name,
      collectionKey,
      syncUrl,
      syncBaseUrl,
    })
  );

  return c.json({ rooms });
});

/**
 * POST /api/agents/me/sync-token
 * Agent-authenticated: returns a Hocuspocus sync JWT for a specific room.
 * Validates the room belongs to the user and the agent has access.
 */
agentsRouter.post('/me/sync-token', agentAuth, async (c) => {
  const agent = c.get('agent');
  const body = await c.req.json<{ roomId: string }>();

  if (!body.roomId) {
    return c.json({ error: 'roomId is required' }, 400);
  }

  // Get the owning user to find their room IDs
  const user = await getUserById(agent.userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const userRoomIds: string[] = user.rooms ?? [];
  if (!userRoomIds.includes(body.roomId)) {
    return c.json({ error: 'Room not found or not accessible' }, 404);
  }

  const rooms = await getRoomsByIds([body.roomId]);
  const room = rooms[0];
  if (!room) {
    return c.json({ error: 'Room not found' }, 404);
  }

  // Validate agent is allowed access to this room
  if (
    agent.allowedCollections.length > 0 &&
    !agent.allowedCollections.includes(room.collectionKey)
  ) {
    return c.json(
      { error: 'Agent not allowed to access this collection' },
      403
    );
  }
  if (
    agent.allowedRooms.length > 0 &&
    !agent.allowedRooms.includes(body.roomId)
  ) {
    return c.json({ error: 'Agent not allowed to access this room' }, 403);
  }

  const syncBaseUrl = room.syncBaseUrl ?? env.SYNC_SERVER_URL;
  const { token, expiry } = generateSyncToken(
    body.roomId,
    room.collectionKey,
    agent.userId
  );
  const syncUrl = `${syncBaseUrl}/${body.roomId}`;

  return c.json({
    syncUrl,
    syncToken: token,
    tokenExpiry: expiry.toISOString(),
  });
});

/**
 * POST /api/agents/me/log
 * Agent-authenticated: logs an access entry for audit purposes.
 */
agentsRouter.post('/me/log', agentAuth, async (c) => {
  const agent = c.get('agent');
  const body = await c.req.json<{
    roomId: string;
    collectionKey: string;
    action: 'read' | 'write';
    documentCount?: number;
  }>();

  if (!body.roomId || !body.collectionKey || !body.action) {
    return c.json(
      { error: 'roomId, collectionKey, and action are required' },
      400
    );
  }
  if (body.action !== 'read' && body.action !== 'write') {
    return c.json({ error: 'action must be read or write' }, 400);
  }

  await logAgentAccess({
    agentId: agent.id,
    userId: agent.userId,
    roomId: body.roomId,
    collectionKey: body.collectionKey,
    action: body.action,
    documentCount: body.documentCount ?? 0,
  });

  void touchAgentLastAccess(agent.id);

  return c.json({ ok: true });
});
