import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './env.js';
import { accountRouter } from './routes/account.js';
import { agentsRouter } from './routes/agents.js';
import { authRouter } from './routes/auth.js';
import { accessGrantRouter } from './routes/access-grant.js';
import { oauthRouter, oauthServerMetadata } from './routes/oauth.js';
import { mcpRouter } from './routes/mcp.js';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/ping', (c) => c.text('pong'));

// OAuth 2.0 Authorization Server metadata (RFC 8414)
app.get('/.well-known/oauth-authorization-server', (c) =>
  c.json(oauthServerMetadata())
);

app.route('/api/account', accountRouter);
app.route('/api/auth', authRouter);
app.route('/api/access-grant', accessGrantRouter);
app.route('/api/agents', agentsRouter);
app.route('/oauth', oauthRouter);
app.route('/mcp', mcpRouter);

export { app };

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  // eslint-disable-next-line no-console -- intentional server startup log
  console.log(`Auth API running on port ${info.port}`);
});
