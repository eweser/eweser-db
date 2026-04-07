import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentSearchRouter } from './agent-search.js';

describe('createAgentSearchRouter', () => {
  const agentSearchDocuments = vi.fn();
  const verifyAgentToken = vi.fn();
  let app: Hono;

  const VALID_TOKEN = 'tok_valid';
  const AGENT_CONFIG = {
    id: 'agent-1',
    allowedRooms: [
      'aaaaaaaa-0000-0000-0000-000000000001',
      'aaaaaaaa-0000-0000-0000-000000000002',
    ],
  };

  beforeEach(() => {
    app = new Hono();
    app.route(
      '/api',
      createAgentSearchRouter({ agentSearchDocuments, verifyAgentToken })
    );
    vi.clearAllMocks();
    verifyAgentToken.mockResolvedValue(AGENT_CONFIG);
    agentSearchDocuments.mockResolvedValue([]);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/agent-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'hello' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when token verification fails', async () => {
    verifyAgentToken.mockRejectedValueOnce(new Error('invalid token'));
    const res = await app.fetch(
      new Request('http://localhost/api/agent-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer bad_token`,
        },
        body: JSON.stringify({ query: 'hello' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when query is missing', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/agent-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VALID_TOKEN}`,
        },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('query'),
    });
  });

  it('searches all agent rooms when no roomIds provided', async () => {
    const mockResults = [
      {
        id: 'doc-1',
        _ref: 'conversations.aaaaaaaa-0000-0000-0000-000000000001.doc-1',
        title: 'Decision: Hono over Express',
        collectionKey: 'conversations',
        roomId: 'aaaaaaaa-0000-0000-0000-000000000001',
        snippet: 'We decided to use Hono...',
        score: 1.5,
        memoryType: 'decision',
      },
    ];
    agentSearchDocuments.mockResolvedValueOnce(mockResults);

    const res = await app.fetch(
      new Request('http://localhost/api/agent-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VALID_TOKEN}`,
        },
        body: JSON.stringify({ query: 'Hono framework decision' }),
      })
    );

    expect(res.status).toBe(200);
    expect(agentSearchDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Hono framework decision',
        roomIds: AGENT_CONFIG.allowedRooms,
        limit: 10,
      })
    );
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual(mockResults);
  });

  it('filters roomIds to only agent-allowed rooms', async () => {
    const ALLOWED_ROOM = 'aaaaaaaa-0000-0000-0000-000000000001';
    const DISALLOWED_ROOM = 'ffffffff-0000-0000-0000-000000000099';

    const res = await app.fetch(
      new Request('http://localhost/api/agent-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VALID_TOKEN}`,
        },
        body: JSON.stringify({
          query: 'test',
          roomIds: [ALLOWED_ROOM, DISALLOWED_ROOM],
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(agentSearchDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        roomIds: [ALLOWED_ROOM], // disallowed room stripped
      })
    );
  });

  it('returns empty results when no room IDs remain after filtering', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/agent-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VALID_TOKEN}`,
        },
        body: JSON.stringify({
          query: 'test',
          roomIds: ['ffffffff-0000-0000-0000-000000000099'], // not in agent's allowed rooms
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual([]);
    expect(agentSearchDocuments).not.toHaveBeenCalled();
  });

  it('passes filters through to agentSearchDocuments', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/agent-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VALID_TOKEN}`,
        },
        body: JSON.stringify({
          query: 'auth',
          filters: {
            collectionKey: ['conversations'],
            memoryType: ['decision'],
            tags: ['auth-server'],
          },
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(agentSearchDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          collectionKey: ['conversations'],
          memoryType: ['decision'],
          tags: ['auth-server'],
        },
      })
    );
  });
});
