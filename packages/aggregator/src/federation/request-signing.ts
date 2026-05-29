/**
 * Request signing for federated peer requests.
 *
 * Simple HMAC-SHA256 signing using a shared secret per peer.
 * The receiving peer verifies the signature matches.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Payload sent in the signed federation request body. */
export interface FederationSearchRequest {
  query: string;
  collectionKey?: string;
  limit?: number;
  offset?: number;
  timestamp: number;
  /** Unique request id for replay protection. Optional — receiver enforces when present. */
  nonce?: string;
}

/** Sign a federation search request body. Returns the hex signature. */
export function signRequest(
  body: FederationSearchRequest,
  secret: string
): string {
  const payload = JSON.stringify(body);
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Create the full signed headers for a federation request. */
export function createSignedHeaders(
  body: FederationSearchRequest,
  secret: string
): Record<string, string> {
  const signature = signRequest(body, secret);
  return {
    'Content-Type': 'application/json',
    'X-Eweser-Federation-Signature': signature,
    'X-Eweser-Federation-Version': '1',
  };
}

/** Verify a federation request signature. Returns true if valid. */
export function verifySignature(
  body: FederationSearchRequest,
  signature: string,
  secret: string
): boolean {
  const expected = signRequest(body, secret);
  // Use timing-safe comparison
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}
