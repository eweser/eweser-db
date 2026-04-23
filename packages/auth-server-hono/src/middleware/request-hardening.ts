import { createMiddleware } from 'hono/factory';
import { createLogger } from '@eweser/logger';
import { env } from '../env.js';

const log = createLogger('request-hardening');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWED_CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const DEFAULT_ALLOWED_CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Captcha-Response',
  'X-Auth-Identifier',
].join(', ');
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
  const isTrustedOrigin = Boolean(
    origin && env.AUTH_TRUSTED_ORIGINS.includes(origin)
  );

  if (method === 'OPTIONS') {
    const requestedMethod = c.req.header('access-control-request-method');
    if (requestedMethod) {
      if (!isTrustedOrigin || !origin) {
        return c.json({ error: 'Origin is not allowed' }, 403);
      }

      c.res.headers.set('Access-Control-Allow-Origin', origin);
      c.res.headers.set('Access-Control-Allow-Credentials', 'true');
      c.res.headers.set('Access-Control-Allow-Methods', ALLOWED_CORS_METHODS);
      c.res.headers.set(
        'Access-Control-Allow-Headers',
        c.req.header('access-control-request-headers') ??
          DEFAULT_ALLOWED_CORS_HEADERS
      );
      c.res.headers.set('Access-Control-Max-Age', '600');
      c.res.headers.set('Vary', 'Origin');
      return c.body(null, 204);
    }
  }

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
