import { Hono } from 'hono';
import { auth } from '../auth.js';
import {
  createAuthFailureBackoff,
  createRateLimit,
} from '../middleware/rate-limit.js';

/**
 * Mounts all better-auth endpoints under `/api/auth`.
 *
 * better-auth handles:
 *   POST /api/auth/sign-up/email
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-out
 *   GET  /api/auth/session
 *   GET  /api/auth/callback/:provider   (OAuth)
 *   ...and more
 */
export const authRouter = new Hono();

const signInRateLimit = createRateLimit({
  key: 'auth-sign-in',
  max: 10,
  windowMs: 60_000,
});

const signUpRateLimit = createRateLimit({
  key: 'auth-sign-up',
  max: 6,
  windowMs: 60_000,
});

const resetRequestRateLimit = createRateLimit({
  key: 'auth-reset-request',
  max: 6,
  windowMs: 60_000,
});

const resetCompleteRateLimit = createRateLimit({
  key: 'auth-reset-complete',
  max: 10,
  windowMs: 60_000,
});

const verificationResendRateLimit = createRateLimit({
  key: 'auth-verify-resend',
  max: 6,
  windowMs: 60_000,
});

async function extractSignInIdentifier(req: Request): Promise<string | null> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  const cloned = req.clone();

  if (contentType.includes('application/json')) {
    const body = (await cloned.json().catch(() => null)) as
      | { email?: unknown }
      | null;
    return typeof body?.email === 'string' ? body.email : null;
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await cloned.text().catch(() => '');
    const email = new URLSearchParams(body).get('email');
    return email;
  }

  return null;
}

const signInBackoff = createAuthFailureBackoff({
  key: 'auth-sign-in-backoff',
  lockThreshold: 6,
  lockMs: 15 * 60_000,
  windowMs: 10 * 60_000,
  identifier: extractSignInIdentifier,
});

authRouter.use('/sign-in/email', signInRateLimit, signInBackoff);
authRouter.use('/sign-up/email', signUpRateLimit);
authRouter.use('/request-password-reset', resetRequestRateLimit);
authRouter.use('/reset-password', resetCompleteRateLimit);
authRouter.use('/send-verification-email', verificationResendRateLimit);

function normalizedAuthError(pathname: string): string | null {
  if (pathname.endsWith('/sign-in/email')) {
    return 'Invalid credentials or verification required.';
  }
  if (pathname.endsWith('/sign-up/email')) {
    return 'Unable to create account with the provided details.';
  }
  if (pathname.endsWith('/request-password-reset')) {
    return 'If an account exists, password reset instructions were sent.';
  }
  return null;
}

authRouter.on(['GET', 'POST'], '/*', async (c) => {
  const res = await auth.handler(c.req.raw);
  const pathname = new URL(c.req.url).pathname;
  const replacement = normalizedAuthError(pathname);

  if (
    replacement &&
    c.req.method.toUpperCase() === 'POST' &&
    [400, 401, 403, 404, 429].includes(res.status)
  ) {
    const headers = new Headers(res.headers);
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({ error: replacement }), {
      headers,
      status: res.status,
    });
  }

  return res;
});
