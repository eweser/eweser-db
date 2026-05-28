/**
 * Federation search endpoint — receives search requests from trusted peers.
 *
 * Mounted at POST /api/federation/search.
 * Verifies the HMAC signature of incoming requests before querying the local index.
 */

import { Hono } from 'hono';
import {
  type FederationSearchRequest,
  verifySignature,
} from '../federation/request-signing.js';
import type { PeerConfig } from '../federation/types.js';

type FederationRouteDeps = {
  peers: PeerConfig[];
  searchDocuments: (params: {
    query: string;
    collectionKey?: string;
    limit?: number;
    offset?: number;
  }) => Promise<unknown[]>;
};

export function createFederationRouter(deps: FederationRouteDeps) {
  const router = new Hono();

  router.post('/search', async (c) => {
    const sig = c.req.header('X-Eweser-Federation-Signature');
    if (!sig) {
      return c.json({ error: 'Missing federation signature' }, 401);
    }

    // Parse body
    let body: FederationSearchRequest;
    try {
      body = await c.req.json<FederationSearchRequest>();
    } catch {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    if (!body.query || typeof body.timestamp !== 'number') {
      return c.json(
        { error: 'Missing required fields: query, timestamp' },
        400
      );
    }

    // Verify the signature against any trusted peer's secret
    const matchedPeer = deps.peers.find((peer) => {
      try {
        return verifySignature(body, sig, peer.secret);
      } catch {
        return false;
      }
    });

    if (!matchedPeer) {
      return c.json({ error: 'Invalid federation signature' }, 403);
    }

    // Reject stale requests (older than 5 minutes)
    const maxAgeMs = 5 * 60 * 1000;
    if (Date.now() - body.timestamp > maxAgeMs) {
      return c.json({ error: 'Request too old' }, 400);
    }

    try {
      const searchParams: {
        query: string;
        collectionKey?: string;
        limit: number;
        offset: number;
      } = {
        query: body.query,
        limit: body.limit ?? 50,
        offset: body.offset ?? 0,
      };
      if (body.collectionKey !== undefined) {
        searchParams.collectionKey = body.collectionKey;
      }
      const results = await deps.searchDocuments(searchParams);

      return c.json(
        {
          results,
          total: results.length,
        },
        200
      );
    } catch {
      return c.json({ error: 'Search failed' }, 500);
    }
  });

  return router;
}
