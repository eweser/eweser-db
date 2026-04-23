import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env.js';
import { requestHardening } from './middleware/request-hardening.js';
import { accountRouter } from './routes/account.js';
import { agentsRouter } from './routes/agents.js';
import { authRouter } from './routes/auth.js';
import { accessGrantRouter } from './routes/access-grant.js';
import { oauthRouter, oauthServerMetadata } from './routes/oauth.js';
import { mcpRouter } from './routes/mcp.js';
import { createLogger, initTelemetry } from '@eweser/logger';

await initTelemetry('auth-api');

const log = createLogger('auth-server');

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) =>
      origin && env.AUTH_TRUSTED_ORIGINS.includes(origin) ? origin : '',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Captcha-Response',
      'X-Auth-Identifier',
    ],
    maxAge: 600,
  })
);
app.use('*', requestHardening);

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/ping', (c) => c.text('pong'));

// OAuth 2.0 Authorization Server metadata (RFC 8414)
app.get('/.well-known/oauth-authorization-server', (c) =>
  c.json(oauthServerMetadata())
);

app.route('/account', accountRouter);
app.route('/api/account', accountRouter);
app.route('/auth', authRouter);
app.route('/api/auth', authRouter);
app.route('/agents', agentsRouter);
app.route('/api/agents', agentsRouter);
app.route('/access-grants', accessGrantRouter);
app.route('/api/access-grant', accessGrantRouter);
app.route('/oauth', oauthRouter);
app.route('/mcp', mcpRouter);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  log.info(`Auth API running on port ${info.port}`);
});
