import { Server } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';
import jwt from 'jsonwebtoken';

const port = parseInt(process.env.SYNC_PORT || '8080', 10);
const dbPath = process.env.SYNC_DB_PATH || '/data/sync.sqlite';
const secret = process.env.SYNC_AUTH_SECRET || 'test-secret';

const server = Server.configure({
  port,
  extensions: [new SQLite({ database: dbPath })],
  async onAuthenticate({ token }) {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const decoded = jwt.verify(token, secret) as {
        roomId: string;
        userId?: string;
      };
      return {
        user: {
          id: decoded.userId || 'anonymous',
          name: decoded.userId || 'anonymous',
        },
      };
    } catch {
      throw new Error('Invalid token');
    }
  },
});

server.listen().then(() => {
  // eslint-disable-next-line no-console -- intentional server startup log
  console.log(`Hocuspocus sync server running on port ${port}`);
});
