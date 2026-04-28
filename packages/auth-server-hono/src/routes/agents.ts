import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { agentAuth } from '../middleware/agent-auth.js';
import { combinedAgentAuth } from '../middleware/combined-agent-auth.js';
import { createRateLimit, getClientIp } from '../middleware/rate-limit.js';
import { requireVerifiedEmail } from '../middleware/verified-email.js';
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
import { logSecurityEvent } from '../model/security-events.js';

export const agentsRouter = new Hono();
const maxAgentTokenTtlMs = env.AGENT_TOKEN_MAX_TTL_SECONDS * 1000;
const defaultAgentTokenTtlMs = env.AGENT_TOKEN_DEFAULT_TTL_SECONDS * 1000;
const createAgentRateLimit = createRateLimit({
  key: 'agents-create',
  max: 20,
  windowMs: 60_000,
});
const rotateTokenRateLimit = createRateLimit({
  key: 'agents-rotate-token',
  max: 20,
  windowMs: 60_000,
});

const createAgentBodySchema = z.object({
  allowedCollections: z.array(z.string()).min(1).optional(),
  allowedRooms: z.array(z.string()).optional(),
  endpoint: z.string().url().optional(),
  name: z.string().min(2).max(120),
  permissions: z.enum(['read', 'readwrite']).optional(),
  readAllowedCollections: z.array(z.string()).optional(),
  readAllowedRooms: z.array(z.string()).optional(),
  tokenExpiresAt: z.number().int().positive().optional(),
  type: z.enum(['mcp', 'openclaw', 'custom']).optional(),
  writeAllowedCollections: z.array(z.string()).optional(),
  writeAllowedFolderIds: z.array(z.string()).optional(),
  writeAllowedPathPrefixes: z.array(z.string()).optional(),
  writeAllowedRooms: z.array(z.string()).optional(),
});

const verifyTokenBodySchema = z.object({
  token: z.string().min(1),
});

const syncTokenBodySchema = z.object({
  roomId: z.string().min(1),
});

const agentLogBodySchema = z.object({
  action: z.enum(['read', 'write']),
  collectionKey: z.string().min(1),
  documentCount: z.number().int().nonnegative().optional(),
  roomId: z.string().min(1),
});

