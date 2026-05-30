/**
 * Purpose: Federated room invite/accept/revoke endpoints for cross-server
 *          principal management.
 * Exports: federationRouter.
 * Touches: Federated principal CRUD, signed request verification, room ACL.
 * Read before editing: packages/auth-server-hono/src/INDEX.md and AGENTS.md.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { requireJwtAuth } from '../middleware/jwt-auth.js';
import { env } from '../env.js';
import {
  createFederatedPrincipal,
  getFederatedPrincipalsByRoom,
  getFederatedPrincipal,
  getFederatedPrincipalById,
  checkFederatedGrant,
  updateFederatedPrincipalStatus,
} from '../services/federation/principal.js';
import {
  createSignedRequest,
  verifySignedRequestFromServer,
  fetchPeerWellKnown,
  sendSignedRequestToPeer,
  generateRequestId,
} from '../services/federation/signed-request.js';
import type { SignedFederationPayload } from '../services/federation/signed-request.js';
import { getRoomById } from '../model/rooms/calls.js';
import { parseAccessGrantId } from '../model/access_grants.js';
import type {
  FederatedRemoteInviteBody,
  FederatedRemoteInviteResponse,
  FederatedRemoteAcceptResponse,
  FederatedRemoteRevokeResponse,
  FederatedPrincipalRecord,
} from '@eweser/shared';

// ─── Helpers ───────────────────────────────────────────────────────

const ACCESS_LEVELS = ['read', 'write', 'admin'] as const;

function principalToRecord(p: {
  id: string;
  roomId: string;
  serverDomain: string;
  remoteUserId: string;
  accessLevel: string;
  invitedBy: string | null;
  inviteStatus: string;
  grantedAt: Date;
  updatedAt: Date | null;
  revokedAt: Date | null;
}): FederatedPrincipalRecord {
  return {
    id: p.id,
    roomId: p.roomId,
    serverDomain: p.serverDomain,
    remoteUserId: p.remoteUserId,
    accessLevel: p.accessLevel as FederatedPrincipalRecord['accessLevel'],
    invitedBy: p.invitedBy,
    inviteStatus: p.inviteStatus as FederatedPrincipalRecord['inviteStatus'],
    grantedAt: p.grantedAt.toISOString(),
    updatedAt: p.updatedAt?.toISOString() ?? null,
    revokedAt: p.revokedAt?.toISOString() ?? null,
  };
}

function validateAccessLevel(s: string): 'read' | 'write' | 'admin' {
  if (!ACCESS_LEVELS.includes(s as 'read' | 'write' | 'admin')) {
    throw new Error(`Invalid access level: ${s}`);
  }
  return s as 'read' | 'write' | 'admin';
}

export const federationRouter = new Hono();

// ─── Remote inbound (peer server receives from origin server) ──────

/**
 * POST /api/federation/remote/invite
 *
 * Receives a signed federated invite from an origin server.
 * Server A invites user@server-b to room X on Server A.
 * Server A signs the request; Server B verifies the signature and
 * stores a pending principal record so its user sees the invite.
 */
federationRouter.post('/remote/invite', async (c) => {
  const body = (await c.req.json()) as FederatedRemoteInviteBody;

  if (!body.token || !body.serverDomain) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  let payload: SignedFederationPayload;
  try {
    payload = verifySignedRequestFromServer(
      { token: body.token, serverDomain: body.serverDomain },
      body.serverDomain
    );
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Invalid signature' },
      403
    );
  }

  if (payload.action !== 'invite') {
    return c.json({ error: 'Unexpected action in invite endpoint' }, 400);
  }
  if (!payload.accessLevel) {
    return c.json({ error: 'Missing access level in invite payload' }, 400);
  }

  try {
    const principal = await createFederatedPrincipal({
      roomId: payload.roomId,
      serverDomain: payload.issuerDomain,
      remoteUserId: payload.remoteUserId,
      accessLevel: validateAccessLevel(payload.accessLevel),
      invitedBy: null,
    });
    const response: FederatedRemoteInviteResponse = {
      success: true,
      principalId: principal.id,
    };
    return c.json(response);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create record' },
      500
    );
  }
});

/**
 * POST /api/federation/remote/accept
 *
 * Receives a signed notification from the origin server that a remote
 * user has accepted their invite. Updates the peer-side mirror record
 * to 'accepted'.
 */
