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

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function parseFilters(
  rawFilters: unknown
): { filters: SearchFilters | undefined } | { error: string } {
  if (rawFilters === undefined) {
    return { filters: undefined };
  }

  if (
    typeof rawFilters !== 'object' ||
    rawFilters === null ||
    Array.isArray(rawFilters)
  ) {
    return { error: 'filters must be an object when provided' };
  }

  const raw = rawFilters as Record<string, unknown>;
  const filters: SearchFilters = {};

  if (raw.collectionKey !== undefined) {
    if (!isStringArray(raw.collectionKey)) {
      return { error: 'filters.collectionKey must be an array of strings' };
    }
    filters.collectionKey = raw.collectionKey;
  }

  if (raw.memoryType !== undefined) {
    if (!isStringArray(raw.memoryType)) {
      return { error: 'filters.memoryType must be an array of strings' };
    }
    filters.memoryType = raw.memoryType;
  }

  if (raw.agentId !== undefined) {
    if (typeof raw.agentId !== 'string') {
      return { error: 'filters.agentId must be a string' };
    }
    filters.agentId = raw.agentId;
  }

  if (raw.tags !== undefined) {
    if (!isStringArray(raw.tags)) {
      return { error: 'filters.tags must be an array of strings' };
    }
    filters.tags = raw.tags;
  }

  if (raw.dateFrom !== undefined) {
    if (typeof raw.dateFrom !== 'string') {
      return { error: 'filters.dateFrom must be a string' };
    }
    filters.dateFrom = raw.dateFrom;
  }

  if (raw.dateTo !== undefined) {
    if (typeof raw.dateTo !== 'string') {
      return { error: 'filters.dateTo must be a string' };
    }
    filters.dateTo = raw.dateTo;
  }

  return { filters };
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

    const {
      query,
      roomIds: requestedRoomIds,
      filters,
    } = body as {
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

    if (requestedRoomIds !== undefined && !isStringArray(requestedRoomIds)) {
      return c.json({ error: 'roomIds must be an array of strings' }, 400);
    }

    if (Array.isArray(requestedRoomIds)) {
      // Only keep rooms the agent is actually allowed to access
      resolvedRoomIds = requestedRoomIds.filter((id) => agentAllowed.has(id));
    } else {
      // No room filter provided — search all agent's allowed rooms
      resolvedRoomIds = agentConfig.allowedRooms;
    }

    if (resolvedRoomIds.length === 0) {
      return c.json({ results: [] }, 200);
    }

    const parsedFilters = parseFilters(filters);
    if ('error' in parsedFilters) {
      return c.json({ error: parsedFilters.error }, 400);
    }

    try {
      const results = await deps.agentSearchDocuments({
        query: query.trim(),
        roomIds: resolvedRoomIds,
        ...(parsedFilters.filters !== undefined
          ? { filters: parsedFilters.filters }
          : {}),
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
