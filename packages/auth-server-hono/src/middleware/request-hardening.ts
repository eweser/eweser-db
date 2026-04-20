import { createMiddleware } from 'hono/factory';
import { createLogger } from '@eweser/logger';
import { env } from '../env.js';

const log = createLogger('request-hardening');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'code',
  'password',
  'client_secret',
  'authorization',
]);

function sanitizeUrl(input: URL): string {
  const url = new URL(input.toString());
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
      url.searchParams.set(key, '[REDACTED]');
    }
  }
  return `${url.pathname}${url.search}`;
}

function hasOriginMismatch(origin: string | undefined): boolean {
  if (!origin) return false;
  return !env.AUTH_TRUSTED_ORIGINS.includes(origin);
}

export const requestHardening = createMiddleware(async (c, next) => {
  const start = Date.now();
  const method = c.req.method.toUpperCase();
  const origin = c.req.header('origin');
  const requestUrl = new URL(c.req.url);

  if (WRITE_METHODS.has(method) && hasOriginMismatch(origin)) {
    return c.json({ error: 'Origin is not allowed' }, 403);
  }

  await next();

  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'no-referrer');
  c.res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  log.info({
    duration_ms: Date.now() - start,
    method,
    origin: origin ?? null,
    path: sanitizeUrl(requestUrl),
    status: c.res.status,
    trust_proxy: env.TRUST_PROXY,
  });
});
