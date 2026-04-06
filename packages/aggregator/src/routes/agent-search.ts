/**
 * Agent-authenticated POST /api/agent-search endpoint.
 * Accepts an agent bearer token, validates it against the auth server,
 * intersects requested room IDs with the agent's allowed rooms,
 * then runs PostgreSQL full-text search.
 */
import { Hono } from 'hono';
import type { AgentSearchResult, SearchFilters } from '../db/queries.js';

interface AgentConfig {
  id: string;
  allowedRooms: string[];
}

interface AgentSearchRouteDeps {
  agentSearchDocuments: (params: {
    query: string;
    roomIds: string[];
    filters?: SearchFilters;
    limit?: number;
  }) => Promise<AgentSearchResult[]>;
  verifyAgentToken: (token: string) => Promise<AgentConfig>;
}

export function createAgentSearchRouter(deps: AgentSearchRouteDeps) {
  const router = new Hono();

  router.post('/agent-search', async (c) => {
    // Extract bearer token
    const authHeader = c.req.header('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }
    const token = authHeader.slice(7);

    // Verify token against auth server and retrieve agent config
    let agentConfig: AgentConfig;
    try {
      agentConfig = await deps.verifyAgentToken(token);
    } catch {
      return c.json({ error: 'Invalid or expired agent token' }, 401);
    }

    // Parse request body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>)['query'] !== 'string'
    ) {
      return c.json({ error: 'Missing required field: query' }, 400);
    }

    const { query, roomIds: requestedRoomIds, filters } = body as {
      query: string;
      roomIds?: unknown;
      filters?: unknown;
    };

    if (!query.trim()) {
      return c.json({ error: 'query must not be empty' }, 400);
    }

    // Validate and intersect room IDs with agent's allowed rooms
    const agentAllowed = new Set(agentConfig.allowedRooms);
    let resolvedRoomIds: string[];

    if (Array.isArray(requestedRoomIds)) {
      // Only keep rooms the agent is actually allowed to access
      resolvedRoomIds = (requestedRoomIds as unknown[])
        .filter((id): id is string => typeof id === 'string' && agentAllowed.has(id));
    } else {
      // No room filter provided — search all agent's allowed rooms
      resolvedRoomIds = agentConfig.allowedRooms;
    }

    if (resolvedRoomIds.length === 0) {
      return c.json({ results: [] }, 200);
    }

    // Validate filters shape (permissive — unknown fields are ignored)
    const safeFilters: SearchFilters | undefined =
      filters && typeof filters === 'object' ? (filters as SearchFilters) : undefined;

    try {
      const results = await deps.agentSearchDocuments({
        query: query.trim(),
        roomIds: resolvedRoomIds,
        ...(safeFilters !== undefined ? { filters: safeFilters } : {}),
        limit: 10,
      });
      return c.json({ results }, 200);
    } catch (err) {
      console.error('[agent-search] Search error:', err);
      return c.json({ error: 'Search failed' }, 500);
    }
  });

  return router;
}
