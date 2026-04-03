import { Hono } from 'hono';

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
  }) => Promise<SearchDocument[]>;
  getDocumentsByRoom: (roomId: string) => Promise<SearchDocument[]>;
};

export function createSearchRouter(deps: SearchRouteDeps) {
  const router = new Hono();

  router.get('/search', async (c) => {
    const query = c.req.query('q')?.trim();
    const collectionKey = c.req.query('collection')?.trim();

    if (!query) {
      return c.json({ error: 'Missing required query parameter: q' }, 400);
    }

    const results = await deps.searchDocuments(
      collectionKey ? { query, collectionKey } : { query }
    );

    return c.json({ results }, 200);
  });

  router.get('/documents/:roomId', async (c) => {
    const roomId = c.req.param('roomId');
    const results = await deps.getDocumentsByRoom(roomId);
    return c.json({ results }, 200);
  });

  return router;
}