federationRouter.post('/remote/accept', async (c) => {
  const body = (await c.req.json()) as FederatedRemoteInviteBody;

  if (!body.token || !body.serverDomain) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  let payload: SignedFederationPayload;
  try {
    payload = verifySignedRequestFromServer(
      { token: body.token, serverDomain: body.serverDomain },
      body.serverDomain
    );
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Invalid signature' },
      403
    );
  }

  if (payload.action !== 'accept') {
    return c.json({ error: 'Unexpected action in accept endpoint' }, 400);
  }

  try {
    const existing = await getFederatedPrincipal({
      roomId: payload.roomId,
      serverDomain: payload.issuerDomain,
      remoteUserId: payload.remoteUserId,
    });

    if (!existing) {
      return c.json({ error: 'Pending invited principal not found' }, 404);
    }

    const updated = await updateFederatedPrincipalStatus(existing.id, 'accepted');
    const response: FederatedRemoteAcceptResponse = {
      success: true,
      principalId: updated.id,
    };
    return c.json(response);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to process accept' },
      500
    );
  }
});

/**
 * POST /api/federation/remote/revoke
 *
 * Receives a signed notification from the origin server that a federated
 * grant has been revoked (admin action or room deletion).
 */
federationRouter.post('/remote/revoke', async (c) => {
  const body = (await c.req.json()) as FederatedRemoteInviteBody;

  if (!body.token || !body.serverDomain) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  let payload: SignedFederationPayload;
  try {
    payload = verifySignedRequestFromServer(
      { token: body.token, serverDomain: body.serverDomain },
      body.serverDomain
    );
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Invalid signature' },
      403
    );
  }

  if (payload.action !== 'revoke') {
    return c.json({ error: 'Unexpected action in revoke endpoint' }, 400);
  }

  try {
    const existing = await getFederatedPrincipal({
      roomId: payload.roomId,
      serverDomain: payload.issuerDomain,
      remoteUserId: payload.remoteUserId,
    });

    if (existing) {
      await updateFederatedPrincipalStatus(existing.id, 'revoked');
    }

    // Idempotent: 200 even if already revoked or never existed
    const response: FederatedRemoteRevokeResponse = { success: true };
    return c.json(response);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to process revoke' },
      500
    );
  }
});

// ─── Outbound (origin server admin actions, require JWT auth) ──────

/**
 * POST /api/federation/submit-invite
 *
 * Local room admin submits a federated invite for a user on a remote server.
 * Creates a local principal record (status: pending), sends a signed invite
 * to the remote server's /remote/invite endpoint.
 *
 * Requires room JWT.
 */
federationRouter.post('/submit-invite', requireJwtAuth, async (c) => {
  const roomIds = c.get('roomIds');

  const bodySchema = z.object({
    roomId: z.string().uuid(),
    remoteUserId: z.string().min(1),
    remoteServerDomain: z.string().min(1),
    accessType: z.enum(['read', 'write', 'admin']),
  });

  const parseResult = bodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400);
  }

  const { roomId, remoteUserId, remoteServerDomain, accessType } = parseResult.data;

  if (!roomIds.includes(roomId)) {
    return c.json({ error: 'Invalid room' }, 403);
  }

  const room = await getRoomById(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, 404);
  }

  // Fetch the remote server's well-known identity
  let peerFederationUrl: string;
  try {
    const peerIdentity = await fetchPeerWellKnown(remoteServerDomain);
    peerFederationUrl = peerIdentity.federationApiUrl;
  } catch {
    return c.json({ error: 'Failed to contact remote server. Is it federated?' }, 502);
  }

  // Create signed invite
  const envelope = createSignedRequest({
    action: 'invite',
    issuerDomain: env.AUTH_SERVER_DOMAIN,
    issuedAt: new Date().toISOString(),
    requestId: generateRequestId(),
    roomId,
    remoteUserId,
    accessLevel: accessType,
  });

  // Send to remote peer
  let remoteResponse: Response;
  try {
    remoteResponse = await sendSignedRequestToPeer(
      peerFederationUrl,
      '/api/federation/remote/invite',
      envelope
    );
  } catch {
    return c.json({ error: 'Failed to deliver invite to remote server' }, 502);
  }

  if (!remoteResponse.ok) {
    const remoteError = await remoteResponse.json().catch(() => ({}));
    return c.json(
      { error: `Remote server rejected invite: ${remoteError.error ?? remoteResponse.statusText}` },
      502
    );
  }

  // Create local principal record
  try {
    const accessGrantId = c.get('access_grant_id');
    const { ownerId } = parseAccessGrantId(accessGrantId);

    const principal = await createFederatedPrincipal({
      roomId,
      serverDomain: remoteServerDomain,
      remoteUserId,
      accessLevel: accessType,
      invitedBy: ownerId,
    });

    return c.json({ success: true, principalId: principal.id });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create local record' },
      500
    );
  }
});

