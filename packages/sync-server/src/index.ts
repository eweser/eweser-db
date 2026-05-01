/**
 * Purpose: Hocuspocus WebSocket sync relay entry point.
 * Exports: Side-effect server startup.
 * Touches: Yjs sync, SQLite persistence, JWT auth, and aggregator webhooks.
 * Read before editing: packages/sync-server/INDEX.md and ARCHITECTURE.md.
 */
import { Server } from '@hocuspocus/server';
import type { Extension } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';
import { Webhook } from '@hocuspocus/extension-webhook';
import jwt from 'jsonwebtoken';
import { createLogger, initTelemetry } from '@eweser/logger';

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
    new Webhook({
      url: aggregatorWebhookUrl,
      ...(webhookSecret ? { secret: webhookSecret } : {}),
    })
  );
}

// Hocuspocus responds 200 OK to all plain HTTP requests by default,
// so /health works without any custom onRequest hook.
const server = Server.configure({
  port,
  extensions,
  async onAuthenticate({ token }) {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const decoded = jwt.verify(token, secret) as {
        roomId: string;
        userId?: string;
        collectionKey?: string;
      };
      return {
        user: {
          id: decoded.userId || 'anonymous',
          name: decoded.userId || 'anonymous',
        },
        roomId: decoded.roomId,
        userId: decoded.userId,
        collectionKey: decoded.collectionKey,
      };
    } catch {
      throw new Error('Invalid token');
    }
  },
});

server.listen().then(() => {
  log.info(`Hocuspocus sync server running on port ${port}`);
});
