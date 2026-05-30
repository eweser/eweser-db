/**
 * Types for federated room invite/accept/revoke API.
 *
 * Federated principals are explicit structured records keyed by
 * server domain and remote user id, not parsed user@server strings.
 * The origin server (where the room lives) is authoritative for
 * ACL/access-grant decisions; the peer server mirrors the record
 * so its user can see the pending invite in their UI.
 */
import type { RoomAccessType } from '../collections/index.js';

// ─── Inbound (peer receives from origin) ───────────────────────────

/** Body of a POST to /api/federation/remote/invite on the peer server. */
export type FederatedRemoteInviteBody = {
  token: string;
  serverDomain: string;
};

export type FederatedRemoteInviteResponse = {
  success: true;
  principalId: string;
};

/** Body of a POST to /api/federation/remote/accept on the origin server. */
export type FederatedRemoteAcceptBody = {
  token: string;
  serverDomain: string;
};

export type FederatedRemoteAcceptResponse = {
  success: true;
  principalId: string;
};

/** Body of a POST to /api/federation/remote/revoke. */
export type FederatedRemoteRevokeBody = {
  token: string;
  serverDomain: string;
};

export type FederatedRemoteRevokeResponse = {
  success: true;
};

// ─── Outbound (origin sends to peer) ───────────────────────────────

/** Body of POST /api/federation/submit-invite on the origin server. */
export type FederatedSubmitInviteBody = {
  roomId: string;
  remoteUserId: string;
  remoteServerDomain: string;
  accessType: RoomAccessType;
};

export type FederatedSubmitInviteResponse = {
  success: true;
  principalId: string;
};

/** A single federated principal as returned by the list endpoint. */
export type FederatedPrincipalRecord = {
  id: string;
  roomId: string;
  serverDomain: string;
  remoteUserId: string;
  accessLevel: 'read' | 'write' | 'admin';
  invitedBy: string | null;
  inviteStatus: 'pending' | 'accepted' | 'revoked';
  grantedAt: string;
  updatedAt: string | null;
  revokedAt: string | null;
};