function compactScope(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function effectiveScope(
  nextScope: string[] | undefined,
  legacyScope: string[] | undefined
): string[] {
  const next = compactScope(nextScope);
  return next.length > 0 ? next : compactScope(legacyScope);
}

function scopeIncludes(scope: string[], value: string): boolean {
  return scope.length === 0 || scope.includes(value);
}

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
agentsRouter.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  createAgentRateLimit,
  async (c) => {
    const user = c.get('user');
    const bodyResult = createAgentBodySchema.safeParse(
      await c.req.json().catch(() => null)
    );
    if (!bodyResult.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
    const body = bodyResult.data;

    const allowedCollections =
      body.allowedCollections ?? body.readAllowedCollections ?? [];
    const invalidCollections = [
      ...allowedCollections,
      ...(body.readAllowedCollections ?? []),
      ...(body.writeAllowedCollections ?? []),
    ].filter(
      (k, index, all) =>
        all.indexOf(k) === index &&
        !COLLECTION_KEYS.includes(k as (typeof COLLECTION_KEYS)[number])
    );

    if (allowedCollections.length === 0 && invalidCollections.length === 0) {
      return c.json(
        {
          error:
            'At least one readable collection is required via allowedCollections or readAllowedCollections.',
        },
        400
      );
    }

    if (invalidCollections.length > 0) {
      return c.json(
        {
          error: `Invalid collection keys: ${invalidCollections.join(', ')}. Allowed: ${COLLECTION_KEYS.join(', ')}`,
        },
        400
      );
    }

    const tokenExpiresAt = body.tokenExpiresAt
      ? new Date(body.tokenExpiresAt)
      : new Date(Date.now() + defaultAgentTokenTtlMs);
    if (tokenExpiresAt.getTime() - Date.now() > maxAgentTokenTtlMs) {
      return c.json({ error: 'tokenExpiresAt exceeds max TTL' }, 400);
    }

    const { agentConfig, token } = await createAgentConfig({
      userId: user.id,
      name: body.name,
      type: body.type ?? 'mcp',
      endpoint: body.endpoint,
      allowedCollections,
      allowedRooms: body.allowedRooms ?? body.readAllowedRooms ?? [],
      permissions: body.permissions ?? 'read',
      readAllowedCollections: body.readAllowedCollections,
      readAllowedRooms: body.readAllowedRooms,
      tokenExpiresAt,
      writeAllowedCollections: body.writeAllowedCollections,
      writeAllowedFolderIds: body.writeAllowedFolderIds,
      writeAllowedPathPrefixes: body.writeAllowedPathPrefixes,
      writeAllowedRooms: body.writeAllowedRooms,
    });
    await logSecurityEvent({
      action: 'agent.token.created',
      ipAddress: getClientIp(c.req.raw.headers),
      level: 'info',
      metadata: {
        agentId: agentConfig.id,
        permissions: agentConfig.permissions,
      },
      userId: user.id,
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
  }
);

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
agentsRouter.post(
  '/:id/revoke',
  requireAuth,
  requireVerifiedEmail,
  async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');

    const updated = await revokeAgentConfig(agentId, user.id);
    if (!updated) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    await logSecurityEvent({
      action: 'agent.token.revoked',
      ipAddress: getClientIp(c.req.raw.headers),
      level: 'warn',
      metadata: { agentId },
      userId: user.id,
    });

    const { tokenHash: _tokenHash, ...safeAgent } = updated;
    return c.json({ agent: safeAgent, message: 'Agent revoked successfully' });
  }
);

/**
 * POST /api/agents/:id/rotate-token
 * Rotate the agent's token — generates a new token, old token is immediately invalid.
 */
agentsRouter.post(
  '/:id/rotate-token',
  requireAuth,
  requireVerifiedEmail,
  rotateTokenRateLimit,
  async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');

    const result = await rotateAgentToken(agentId, user.id);
    if (!result) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    await logSecurityEvent({
      action: 'agent.token.rotated',
      ipAddress: getClientIp(c.req.raw.headers),
      level: 'warn',
      metadata: { agentId },
      userId: user.id,
    });

    const { tokenHash: _tokenHash, ...safeAgent } = result.agentConfig;
    return c.json({
      agent: safeAgent,
      token: result.token,
      warning: 'Store this token securely. It will not be shown again.',
    });
  }
);

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
    return getClientIp(c.req.raw.headers);
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
  const bodyResult = verifyTokenBodySchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!bodyResult.success) {
    return c.json({ error: 'token is required' }, 400);
  }

  const tokenHash = hashToken(bodyResult.data.token);
  const agent = await getAgentConfigByTokenHash(tokenHash);

  if (!agent) {
    await logSecurityEvent({
      action: 'agent.token.verify.failed',
      ipAddress: getClientIp(c.req.raw.headers),
      level: 'warn',
      metadata: { reason: 'not_found_or_revoked' },
    });
    return c.json({ error: 'Invalid or revoked token' }, 401);
  }

  if (!agent.isActive) {
    await logSecurityEvent({
      action: 'agent.token.verify.failed',
      ipAddress: getClientIp(c.req.raw.headers),
      level: 'warn',
      metadata: { agentId: agent.id, reason: 'inactive' },
      userId: agent.userId,
    });
    return c.json({ error: 'Agent is revoked' }, 401);
  }

  // Check token expiry
  if (agent.tokenExpiresAt && agent.tokenExpiresAt < new Date()) {
    await logSecurityEvent({
      action: 'agent.token.verify.failed',
      ipAddress: getClientIp(c.req.raw.headers),
      level: 'warn',
      metadata: { agentId: agent.id, reason: 'expired' },
      userId: agent.userId,
    });
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

  const readAllowedCollections = effectiveScope(
    agent.readAllowedCollections,
    agent.allowedCollections
  );
  const readAllowedRooms = effectiveScope(
    agent.readAllowedRooms,
    agent.allowedRooms
  );

  allRooms = allRooms.filter(
    (room) =>
      scopeIncludes(readAllowedCollections, room.collectionKey) &&
      scopeIncludes(readAllowedRooms, room.id)
  );

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
agentsRouter.post('/me/sync-token', combinedAgentAuth, async (c) => {
  const agent = c.get('agent');
  const bodyResult = syncTokenBodySchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!bodyResult.success) {
    return c.json({ error: 'roomId is required' }, 400);
  }
  const body = bodyResult.data;

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
  const readAllowedCollections = effectiveScope(
    agent.readAllowedCollections,
    agent.allowedCollections
  );
  const readAllowedRooms = effectiveScope(
    agent.readAllowedRooms,
    agent.allowedRooms
  );

  if (!scopeIncludes(readAllowedCollections, room.collectionKey)) {
    return c.json(
      { error: 'Agent not allowed to access this collection' },
      403
    );
  }
  if (!scopeIncludes(readAllowedRooms, body.roomId)) {
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
  const bodyResult = agentLogBodySchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!bodyResult.success) {
    return c.json(
      { error: 'roomId, collectionKey, and action are required' },
      400
    );
  }
  const body = bodyResult.data;

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
