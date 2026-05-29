/**
 * Purpose: Aggregator Hono service entry point for public indexing and search.
 * Exports: Hono app and side-effect server startup outside tests.
 * Touches: Webhooks, indexed documents, search routes, CORS, federation, and telemetry.
 * Read before editing: packages/aggregator/INDEX.md and ARCHITECTURE.md.
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { db } from './db/client.js';
import { ensureIndexedDocumentsSchema } from './db/ensure-schema.js';
import {
  deleteIndexedDocumentsByRoom,
  agentSearchDocuments,
  getDocumentsByRoom,
  searchIndexedDocuments,
} from './db/queries.js';
import { upsertIndexedDocument } from './db/upsert.js';
import { env } from './env.js';
import { createAgentSearchRouter } from './routes/agent-search.js';
import { createDevTokenRouter } from './routes/dev-token.js';
import { createSearchRouter } from './routes/search.js';
import { createFederationRouter } from './routes/federation.js';
import { createWebhookHandler } from './webhook-handler.js';
import { loadPeers, federatedSearch } from './federation/index.js';
import type { FederatedSearchResult } from './federation/types.js';
import { createLogger, initTelemetry } from '@eweser/logger';

const log = createLogger('aggregator');

export const app = new Hono();

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  log.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: ms,
  });
});

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
    remove: async (roomId, collectionKey) => {
      await deleteIndexedDocumentsByRoom(db, {
        roomId,
        ...(collectionKey !== undefined ? { collectionKey } : {}),
      });
    },
    upsert: async (input) => {
      await upsertIndexedDocument(db, input);
    },
    ...(env.WEBHOOK_SECRET !== undefined ? { secret: env.WEBHOOK_SECRET } : {}),
  })
);

// Load trusted peers for federation
const trustedPeers = loadPeers(env.TRUSTED_PEERS);

const localSearch = async (params: {
  query: string;
  collectionKey?: string | undefined;
  limit?: number;
  offset?: number;
}) => {
  const qParams: {
    query: string;
    collectionKey?: string | undefined;
    limit?: number;
    offset?: number;
  } = { query: params.query };
  if (params.collectionKey !== undefined)
    qParams.collectionKey = params.collectionKey;
  if (params.limit !== undefined) qParams.limit = params.limit;
  if (params.offset !== undefined) qParams.offset = params.offset;
  return searchIndexedDocuments(db, qParams);
};

// Federated search: wire into search route if peers are configured
const federatedSearchFn =
  trustedPeers.length > 0
    ? async (params: {
        query: string;
        collectionKey?: string | undefined;
        limit?: number;
        offset?: number;
      }): Promise<FederatedSearchResult> => {
        return federatedSearch({ peers: trustedPeers, localSearch }, params);
      }
    : undefined;

app.route(
  '/api',
  createSearchRouter({
    searchDocuments: localSearch,
    getDocumentsByRoom: async (roomId) => getDocumentsByRoom(db, roomId),
    federatedSearch: federatedSearchFn,
  })
);

// Federation endpoint: receive search requests from trusted peers
// Always mounted so peers can reach you even when no outgoing peers are configured.
app.route(
  '/api/federation',
  createFederationRouter({
    peers: trustedPeers,
    searchDocuments: async (params) => {
      const qParams: {
        query: string;
        collectionKey?: string | undefined;
        limit?: number;
        offset?: number;
      } = { query: params.query };
      if (params.collectionKey !== undefined)
        qParams.collectionKey = params.collectionKey;
      if (params.limit !== undefined) qParams.limit = params.limit;
      if (params.offset !== undefined) qParams.offset = params.offset;
      return searchIndexedDocuments(db, qParams);
    },
  })
);

// Dev-only: token generator for the example app to authenticate against sync servers.
// Never mount in production.
if (process.env.NODE_ENV !== 'production') {
  app.route('/api', createDevTokenRouter());
}

// Agent-authenticated search endpoint — only mounted when auth server URL is configured
if (env.EWESER_AUTH_URL) {
  const authUrl = env.EWESER_AUTH_URL;
  app.route(
    '/api',
    createAgentSearchRouter({
      agentSearchDocuments: async (params) => agentSearchDocuments(db, params),
      verifyAgentToken: async (token) => {
        const res = await fetch(`${authUrl}/api/agents/verify-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          throw new Error(`Token verification failed: ${res.status}`);
        }
        const data = (await res.json()) as {
          agent: { id: string; allowedRooms: string[] };
        };
        return data.agent;
      },
    })
  );
}

export async function startServer() {
  await initTelemetry('aggregator');
  await ensureIndexedDocumentsSchema(db);
  serve({ fetch: app.fetch, port: env.PORT });

  log.info(`Aggregator server running on port ${env.PORT}`);
  if (trustedPeers.length > 0) {
    log.info(
      { peers: trustedPeers.map((p) => p.label) },
      `Federated search enabled with ${trustedPeers.length} trusted peer(s)`
    );
  }
}

if (process.env.NODE_ENV !== 'test') {
  void startServer().catch((error: unknown) => {
    log.error({ error }, 'Aggregator failed to start:');
    process.exit(1);
  });
}
