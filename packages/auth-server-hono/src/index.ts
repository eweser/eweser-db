/**
 * Purpose: Auth API runtime entry point and Hono route composition.
 * Exports: Hono app and side-effect server startup outside tests.
 * Touches: Auth, account, access-grant, OAuth, Connect AI, and MCP routes.
 * Read before editing: packages/auth-server-hono/INDEX.md and AGENTS.md.
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env.js';
import { requestHardening } from './middleware/request-hardening.js';
import { accountRouter } from './routes/account.js';
import { agentsRouter } from './routes/agents.js';
import { authRouter } from './routes/auth.js';
import { accessGrantRouter } from './routes/access-grant.js';
import { connectAiRouter } from './routes/connect-ai.js';
import { oauthRouter, oauthServerMetadata } from './routes/oauth.js';
import { mcpRouter } from './routes/mcp.js';
import { filesRouter } from './routes/files.js';
import { createLogger, initTelemetry } from '@eweser/logger';

await initTelemetry('auth-api');

const log = createLogger('auth-server');

export const app = new Hono();

function resolveAuthPagesOrigin() {
  const configured =
    process.env.AUTH_PAGES_URL ?? process.env.RAILWAY_SERVICE_AUTH_PAGES_URL;

  if (configured) {
    return configured.startsWith('http')
      ? configured.replace(/\/+$/, '')
      : `https://${configured.replace(/\/+$/, '')}`;
  }

  return env.AUTH_SERVER_URL.replace(/\/+$/, '');
}

function redirectToAuthPages(path: string, search = '') {
  return new URL(`${path}${search}`, `${resolveAuthPagesOrigin()}/`).toString();
}

function normalizeAuthPagesPath(path: string) {
  if (path === '/auth' || path === '/auth/') {
    return '/';
  }

  if (path.startsWith('/auth/')) {
    const stripped = path.slice('/auth'.length);
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }

  return path;
}

function isBrowserNavigation(method: string) {
  return method === 'GET' || method === 'HEAD';
}

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

app.use('*', async (c, next) => {
  if (!isBrowserNavigation(c.req.method)) {
    await next();
    return;
  }

  const requestUrl = new URL(c.req.url);

  if (c.req.path === '/' && requestUrl.searchParams.has('redirect')) {
    return c.redirect(redirectToAuthPages('/sign-in', requestUrl.search));
  }

  if (c.req.path === '/') {
    return c.redirect(redirectToAuthPages('/'));
  }

  if (c.req.path === '/auth' || c.req.path.startsWith('/auth/')) {
    return c.redirect(
      redirectToAuthPages(normalizeAuthPagesPath(c.req.path), requestUrl.search)
    );
  }

  await next();
});

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/ping', (c) => c.text('pong'));

// OAuth 2.0 Authorization Server metadata (RFC 8414)
app.get('/.well-known/oauth-authorization-server', (c) =>
  c.json(oauthServerMetadata())
);

app.route('/account', accountRouter);
app.route('/api/account', accountRouter);
app.route('/account/connect-ai', connectAiRouter);
app.route('/api/account/connect-ai', connectAiRouter);
app.route('/auth', authRouter);
app.route('/api/auth', authRouter);
app.route('/agents', agentsRouter);
app.route('/api/agents', agentsRouter);
app.route('/access-grants', accessGrantRouter);
app.route('/api/access-grant', accessGrantRouter);
app.route('/oauth', oauthRouter);
app.route('/mcp', mcpRouter);
app.route('/files', filesRouter);
app.route('/api/files', filesRouter);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  log.info(`Auth API running on port ${info.port}`);
});
