import { Hono } from 'hono';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createFederationRouter } from './federation.js';
import { signRequest, type FederationSearchRequest } from '../federation/request-signing.js';
import type { PeerConfig } from '../federation/types.js';

const TRUSTED_PEER: PeerConfig = {
  label: 'trusted-peer',
  url: 'https://peer.example.com/api',
  secret: 'shared-secret',
};

describe('createFederationRouter', () => {
  const searchDocuments = vi.fn();
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route(
      '/api/federation',
      createFederationRouter({
        peers: [TRUSTED_PEER],
        searchDocuments,
      })
    );
    vi.clearAllMocks();
  });

  function makeSignedBody(overrides?: Partial<FederationSearchRequest>) {
    const body: FederationSearchRequest = {
      query: 'test query',
      timestamp: Date.now(),
      ...overrides,
    };
    const sig = signRequest(body, TRUSTED_PEER.secret);
    return { body, sig };
  }

  it('returns 401 when signature header is missing', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/federation/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test', timestamp: Date.now() }),
      })
    );
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'Missing federation signature',
    });
  });

  it('returns 403 when signature is invalid (wrong secret)', async () => {
    const body: FederationSearchRequest = {
      query: 'test',
      timestamp: Date.now(),
    };
    const sig = signRequest(body, 'wrong-secret');

    const res = await app.fetch(
      new Request('http://localhost/api/federation/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Eweser-Federation-Signature': sig,
        },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: 'Invalid federation signature',
    });
  });

  it('returns 400 for stale request (older than 5 minutes)', async () => {
    const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const { body, sig } = makeSignedBody({ timestamp: oldTimestamp });

    const res = await app.fetch(
      new Request('http://localhost/api/federation/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Eweser-Federation-Signature': sig,
        },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'Request too old',
    });
  });

  it('returns 400 when body is malformed', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/federation/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Eweser-Federation-Signature': 'any-signature',
        },
        body: 'not-json',
      })
    );
    expect(res.status).toBe(400);
  });

  it('accepts valid signed request and returns search results', async () => {
    searchDocuments.mockResolvedValueOnce([
      {
        id: 'doc-1',
        roomId: 'r1',
        collectionKey: 'notes',
        userId: null,
        documentData: { title: 'found doc' },
        updatedAt: new Date(),
      },
    ]);

    const { body, sig } = makeSignedBody();

    const res = await app.fetch(
      new Request('http://localhost/api/federation/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Eweser-Federation-Signature': sig,
        },
        body: JSON.stringify(body),
      })
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { results: unknown[]; total: number };
    expect(data.results).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(searchDocuments).toHaveBeenCalledWith({
      query: 'test query',
      limit: 50,
      offset: 0,
    });
  });

  it('passes collectionKey and custom limit/offset to search', async () => {
    searchDocuments.mockResolvedValueOnce([]);

    const { body, sig } = makeSignedBody({
      collectionKey: 'notes',
      limit: 25,
      offset: 10,
    });

    const res = await app.fetch(
      new Request('http://localhost/api/federation/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Eweser-Federation-Signature': sig,
        },
        body: JSON.stringify(body),
      })
    );

    expect(res.status).toBe(200);
    expect(searchDocuments).toHaveBeenCalledWith({
      query: 'test query',
      collectionKey: 'notes',
      limit: 25,
      offset: 10,
    });
  });

  it('returns 400 when query is missing', async () => {
    const body: FederationSearchRequest = {
      query: '',
      timestamp: Date.now(),
    };
    const sig = signRequest(body, TRUSTED_PEER.secret);

    const res = await app.fetch(
      new Request('http://localhost/api/federation/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Eweser-Federation-Signature': sig,
        },
        body: JSON.stringify(body),
      })
    );

    expect(res.status).toBe(400);
  });
});