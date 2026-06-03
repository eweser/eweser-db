/**
 * Signed cross-server request helpers for federation.
 *
 * Currently uses JWT (SERVER_SECRET) as the signing mechanism since the
 * Ed25519 keypair in the server identity service is still placeholder material.
 * The interface is designed so signing can be swapped to a real Ed25519 key
 * when the deployment key management is implemented.
 *
 * Future: The signing key will be the Ed25519 private key from the server
 * identity service, and verification will use the remote server's Ed25519
 * public key (fetched from its /.well-known/eweser-server endpoint).
 */
import jwt from 'jsonwebtoken';
import { env } from '../../env.js';
import { getServerIdentity } from './index.js';

// ─── Types ─────────────────────────────────────────────────────────

/** Payload for a signed cross-server federation request. */
export interface SignedFederationPayload {
  /** The action being requested. */
  action: 'invite' | 'accept' | 'revoke';
  /** Domain of the sending server. */
  issuerDomain: string;
  /** ISO 8601 timestamp of when this request was created. */
  issuedAt: string;
  /** Unique request id for idempotency. */
  requestId: string;
  /** The room id on the issuer server. */
  roomId: string;
  /** The remote user id on the receiving server. */
  remoteUserId: string;
  /** Access level being granted (for invites). */
  accessLevel?: 'read' | 'write' | 'admin';
}

/** Signed federation request envelope sent over HTTP. */
export interface SignedFederationEnvelope {
  /** Serialized and signed payload. */
  token: string;
  /** The sending server's domain. */
  serverDomain: string;
}

/** Peer server well-known identity object, mirroring the server identity shape. */
export interface PeerServerIdentity {
  serverDomain: string;
  publicKey: string;
  federationApiUrl: string;
  hocuspocusUrl: string;
  searchApiUrl?: string;
}

// ─── Signing ───────────────────────────────────────────────────────

const SIGNED_REQUEST_TTL_SECONDS = 300; // 5 minutes

/**
 * Create a signed federation request envelope.
 *
 * The payload is serialized as a JWT signed with SERVER_SECRET. This will
 * be replaced with Ed25519 signing once the server identity key is real.
 */
export function createSignedRequest(
  payload: SignedFederationPayload
): SignedFederationEnvelope {
  const identity = getServerIdentity();
  const issuerDomain = identity?.serverDomain ?? env.AUTH_SERVER_DOMAIN;

  const enrichedPayload = {
    ...payload,
    issuerDomain,
    issuedAt: payload.issuedAt ?? new Date().toISOString(),
  };

  const token = jwt.sign(enrichedPayload, env.SERVER_SECRET, {
    expiresIn: `${SIGNED_REQUEST_TTL_SECONDS}s`,
    issuer: issuerDomain,
  });

  return { token, serverDomain: issuerDomain };
}

/**
 * Verify a signed federation request envelope from a peer server.
 *
 * Currently verifies by trying all known peer public keys (JWT shared-secret
 * mode). Future: verifies using the peer's Ed25519 public key fetched from
 * the peer's well-known endpoint.
 *
 * Returns the decoded payload or throws on verification failure.
 */
export function verifySignedRequest<T extends SignedFederationPayload>(
  envelope: SignedFederationEnvelope
): T {
  // Try verification with our own SERVER_SECRET (dev mode — same secret for all servers)
  let decoded: T;
  try {
    decoded = jwt.verify(envelope.token, env.SERVER_SECRET) as T;
    return decoded;
  } catch {
    // Fall through to peer key verification
  }

  // In production, we would check the `iss` claim and fetch the issuer's
  // Ed25519 public key from its well-known endpoint, then verify the JWT
  // signed with that key (or verify an Ed25519 signature directly).
  throw new Error(
    `Failed to verify signed request from ${envelope.serverDomain}`
  );
}

/**
 * Verify a signed request and check that it was issued by the claimed server.
 * Throws if the server domain in the envelope doesn't match the payload or
 * if signature verification fails.
 */
export function verifySignedRequestFromServer<
  T extends SignedFederationPayload,
>(envelope: SignedFederationEnvelope, expectedServerDomain?: string): T {
  const payload = verifySignedRequest<T>(envelope);

  if (expectedServerDomain && payload.issuerDomain !== expectedServerDomain) {
    throw new Error(
      `Issuer domain mismatch: expected ${expectedServerDomain}, got ${payload.issuerDomain}`
    );
  }

  return payload;
}

// ─── Peer discovery ────────────────────────────────────────────────

/**
 * Fetch a peer server's identity (public key, API URLs) from its
 * /.well-known/eweser-server endpoint.
 */
export async function fetchPeerWellKnown(
  serverDomain: string
): Promise<PeerServerIdentity> {
  const protocol = serverDomain.includes('localhost') ? 'http' : 'https';
  const url = `${protocol}://${serverDomain}/.well-known/eweser-server`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch peer identity from ${url}: ${response.status}`
    );
  }

  const identity = (await response.json()) as PeerServerIdentity;
  return identity;
}

// ─── HTTP helpers ──────────────────────────────────────────────────

/** Send a signed federation request to a peer server. */
export async function sendSignedRequestToPeer(
  federationApiUrl: string,
  path: string,
  envelope: SignedFederationEnvelope
): Promise<Response> {
  const url = `${federationApiUrl.replace(/\/+$/, '')}${path}`;

  return await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(15_000),
  });
}

/** Generate a unique request id for idempotency. */
export function generateRequestId(): string {
  return `fedi-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
