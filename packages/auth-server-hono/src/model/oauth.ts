/**
 * OAuth 2.0 model — DB operations for clients, codes, and access tokens.
 */
import crypto from 'node:crypto';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import {
  oauthAccessTokens,
  oauthClients,
  oauthCodes,
} from '../db/schema/oauth.js';
import type {
  OAuthAccessToken,
  OAuthClient,
  OAuthCode,
} from '../db/schema/oauth.js';

export type { OAuthClient, OAuthCode, OAuthAccessToken };

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Generate a cryptographically random opaque token */
function generateToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

function generateClientId(): string {
  return `mcp_${crypto.randomUUID().replace(/-/g, '')}`;
}

/**
 * Verify a PKCE S256 code verifier against a stored code challenge.
 * Returns true if the verifier is valid.
 */
export function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string
): boolean {
  const computed = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  // Use timing-safe comparison
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export async function getOAuthClient(
  clientId: string
): Promise<OAuthClient | undefined> {
  const rows = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);
  return rows[0];
}

export async function registerOAuthClient(params: {
  clientName: string;
  redirectUris: string[];
  softwareId?: string;
  softwareVersion?: string;
}): Promise<OAuthClient> {
  const clientId = generateClientId();
  const rows = await db
    .insert(oauthClients)
    .values({
      clientId,
      clientName: params.clientName,
      isFirstParty: false,
      redirectUris: params.redirectUris,
      registrationSource: 'dynamic',
      softwareId: params.softwareId,
      softwareVersion: params.softwareVersion,
    })
    .returning();

  const client = rows[0];
  if (!client) {
    throw new Error('Failed to register OAuth client');
  }

  return client;
}

// ---------------------------------------------------------------------------
// Authorization codes
// ---------------------------------------------------------------------------

export interface CreateCodeParams {
  userId: string;
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  scopes: string;
}

export interface CreateCodeResult {
  code: string;
}

/** Create and store an authorization code. Returns the plaintext code. */
export async function createAuthCode(
  params: CreateCodeParams
): Promise<CreateCodeResult> {
  const code = generateToken();
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.insert(oauthCodes).values({
    codeHash,
    userId: params.userId,
    clientId: params.clientId,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: 'S256',
    redirectUri: params.redirectUri,
    scopes: params.scopes,
    expiresAt,
  });

  return { code };
}

/** Consume an authorization code. Returns the code row if valid, null otherwise. */
export async function consumeAuthCode(
  plaintextCode: string
): Promise<OAuthCode | null> {
  const codeHash = hashToken(plaintextCode);

  const rows = await db
    .select()
    .from(oauthCodes)
    .where(and(eq(oauthCodes.codeHash, codeHash), isNull(oauthCodes.usedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Check expiry
  if (row.expiresAt < new Date()) return null;

  // Mark as used
  await db
    .update(oauthCodes)
    .set({ usedAt: new Date() })
    .where(eq(oauthCodes.id, row.id));

  return row;
}

// ---------------------------------------------------------------------------
// Access tokens
// ---------------------------------------------------------------------------

export interface CreateAccessTokenResult {
  accessToken: string;
  expiresIn: number;
}

/** Issue a new OAuth access token. Returns the plaintext token. */
export async function createOAuthAccessToken(params: {
  userId: string;
  clientId: string;
  scopes: string;
}): Promise<CreateAccessTokenResult> {
  const accessToken = generateToken();
  const tokenHash = hashToken(accessToken);
  const expiresIn = 3600; // 1 hour
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await db.insert(oauthAccessTokens).values({
    tokenHash,
    userId: params.userId,
    clientId: params.clientId,
    scopes: params.scopes,
    expiresAt,
  });

  return { accessToken, expiresIn };
}

/** Look up a valid (not expired, not revoked) OAuth access token. */
export async function getValidOAuthAccessToken(
  plaintextToken: string
): Promise<OAuthAccessToken | null> {
  const tokenHash = hashToken(plaintextToken);

  const rows = await db
    .select()
    .from(oauthAccessTokens)
    .where(
      and(
        eq(oauthAccessTokens.tokenHash, tokenHash),
        isNull(oauthAccessTokens.revokedAt)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Check expiry
  if (row.expiresAt && row.expiresAt < new Date()) return null;

  return row;
}

/** Revoke an OAuth access token. */
export async function revokeOAuthAccessToken(
  plaintextToken: string
): Promise<void> {
  const tokenHash = hashToken(plaintextToken);
  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthAccessTokens.tokenHash, tokenHash));
}

export async function touchOAuthAccessToken(id: string): Promise<void> {
  await db
    .update(oauthAccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(oauthAccessTokens.id, id));
}

export async function getOAuthAccessTokensByUserId(
  userId: string,
  clientIds?: string[]
): Promise<OAuthAccessToken[]> {
  const baseWhere = and(
    eq(oauthAccessTokens.userId, userId),
    isNull(oauthAccessTokens.revokedAt)
  );

  return clientIds && clientIds.length > 0
    ? db
        .select()
        .from(oauthAccessTokens)
        .where(and(baseWhere, inArray(oauthAccessTokens.clientId, clientIds)))
        .orderBy(desc(oauthAccessTokens.createdAt))
    : db
        .select()
        .from(oauthAccessTokens)
        .where(baseWhere)
        .orderBy(desc(oauthAccessTokens.createdAt));
}

export async function revokeOAuthAccessTokensForUserClient(
  userId: string,
  clientId: string
): Promise<void> {
  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthAccessTokens.userId, userId),
        eq(oauthAccessTokens.clientId, clientId),
        isNull(oauthAccessTokens.revokedAt)
      )
    );
}
