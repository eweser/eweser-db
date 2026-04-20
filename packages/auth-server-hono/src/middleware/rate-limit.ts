import { createMiddleware } from 'hono/factory';
import { env } from '../env.js';

interface Counter {
  count: number;
  resetAt: number;
}

const counters = new Map<string, Counter>();
const lockouts = new Map<string, number>();

function nowMs() {
  return Date.now();
}

function sanitizeSegment(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? '').trim().toLowerCase().slice(0, 160);
  return normalized || fallback;
}

export function getClientIp(headers: Headers): string {
  if (env.TRUST_PROXY) {
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
      const firstHop = forwardedFor.split(',')[0];
      return sanitizeSegment(firstHop, 'unknown');
    }
  }
  return sanitizeSegment(headers.get('x-real-ip'), 'unknown');
}

function pruneMaps(now: number) {
  if (counters.size > 30_000) {
    for (const [key, value] of counters) {
      if (now > value.resetAt) counters.delete(key);
    }
  }
  if (lockouts.size > 30_000) {
    for (const [key, until] of lockouts) {
      if (now > until) lockouts.delete(key);
    }
  }
}

export function createRateLimit(options: {
  key: string;
  windowMs: number;
  max: number;
  discriminator?: (headers: Headers) => string;
}) {
  return createMiddleware(async (c, next) => {
    const now = nowMs();
    pruneMaps(now);

    const ip = getClientIp(c.req.raw.headers);
    const extra = options.discriminator?.(c.req.raw.headers) ?? '';
    const id = `${options.key}:${ip}:${sanitizeSegment(extra, '-')}`;
    const existing = counters.get(id);

    if (!existing || now > existing.resetAt) {
      counters.set(id, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.max) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      c.res.headers.set('Retry-After', String(Math.max(1, retryAfter)));
      return c.json({ error: 'Too many requests' }, 429);
    }

    await next();
  });
}

export function createAuthFailureBackoff(options: {
  key: string;
  lockThreshold: number;
  lockMs: number;
  windowMs: number;
  identifier: (req: Request) => string | null | Promise<string | null>;
}) {
  const failures = new Map<string, Counter>();

  function recordFailure(id: string, now: number) {
    const entry = failures.get(id);
    if (!entry || now > entry.resetAt) {
      failures.set(id, { count: 1, resetAt: now + options.windowMs });
      return;
    }
    entry.count += 1;
    if (entry.count >= options.lockThreshold) {
      lockouts.set(`${options.key}:${id}`, now + options.lockMs);
      failures.delete(id);
    }
  }

  function clearFailure(id: string) {
    failures.delete(id);
    lockouts.delete(`${options.key}:${id}`);
  }

  return createMiddleware(async (c, next) => {
    const id = await options.identifier(c.req.raw);
    if (!id) {
      await next();
      return;
    }

    const lockoutId = sanitizeSegment(id, 'unknown');
    const lockoutKey = `${options.key}:${lockoutId}`;
    const now = nowMs();
    const lockedUntil = lockouts.get(lockoutKey);
    if (lockedUntil && lockedUntil > now) {
      const retryAfter = Math.ceil((lockedUntil - now) / 1000);
      c.res.headers.set('Retry-After', String(Math.max(1, retryAfter)));
      return c.json({ error: 'Too many requests' }, 429);
    }

    await next();

    if (c.res.status >= 400) {
      recordFailure(lockoutId, now);
      return;
    }

    clearFailure(lockoutId);
  });
}
