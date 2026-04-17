import { Hocuspocus } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';
import { Webhook } from '@hocuspocus/extension-webhook';
import jwt from 'jsonwebtoken';
import { createLogger, initTelemetry } from '@eweser/logger';
import express from 'express';
import expressWebsockets from 'express-ws';

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

// Configure Hocuspocus
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

// Setup Express with express-ws
const { app } = expressWebsockets(express());

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// WebSocket route for Hocuspocus
app.ws('/sync', (websocket, request) => {
  hocuspocus.handleConnection(websocket, request, {});
});

// Start the server
app.listen(port, () => {
  log.info(`Hocuspocus sync server running on port ${port}`);
});
