/**
 * HTTP MCP endpoint — POST /mcp
 *
 * Accepts both OAuth 2.0 Bearer tokens (from ChatGPT / Claude web) and
 * legacy agent Bearer tokens, then serves EweserDB data via the
 * Model Context Protocol Streamable HTTP transport.
 *
 * Session management: a DataLayer instance (Hocuspocus WS connections) is
 * cached per `mcp-session-id` header so reconnections are reused across calls.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createLogger } from '@eweser/logger';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { DataLayer, registerTools } from '@eweser/mcp';
import type { AgentConfig, AgentRoom } from '@eweser/mcp';
import type { AgentConfig as DbAgentConfig } from '../db/schema/agents.js';
import { createRateLimit, getClientIp } from '../middleware/rate-limit.js';
import {
  getValidOAuthAccessToken,
  touchOAuthAccessToken,
} from '../model/oauth.js';
import {
  getAgentConfigByTokenHash,
  hashToken,
  logAgentAccess,
} from '../model/agents.js';
import { getUserById } from '../model/users.js';
import { getRoomsByIds } from '../model/rooms/calls.js';
import { env } from '../env.js';
import { logSecurityEvent } from '../model/security-events.js';

// ---------------------------------------------------------------------------
// Session cache — keyed by mcp-session-id header
// ---------------------------------------------------------------------------

interface McpSession {
  dataLayer: DataLayer;
  lastAccessAt: number;
}

export const mcpRouter = new Hono();
const log = createLogger('mcp-route');
const mcpRequestRateLimit = createRateLimit({
  key: 'mcp-request',
  max: 120,
  windowMs: 60_000,
});

// TODO(multi-instance): This module-level Map works for a single Node.js process.
// For multiple auth-server replicas (horizontal scaling), replace with a Redis-backed
// session store or switch to stateless mode (re-initialize DataLayer on every request,
// which is slower but correct). See docs/ai/plans/2026-04-08-chatgpt-web-mcp.md.
const sessionCache = new Map<string, McpSession>();
const OAUTH_LAST_USED_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

// Prune sessions idle for more than 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(
  () => {
    const now = Date.now();
    for (const [id, session] of sessionCache) {
      if (now - session.lastAccessAt > SESSION_TTL_MS) {
        session.dataLayer.disconnect().catch(() => {});
        sessionCache.delete(id);
      }
    }
  },
  5 * 60 * 1000
);

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

export function mapDbAgentConfigForMcp(agent: DbAgentConfig): AgentConfig {
  return {
    id: agent.id,
    userId: agent.userId,
    name: agent.name,
    type: agent.type,
    allowedCollections: agent.allowedCollections,
    allowedRooms: agent.allowedRooms,
    permissions: agent.permissions,
    readAllowedCollections: agent.readAllowedCollections,
    readAllowedRooms: agent.readAllowedRooms,
    writeAllowedCollections: agent.writeAllowedCollections,
    writeAllowedRooms: agent.writeAllowedRooms,
    writeAllowedFolderIds: agent.writeAllowedFolderIds,
    writeAllowedPathPrefixes: agent.writeAllowedPathPrefixes,
    isActive: agent.isActive,
    tokenExpiresAt: agent.tokenExpiresAt?.toISOString() ?? null,
  };
}

export function filterRoomsForAgentConfig(
  rooms: AgentRoom[],
  agentConfig: AgentConfig
): AgentRoom[] {
  const readAllowedCollections = effectiveScope(
    agentConfig.readAllowedCollections,
    agentConfig.allowedCollections
  );
  const readAllowedRooms = effectiveScope(
    agentConfig.readAllowedRooms,
    agentConfig.allowedRooms
  );

  return rooms.filter(
    (room) =>
      scopeIncludes(readAllowedCollections, room.collectionKey) &&
      scopeIncludes(readAllowedRooms, room.id)
  );
}

// ---------------------------------------------------------------------------
// Auth resolution — try OAuth token first, then legacy agent token
// ---------------------------------------------------------------------------

interface ResolvedAuth {
  userId: string;
  permissions: 'read' | 'readwrite';
  agentConfig: AgentConfig | null; // null for OAuth tokens
  agentToken: string | null;
}

async function resolveAuth(
  authHeader: string | undefined
): Promise<ResolvedAuth | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  // 1. Try OAuth access token
  const oauthToken = await getValidOAuthAccessToken(token);
  if (oauthToken) {
    const shouldTouchLastUsedAt =
      !oauthToken.lastUsedAt ||
      Date.now() - oauthToken.lastUsedAt.getTime() >=
        OAUTH_LAST_USED_UPDATE_INTERVAL_MS;
    if (shouldTouchLastUsedAt) {
      void touchOAuthAccessToken(oauthToken.id).catch((error) => {
        log.warn(
          {
            oauthAccessTokenId: oauthToken.id,
            error,
          },
          'Failed to update OAuth access token last-used timestamp'
        );
      });
    }
    const permissions = oauthToken.scopes.includes('readwrite')
      ? 'readwrite'
      : 'read';
    return {
      userId: oauthToken.userId,
      permissions,
      agentConfig: null,
      agentToken: token,
    };
  }

  // 2. Try legacy agent bearer token
  const tokenHash = hashToken(token);
  const agent = await getAgentConfigByTokenHash(tokenHash);
  if (agent && agent.isActive) {
    const expiresAt = agent.tokenExpiresAt;
    if (expiresAt && expiresAt < new Date()) return null;
    return {
      userId: agent.userId,
      permissions: agent.permissions,
      agentConfig: mapDbAgentConfigForMcp(agent),
      agentToken: token,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Build AgentConfig and rooms list for a user (OAuth path — no pre-existing agent)
// ---------------------------------------------------------------------------

async function buildAgentConfigForUser(
  userId: string,
  permissions: 'read' | 'readwrite'
): Promise<{ agentConfig: AgentConfig; rooms: AgentRoom[] }> {
  const agentConfig: AgentConfig = {
    id: `oauth-${userId}`,
    userId,
    name: 'ChatGPT / Web MCP',
    type: 'mcp',
    allowedCollections: [],
    allowedRooms: [], // empty = all rooms
    permissions,
    isActive: true,
    tokenExpiresAt: null,
  };

  // Fetch all rooms the user owns
  const user = await getUserById(userId);
  const roomIds = user?.rooms ?? [];
  const dbRooms = await getRoomsByIds(roomIds);

  const agentRooms: AgentRoom[] = dbRooms.map((r) => ({
    id: r.id,
    name: r.name ?? r.collectionKey,
    collectionKey: r.collectionKey,
    syncUrl: r.syncUrl ?? null,
    syncBaseUrl: null,
  }));

  return { agentConfig, rooms: agentRooms };
}

// ---------------------------------------------------------------------------
// CORS — ChatGPT requires specific headers
// ---------------------------------------------------------------------------

mcpRouter.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return undefined;
      if (env.MCP_ALLOWED_ORIGINS.includes(origin)) return origin;
      if (env.AUTH_TRUSTED_ORIGINS.includes(origin)) return origin;
      return undefined;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'mcp-session-id',
      'Last-Event-ID',
      'mcp-protocol-version',
    ],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
  })
);

mcpRouter.use('*', mcpRequestRateLimit);

// ---------------------------------------------------------------------------
// POST/GET /mcp — Streamable HTTP MCP handler
// ---------------------------------------------------------------------------

mcpRouter.all('/', async (c) => {
  if (env.MCP_SESSION_MODE === 'redis') {
    return c.json(
      {
        error:
          'MCP_SESSION_MODE=redis configured, but this build only supports single-instance in-memory sessions.',
      },
      503
    );
  }

  // 1. Authenticate
  const auth = await resolveAuth(c.req.header('Authorization'));
  if (!auth) {
    await logSecurityEvent({
      action: 'mcp.auth.failed',
      ipAddress: getClientIp(c.req.raw.headers),
      level: 'warn',
      metadata: { path: c.req.path },
    });
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // 2. Get or create DataLayer session
  const sessionId = c.req.header('mcp-session-id');
  if (sessionId && sessionId.length > 128) {
    return c.json({ error: 'Invalid session id' }, 400);
  }
  let dataLayer: DataLayer;

  if (sessionId && sessionCache.has(sessionId)) {
    const cached = sessionCache.get(sessionId);
    if (!cached) return c.json({ error: 'Session not found' }, 400);
    cached.lastAccessAt = Date.now();
    dataLayer = cached.dataLayer;
  } else {
    // Build agent config + rooms
    let agentConfig: AgentConfig;
    let agentRooms: AgentRoom[];

    if (auth.agentConfig) {
      // Legacy agent token path — fetch rooms from auth server API
      agentConfig = auth.agentConfig;
      // In-process: look up rooms directly from DB
      const { rooms: ar } = await buildAgentConfigForUser(
        auth.userId,
        auth.permissions
      );
      agentRooms = filterRoomsForAgentConfig(ar, agentConfig);
    } else {
      // OAuth token path
      const built = await buildAgentConfigForUser(
        auth.userId,
        auth.permissions
      );
      agentConfig = built.agentConfig;
      agentRooms = built.rooms;
    }

    // Create DataLayer — it makes internal requests to the sync server
    dataLayer = new DataLayer(
      agentConfig,
      env.AUTH_SERVER_URL,
      auth.agentToken ?? `oauth-placeholder-${auth.userId}`,
      env.SYNC_SERVER_URL?.replace('ws://', 'http://').replace(
        'wss://',
        'https://'
      )
    );
    await dataLayer.init(agentRooms);

    if (sessionId) {
      sessionCache.set(sessionId, { dataLayer, lastAccessAt: Date.now() });
    }
  }

  // 3. Create MCP server + transport per request
  const mcpServer = new McpServer({
    name: 'eweser-mcp',
    version: '0.1.0',
  });

  const logFn = async (entry: {
    roomId: string;
    collectionKey: string;
    action: 'read' | 'write';
    documentCount?: number;
  }) => {
    if (auth.agentConfig) {
      await logAgentAccess({
        agentId: auth.agentConfig.id,
        userId: auth.userId,
        ...entry,
        documentCount: entry.documentCount ?? 0,
      });
    }
  };

  registerTools(mcpServer, dataLayer, logFn, env.AGGREGATOR_URL);

  const transport = new WebStandardStreamableHTTPServerTransport();
  await mcpServer.connect(transport);
  log.info({
    method: c.req.method,
    path: c.req.path,
    scope: auth.permissions,
    userId: auth.userId,
  });

  return transport.handleRequest(c.req.raw);
});
