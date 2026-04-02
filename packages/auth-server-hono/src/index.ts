import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './env.js';
import { accountRouter } from './routes/account.js';
import { authRouter } from './routes/auth.js';
import { accessGrantRouter } from './routes/access-grant.js';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/ping', (c) => c.text('pong'));

app.route('/api/account', accountRouter);
app.route('/api/auth', authRouter);
app.route('/api/access-grant', accessGrantRouter);

export { app };

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  // eslint-disable-next-line no-console -- intentional server startup log
  console.log(`Auth API running on port ${info.port}`);
});
