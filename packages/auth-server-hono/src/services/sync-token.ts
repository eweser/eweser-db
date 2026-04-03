import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export interface SyncTokenPayload {
  roomId: string;
  userId?: string;
  collectionKey?: string;
}

const TOKEN_VALID_MINUTES = 60; // 1 hour

/**
 * Generates a signed JWT for Hocuspocus authentication.
 * The sync server validates this token in its onAuthenticate hook.
 */
export function generateSyncToken(
  roomId: string,
  collectionKey?: string,
  userId?: string,
  validMinutes = TOKEN_VALID_MINUTES
): { token: string; expiry: Date } {
  const payload: SyncTokenPayload = {
    roomId,
    ...(collectionKey ? { collectionKey } : {}),
    ...(userId ? { userId } : {}),
  };
  const secret = env.SYNC_AUTH_SECRET ?? env.SERVER_SECRET;
  const token = jwt.sign(payload, secret, {
    expiresIn: `${validMinutes}m`,
  });
  const expiry = new Date(Date.now() + validMinutes * 60 * 1000);
  return { token, expiry };
}

/**
 * Verifies a Hocuspocus sync JWT and returns the payload.
 * Throws if invalid or expired.
 */
export function verifySyncToken(token: string): SyncTokenPayload {
  const secret = env.SYNC_AUTH_SECRET ?? env.SERVER_SECRET;
  return jwt.verify(token, secret) as SyncTokenPayload;
}