/**
 * POST /api/federation/submit-accept-notification
 *
 * After a remote user accepts an invite on the origin server, send a signed
 * accept notification to the peer server so it can update its mirror record.
 * This is the "completion" step after the federated invite has been accepted.
 *
 * Non-fatal on peer failure (eventual consistency via relay).
 */
federationRouter.post('/submit-accept-notification', requireJwtAuth, async (c) => {
  const bodySchema = z.object({
    roomId: z.string().uuid(),
    remoteUserId: z.string().min(1),
    peerServerDomain: z.string().min(1),
  });

  const parseResult = bodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400);
  }

  const { roomId, remoteUserId, peerServerDomain } = parseResult.data;

  const principal = await checkFederatedGrant(roomId, peerServerDomain, remoteUserId, 'read');
  if (!principal) {
    return c.json({ error: 'No accepted federated principal found' }, 404);
  }

  let peerFederationUrl: string;
  try {
    const peerIdentity = await fetchPeerWellKnown(peerServerDomain);
    peerFederationUrl = peerIdentity.federationApiUrl;
  } catch {
    return c.json({ error: 'Failed to contact peer server' }, 502);
  }

  const envelope = createSignedRequest({
    action: 'accept',
    issuerDomain: env.AUTH_SERVER_DOMAIN,
    issuedAt: new Date().toISOString(),
    requestId: generateRequestId(),
    roomId,
    remoteUserId,
  });

  try {
    const peerResponse = await sendSignedRequestToPeer(
      peerFederationUrl,
      '/api/federation/remote/accept',
      envelope
    );
    if (!peerResponse.ok) {
      const peerError = await peerResponse.json().catch(() => ({}));
      return c.json(
        { error: `Peer rejected: ${peerError.error ?? peerResponse.statusText}` },
        502
      );
    }
  } catch {
    // Non-fatal: accept still works on origin, eventual consistency
  }

  return c.json({ success: true, principalId: principal.id });
});

/**
 * POST /api/federation/submit-revoke-notification
 *
 * After a federated grant is revoked, notify the peer server to update
 * its mirror record. Non-fatal on peer failure.
 */
federationRouter.post('/submit-revoke-notification', requireJwtAuth, async (c) => {
  const bodySchema = z.object({
    roomId: z.string().uuid(),
    remoteUserId: z.string().min(1),
    peerServerDomain: z.string().min(1),
  });

  const parseResult = bodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400);
  }

  const { roomId, remoteUserId, peerServerDomain } = parseResult.data;

  let peerFederationUrl: string;
  try {
    const peerIdentity = await fetchPeerWellKnown(peerServerDomain);
    peerFederationUrl = peerIdentity.federationApiUrl;
  } catch {
    return c.json({ error: 'Failed to contact peer server' }, 502);
  }

  const envelope = createSignedRequest({
    action: 'revoke',
    issuerDomain: env.AUTH_SERVER_DOMAIN,
    issuedAt: new Date().toISOString(),
    requestId: generateRequestId(),
    roomId,
    remoteUserId,
  });

  try {
    const peerResponse = await sendSignedRequestToPeer(
      peerFederationUrl,
      '/api/federation/remote/revoke',
      envelope
    );
    if (!peerResponse.ok) {
      const peerError = await peerResponse.json().catch(() => ({}));
      return c.json(
        { error: `Peer rejected: ${peerError.error ?? peerResponse.statusText}` },
        502
      );
    }
  } catch {
    // Non-fatal: eventual consistency
  }

  return c.json({ success: true });
});

// ─── Query endpoints ───────────────────────────────────────────────

/**
 * GET /api/federation/principals/:roomId
 *
 * Returns all federated principals for a room (requires room JWT).
 */
federationRouter.get('/principals/:roomId', requireJwtAuth, async (c) => {
  const roomId = c.req.param('roomId');
  const roomIds = c.get('roomIds');

  if (!roomIds.includes(roomId)) {
    return c.json({ error: 'Invalid room' }, 403);
  }

  const principals = await getFederatedPrincipalsByRoom(roomId);
  return c.json(principals.map(principalToRecord));
});
