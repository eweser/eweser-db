/**
 * Purpose: Hocuspocus WebSocket sync relay entry point.
 * Exports: Side-effect server startup.
 * Touches: Yjs sync, SQLite persistence, JWT auth, and aggregator webhooks.
 * Read before editing: packages/sync-server/INDEX.md and ARCHITECTURE.md.
 */
import { Server } from '@hocuspocus/server';
import type { Extension } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';
import { createLogger, initTelemetry } from '@eweser/logger';
import { createAggregatorWebhookExtension } from './aggregator-webhook.js';
import { getCapabilitiesResponse } from './capabilities.js';
import { authenticateSyncConnection } from './sync-auth.js';

await initTelemetry('sync-server');

const log = createLogger('sync-server');

const port = parseInt(process.env.PORT || process.env.SYNC_PORT || '8080', 10);
const dbPath = process.env.SYNC_DB_PATH || '/data/sync.sqlite';
const secret = process.env.SYNC_AUTH_SECRET || 'test-secret';
const aggregatorWebhookUrl = process.env.AGGREGATOR_WEBHOOK_URL;
const webhookSecret = process.env.WEBHOOK_SECRET;

const extensions: Extension[] = [new SQLite({ database: dbPath })];

if (aggregatorWebhookUrl) {
  extensions.push(
    createAggregatorWebhookExtension({
      url: aggregatorWebhookUrl,
      onError: (error) => {
        log.error({ error }, 'Aggregator webhook failed');
      },
      ...(webhookSecret ? { secret: webhookSecret } : {}),
    })
  );
}

// Hocuspocus responds 200 OK to all plain HTTP requests by default,
// so /health works without any custom onRequest hook.
const server = Server.configure({
  port,
  extensions,
  async onRequest(data) {
    // Capability/version endpoint aligned with ADR-0010 surface.
    const { request, response } = data;
    const pathname = (request.url ?? '').split('?')[0];
    if (
      request.method === 'GET' &&
      (pathname === '/capabilities' || pathname === '/version')
    ) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify(
          getCapabilitiesResponse({
            webhooksEnabled: Boolean(aggregatorWebhookUrl),
          })
        )
      );
      return;
    }
  },
  async onAuthenticate({ connection, token }) {
    return authenticateSyncConnection({ connection, secret, token });
  },
});

server.listen().then(() => {
  log.info(`Hocuspocus sync server running on port ${port}`);
});
