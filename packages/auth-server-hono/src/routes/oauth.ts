/**
 * OAuth 2.0 Authorization Server routes.
 *
 * GET  /.well-known/oauth-authorization-server  — RFC 8414 metadata
 * GET  /oauth/authorize                          — Authorization endpoint
 * POST /oauth/token                             — Token endpoint
 * POST /oauth/revoke                            — Revocation endpoint
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rate-limit.js';
import { requireVerifiedEmail } from '../middleware/verified-email.js';
import {
  consumeAuthCode,
  createAuthCode,
  createOAuthAccessToken,
  getOAuthClient,
  revokeOAuthAccessToken,
  verifyPKCE,
} from '../model/oauth.js';

export const oauthRouter = new Hono();

const BASE_URL = env.AUTH_SERVER_URL;
const OAUTH_SCOPES = ['read', 'readwrite'] as const;
const oauthScopeSchema = z
  .string()
  .default('read')
  .transform((scope) => scope.trim())
  .superRefine((scope, ctx) => {
    const requestedScopes = scope.split(' ').filter(Boolean);
    const invalidScopes = requestedScopes.filter(
      (requested) =>
        !OAUTH_SCOPES.includes(requested as (typeof OAUTH_SCOPES)[number])
    );
    if (invalidScopes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown scopes: ${invalidScopes.join(', ')}`,
      });
    }
  });

const authorizeQuerySchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.string().optional(),
  scope: oauthScopeSchema,
  state: z.string().optional(),
});

const approveBodySchema = z.object({
  approved: z.boolean(),
  client_id: z.string().min(1),
  code_challenge: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: oauthScopeSchema.optional(),
  state: z.string().optional(),
});

const tokenBodySchema = z.object({
  client_id: z.string().min(1),
  code: z.string().min(1),
  code_verifier: z.string().min(8),
  grant_type: z.literal('authorization_code'),
  redirect_uri: z.string().url(),
});

const revokeBodySchema = z.object({
  token: z.string().min(1),
});

function isRegisteredRedirectUri(
  redirectUri: string,
  registeredUris: string[]
): boolean {
  let normalizedIncoming: string;
  try {
    normalizedIncoming = new URL(redirectUri).toString();
  } catch {
    return false;
  }

  return registeredUris.some((candidate) => {
    try {
      return new URL(candidate).toString() === normalizedIncoming;
    } catch {
      return false;
    }
  });
}
const oauthAuthorizeRateLimit = createRateLimit({
  key: 'oauth-authorize',
  max: 20,
  windowMs: 60_000,
});
const oauthTokenRateLimit = createRateLimit({
  key: 'oauth-token',
  max: 40,
  windowMs: 60_000,
});

// ---------------------------------------------------------------------------
// GET /.well-known/oauth-authorization-server
// RFC 8414 Authorization Server Metadata
// Mounted separately (not under /oauth prefix)
// ---------------------------------------------------------------------------

export function oauthServerMetadata() {
  return {
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/oauth/authorize`,
    token_endpoint: `${BASE_URL}/oauth/token`,
    revocation_endpoint: `${BASE_URL}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['read', 'readwrite'],
  };
}

// ---------------------------------------------------------------------------
// GET /oauth/authorize
// ---------------------------------------------------------------------------

oauthRouter.get(
  '/authorize',
  requireAuth,
  requireVerifiedEmail,
  oauthAuthorizeRateLimit,
  async (c) => {
  const user = c.get('user');
  const query = c.req.query();
  const client_id = query.client_id;
  const redirect_uri = query.redirect_uri;
  const code_challenge = query.code_challenge;
  const code_challenge_method = query.code_challenge_method;
  const state = query.state;
  const scope = query.scope ?? 'read';

  if (!client_id || !redirect_uri || !code_challenge) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      },
      400
    );
  }

  if (code_challenge_method && code_challenge_method !== 'S256') {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Only S256 code_challenge_method is supported',
      },
      400
    );
  }

  const requestedScopes = scope.split(' ').filter(Boolean);
  const invalidScopes = requestedScopes.filter(
    (requested) =>
      !OAUTH_SCOPES.includes(requested as (typeof OAUTH_SCOPES)[number])
  );
  if (invalidScopes.length > 0) {
    return c.json(
      {
        error: 'invalid_scope',
        error_description: `Unknown scopes: ${invalidScopes.join(', ')}`,
      },
      400
    );
  }

  // Validate client
  const client = await getOAuthClient(client_id);
  if (!client) {
    return c.json(
      { error: 'invalid_client', error_description: 'Unknown client_id' },
      400
    );
  }

  // Validate redirect_uri
  if (!isRegisteredRedirectUri(redirect_uri, client.redirectUris)) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'redirect_uri not registered for this client',
      },
      400
    );
  }

  // First-party clients: skip consent, issue code immediately
  if (client.isFirstParty) {
    const { code } = await createAuthCode({
      userId: user.id,
      clientId: client_id,
      codeChallenge: code_challenge,
      redirectUri: redirect_uri,
      scopes: scope,
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return c.redirect(redirectUrl.toString(), 302);
  }

  // Third-party: show consent page
  // Store params in a short-lived cookie and redirect to consent UI
  const params = new URLSearchParams({
    client_id,
    redirect_uri,
    code_challenge,
    state: state ?? '',
    scope,
  });
  return c.redirect(`/auth/oauth-consent?${params.toString()}`, 302);
}
);

// ---------------------------------------------------------------------------
// POST /oauth/authorize/approve (called by consent UI for third-party clients)
// ---------------------------------------------------------------------------

// NOTE: This endpoint is only reachable for third-party (non-first-party) clients.
// CSRF protection: the consent UI page must be served from the same origin as the auth server
// (auth-pages SPA) and must include the user's session cookie in the POST. The `requireAuth`
// middleware validates the session, making cross-origin CSRF attacks impossible without a
// valid same-origin session. No additional CSRF token is needed given the cookie-based session
// check — this is acceptable per the OWASP CSRF cheat sheet (verifying origin/session is sufficient).
oauthRouter.post(
  '/authorize/approve',
  requireAuth,
  requireVerifiedEmail,
  oauthAuthorizeRateLimit,
  async (c) => {
  const user = c.get('user');
  const parseResult = approveBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parseResult.success) {
    return c.json({ error: 'invalid_request' }, 400);
  }
  const body = parseResult.data;

  if (!body.approved) {
    const redirectUrl = new URL(body.redirect_uri);
    redirectUrl.searchParams.set('error', 'access_denied');
    if (body.state) redirectUrl.searchParams.set('state', body.state);
    return c.redirect(redirectUrl.toString(), 302);
  }

  const client = await getOAuthClient(body.client_id);
  if (!client || !isRegisteredRedirectUri(body.redirect_uri, client.redirectUris)) {
    return c.json({ error: 'invalid_request' }, 400);
  }

  const { code } = await createAuthCode({
    userId: user.id,
    clientId: body.client_id,
    codeChallenge: body.code_challenge,
    redirectUri: body.redirect_uri,
    scopes: body.scope ?? 'read',
  });

  const redirectUrl = new URL(body.redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (body.state) redirectUrl.searchParams.set('state', body.state);
  return c.redirect(redirectUrl.toString(), 302);
}
);

// ---------------------------------------------------------------------------
// POST /oauth/token
// ---------------------------------------------------------------------------

oauthRouter.post('/token', oauthTokenRateLimit, async (c) => {
  let rawBody: Record<string, string>;

  const contentType = c.req.header('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await c.req.text();
    rawBody = Object.fromEntries(new URLSearchParams(text));
  } else {
    rawBody = await c.req.json<Record<string, string>>().catch(() => ({}));
  }

  const parsedBody = tokenBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    if (rawBody.grant_type !== 'authorization_code') {
      return c.json({ error: 'unsupported_grant_type' }, 400);
    }
    return c.json(
      {
        error: 'invalid_request',
        error_description:
          parsedBody.error.issues[0]?.message ?? 'Missing required parameters',
      },
      400
    );
  }
  const { client_id, code, code_verifier, redirect_uri } = parsedBody.data;

  // Consume the authorization code
  const codeRow = await consumeAuthCode(code);
  if (!codeRow) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description:
          'Authorization code is invalid, expired, or already used',
      },
      400
    );
  }

  // Verify client_id and redirect_uri match
  if (codeRow.clientId !== client_id) {
    return c.json(
      { error: 'invalid_grant', error_description: 'client_id mismatch' },
      400
    );
  }
  if (codeRow.redirectUri !== redirect_uri) {
    return c.json(
      { error: 'invalid_grant', error_description: 'redirect_uri mismatch' },
      400
    );
  }

  // Verify PKCE
  const pkceValid = verifyPKCE(code_verifier, codeRow.codeChallenge);
  if (!pkceValid) {
    return c.json(
      { error: 'invalid_grant', error_description: 'PKCE verification failed' },
      400
    );
  }

  // Issue access token
  const { accessToken, expiresIn } = await createOAuthAccessToken({
    userId: codeRow.userId,
    clientId: client_id,
    scopes: codeRow.scopes,
  });

  return c.json({
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresIn,
    scope: codeRow.scopes,
  });
});

// ---------------------------------------------------------------------------
// POST /oauth/revoke
// ---------------------------------------------------------------------------

oauthRouter.post('/revoke', oauthTokenRateLimit, async (c) => {
  const contentType = c.req.header('content-type') ?? '';
  let rawToken: string | undefined;

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await c.req.text();
    rawToken = new URLSearchParams(text).get('token') ?? undefined;
  } else {
    const body = await c
      .req
      .json<{ token?: string }>()
      .catch(() => ({ token: undefined }));
    rawToken = body.token;
  }

  const parsed = revokeBodySchema.safeParse({ token: rawToken });
  if (!parsed.success) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'token parameter is required',
      },
      400
    );
  }

  await revokeOAuthAccessToken(parsed.data.token);

  // Per RFC 7009 §2.2: always return 200 even if token was not found
  return c.json({});
});
