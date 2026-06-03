/**
 * Federation search endpoint — receives search requests from trusted peers.
 *
 * Mounted at POST /api/federation/search.
 * Verifies the HMAC signature of incoming requests before querying the local index.
 * Maintains a nonce cache for replay protection within the freshness window.
 */

import { Hono } from 'hono';
import {
  type FederationSearchRequest,
  verifySignature,
} from '../federation/request-signing.js';
import type { PeerConfig } from '../federation/types.js';

/** Maximum acceptable clock skew for timestamps (5 minutes). */
const MAX_SKEW_MS = 5 * 60 * 1000;

/**
 * Nonce cache to prevent replay attacks.
 * Stores nonce → insertion time pairs and periodically evicts entries
 * older than the freshness window.
 */
const nonceCache = new Map<string, number>();

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
    if (deps.peers.length === 0) {
      return c.json({ error: 'Federation not configured' }, 404);
    }

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

    // Reject stale or future-dated requests (absolute skew > freshness window)
    const skew = Math.abs(Date.now() - body.timestamp);
    if (skew > MAX_SKEW_MS) {
      return c.json({ error: 'Request timestamp skew too large' }, 400);
    }

    // Reject duplicate nonces (replay protection within freshness window)
    if (body.nonce) {
      // Evict stale entries opportunistically
      const cutoff = Date.now() - MAX_SKEW_MS;
      for (const [key, ts] of nonceCache) {
        if (ts < cutoff) nonceCache.delete(key);
      }
      if (nonceCache.has(body.nonce)) {
        return c.json({ error: 'Duplicate request (nonce already used)' }, 400);
      }
      nonceCache.set(body.nonce, Date.now());
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
