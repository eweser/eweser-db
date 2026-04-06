import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { db } from './db/client.js';
import { ensureIndexedDocumentsSchema } from './db/ensure-schema.js';
import { getDocumentsByRoom, searchIndexedDocuments } from './db/queries.js';
import { upsertIndexedDocument } from './db/upsert.js';
import { env } from './env.js';
import { createDevTokenRouter } from './routes/dev-token.js';
import { createSearchRouter } from './routes/search.js';
import { createWebhookHandler } from './webhook-handler.js';

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) =>
      /^https?:\/\/localhost(:\d+)?$/.test(origin ?? '') ? origin : null,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })
);

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/ping', (c) => c.text('pong'));

app.post(
  '/webhooks/hocuspocus',
  createWebhookHandler({
    upsert: async (input) => {
      await upsertIndexedDocument(db, input);
    },
    ...(env.WEBHOOK_SECRET !== undefined ? { secret: env.WEBHOOK_SECRET } : {}),
  })
);

app.route(
  '/api',
  createSearchRouter({
    searchDocuments: async ({ query, collectionKey, limit, offset }) =>
      await searchIndexedDocuments(db, {
        query,
        ...(collectionKey !== undefined ? { collectionKey } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(offset !== undefined ? { offset } : {}),
      }),
    getDocumentsByRoom: async (roomId) => await getDocumentsByRoom(db, roomId),
  })
);

// Dev-only: token generator for the example app to authenticate against sync servers.
// Never mount in production.
if (process.env.NODE_ENV !== 'production') {
  app.route('/api', createDevTokenRouter());
}

export async function startServer() {
  await ensureIndexedDocumentsSchema(db);
  serve({ fetch: app.fetch, port: env.PORT });
  // eslint-disable-next-line no-console -- intentional server startup log
  console.log(`Aggregator server running on port ${env.PORT}`);
}

if (process.env.NODE_ENV !== 'test') {
  void startServer().catch((error: unknown) => {
    // eslint-disable-next-line no-console -- intentional startup failure log
    console.error('Aggregator failed to start:', error);
    process.exit(1);
  });
}
