import { Server } from '@hocuspocus/server';
import type { Extension } from '@hocuspocus/server';
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

const extensions: Extension[] = [new SQLite({ database: dbPath })];

if (aggregatorWebhookUrl) {
  extensions.push(
    new Webhook({
      url: aggregatorWebhookUrl,
      ...(webhookSecret ? { secret: webhookSecret } : {}),
    })
  );
}

const hocuspocus = Server.configure({
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

// Create HTTP server with health endpoint
const server = createServer((request, response) => {
  // Health check endpoint for Railway
  const url = request.url || '';
  if (url === '/health' || url.startsWith('/health?')) {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('OK');
    return;
  }
  
  // For WebSocket upgrade requests, let them through
  // Hocuspocus will handle them via the WebSocketServer
  response.writeHead(404);
  response.end('Not found');
});

// Create WebSocket server and attach Hocuspocus
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  hocuspocus.handleConnection(ws, req);
});

server.listen(port, () => {
  log.info(`Hocuspocus sync server running on port ${port}`);
});
