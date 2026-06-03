import { Hono } from 'hono';
import type { FederatedSearchResult } from '../federation/types.js';

type SearchDocument = {
  id: string;
  roomId: string;
  collectionKey: string;
  userId: string | null;
  documentData: unknown;
  updatedAt: Date;
};

type SearchRouteDeps = {
  searchDocuments: (params: {
    query: string;
    collectionKey?: string | undefined;
    limit?: number;
    offset?: number;
  }) => Promise<SearchDocument[]>;
  getDocumentsByRoom: (roomId: string) => Promise<SearchDocument[]>;
  /** Optional federated search. When provided, /search returns federated results. */
  federatedSearch?:
    | ((params: {
        query: string;
        collectionKey?: string | undefined;
        limit?: number;
        offset?: number;
      }) => Promise<FederatedSearchResult>)
    | undefined;
};

export function createSearchRouter(deps: SearchRouteDeps) {
  const router = new Hono();

  router.get('/search', async (c) => {
    const query = c.req.query('q')?.trim();
    const collectionKey = c.req.query('collection')?.trim() || undefined;
    const rawLimit = parseInt(c.req.query('limit') ?? '50', 10);
    const rawOffset = parseInt(c.req.query('offset') ?? '0', 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    if (!query) {
      return c.json({ error: 'Missing required query parameter: q' }, 400);
    }

    try {
      // If federated search is configured, add federated field alongside stable results
      if (deps.federatedSearch) {
        const result = await deps.federatedSearch({
          query,
          collectionKey,
          limit,
          offset,
        });
        return c.json(
          {
            results: result.local,
            federated: result.federated,
          },
          200
        );
      }

      // Fallback: local-only search (stable { results } shape)
      const results = await deps.searchDocuments({
        query,
        collectionKey,
        limit,
        offset,
      });
      return c.json({ results }, 200);
    } catch {
      return c.json({ error: 'Search failed' }, 500);
    }
  });

  router.get('/documents/:roomId', async (c) => {
    const roomId = c.req.param('roomId');
    try {
      const results = await deps.getDocumentsByRoom(roomId);
      return c.json({ results }, 200);
    } catch {
      return c.json({ error: 'Failed to fetch documents' }, 500);
    }
  });

  return router;
}
