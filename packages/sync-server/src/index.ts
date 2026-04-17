import { Server } from '@hocuspocus/server';
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

const extensions = [new SQLite({ database: dbPath })];

if (aggregatorWebhookUrl) {
  extensions.push(
    new Webhook({
      url: aggregatorWebhookUrl,
      ...(webhookSecret ? { secret: webhookSecret } : {}),
    })
  );
}

// Use Server.configure which sets up HTTP server internally
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
  // Handle HTTP requests - including health checks
  async onRequest({ request, response }) {
    const url = request.url || '';
    log.info(`onRequest: ${url}`);
    
    // Health check endpoint for Railway
    if (url === '/health' || url.startsWith('/health')) {
      log.info('Health check - returning 200 OK');
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('OK');
      // Throw empty error to stop hook chain (as per Hocuspocus docs)
      throw new Error();
    }
    // Let other hooks handle the request
  },
});

server.listen().then(() => {
  log.info(`Hocuspocus sync server running on port ${port}`);
});
