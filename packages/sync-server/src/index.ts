import { Hocuspocus } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';
import { Webhook } from '@hocuspocus/extension-webhook';
import jwt from 'jsonwebtoken';
import { createLogger, initTelemetry } from '@eweser/logger';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

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

// Create Hocuspocus instance
const hocuspocus = new Hocuspocus({
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

// Create HTTP server
const server = createServer((req, res) => {
  log.info(`HTTP request: ${req.url}`);
  
  // Health check endpoint for Railway
  if (req.url === '/health' || req.url?.startsWith('/health')) {
    log.info('Health check request received');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  
  // For all other requests, return 404
  res.writeHead(404);
  res.end('Not found');
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections with Hocuspocus
wss.on('connection', (ws, req) => {
  log.info('WebSocket connection received');
  hocuspocus.handleConnection(ws, req, {});
});

// Start server - bind to 0.0.0.0 for Railway
server.listen(port, '0.0.0.0', () => {
  log.info(`Sync server running on port ${port}`);
});
