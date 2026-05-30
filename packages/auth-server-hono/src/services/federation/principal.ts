/**
 * Federated principal CRUD and authorization.
 *
 * Federated principals are explicit structured records for remote users
 * granted access to locally-owned rooms. The origin server (where the
 * room lives) is always authoritative for access decisions.
 *
 * For a room on this server ("local side"):
 *   - When the admin invites a user@remote-server, we create a record
 *     with invite_status: 'pending'
 *   - When the remote user authenticates and accepts, we update to 'accepted'
 *   - When the admin revokes or the room is deleted, status → 'revoked'
 *
 * For an invite sent TO this server ("peer side"):
 *   - Another server signed an invite for one of our users
 *   - We store a mirror record so our user sees the pending invite
 *   - When our user accepts via the origin server, the peer sends us a
 *     signed accept notification and we update accordingly
 */
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/drizzle.js';
import type { DBInstance } from '../../db/drizzle.js';
import {
  federatedPrincipals,
  type FederatedPrincipal,
  type FederatedPrincipalInsert,
} from '../../db/schema/federated_principals.js';

export type AccessLevel = 'read' | 'write' | 'admin';
export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export const ACCESS_LEVEL_HIERARCHY: Record<AccessLevel, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

/** Compare two access levels. Returns true if `provided` meets or exceeds `required`. */
export function satisfiesAccessLevel(
  provided: AccessLevel,
  required: AccessLevel
): boolean {
  return ACCESS_LEVEL_HIERARCHY[provided] >= ACCESS_LEVEL_HIERARCHY[required];
}

export interface CreateFederatedPrincipalParams {
  roomId: string;
  serverDomain: string;
  remoteUserId: string;
  accessLevel: AccessLevel;
  invitedBy?: string | null;
}

export interface FederatedPrincipalQuery {
  roomId: string;
  serverDomain: string;
  remoteUserId: string;
}

// ─── CRUD ──────────────────────────────────────────────────────────

/** Create a federated principal record. Handles unique constraint violations gracefully. */
export async function createFederatedPrincipal(
  params: CreateFederatedPrincipalParams
): Promise<FederatedPrincipal> {
  const insert: FederatedPrincipalInsert = {
    roomId: params.roomId,
    serverDomain: params.serverDomain,
    remoteUserId: params.remoteUserId,
    accessLevel: params.accessLevel,
    invitedBy: params.invitedBy ?? null,
  };

  const [record] = await db
    .insert(federatedPrincipals)
    .values(insert)
    .onConflictDoNothing()
    .returning();

  if (!record) {
    // Unique constraint hit — fetch the existing record
    const existing = await getFederatedPrincipal({
      roomId: params.roomId,
      serverDomain: params.serverDomain,
      remoteUserId: params.remoteUserId,
    });
    if (!existing) {
      throw new Error(
        'Unexpected conflict resolving federated principal — possible DB state corruption'
      );
    }
    return existing;
  }

  return record;
}

/** Get all federated principals for a room. */
export async function getFederatedPrincipalsByRoom(
  roomId: string,
  statusFilter?: InviteStatus
): Promise<FederatedPrincipal[]> {
  const conditions = [eq(federatedPrincipals.roomId, roomId)];
  if (statusFilter) {
    conditions.push(eq(federatedPrincipals.inviteStatus, statusFilter));
  }
  return await db
    .select()
    .from(federatedPrincipals)
    .where(and(...conditions));
}

/** Get a specific federated principal by (room, server, user). */
export async function getFederatedPrincipal(
  query: FederatedPrincipalQuery
): Promise<FederatedPrincipal | null> {
  const [result] = await db
    .select()
    .from(federatedPrincipals)
    .where(
      and(
        eq(federatedPrincipals.roomId, query.roomId),
        eq(federatedPrincipals.serverDomain, query.serverDomain),
        eq(federatedPrincipals.remoteUserId, query.remoteUserId)
      )
    );
  return result ?? null;
}

/** Get a principal by primary key. */
export async function getFederatedPrincipalById(
  id: string
): Promise<FederatedPrincipal | null> {
  const [result] = await db
    .select()
    .from(federatedPrincipals)
    .where(eq(federatedPrincipals.id, id));
  return result ?? null;
}

/** Update the invite status of a federated principal. */
export async function updateFederatedPrincipalStatus(
  id: string,
  status: InviteStatus
): Promise<FederatedPrincipal> {
  const update: Partial<FederatedPrincipalInsert> = {
    inviteStatus: status,
  };
  if (status === 'revoked') {
    update.revokedAt = new Date();
  }

  const [record] = await db
    .update(federatedPrincipals)
    .set(update)
    .where(eq(federatedPrincipals.id, id))
    .returning();

  if (!record) {
    throw new Error('Federated principal not found');
  }
  return record;
}

/** Revoke all federated principals for a room (used on room deletion). */
export async function revokeAllFederatedPrincipalsForRoom(
  roomId: string
): Promise<number> {
  const results = await db
    .update(federatedPrincipals)
    .set({ inviteStatus: 'revoked', revokedAt: new Date() })
    .where(
      and(
        eq(federatedPrincipals.roomId, roomId),
        eq(federatedPrincipals.inviteStatus, 'accepted'),
        eq(federatedPrincipals.inviteStatus, 'pending')
      )
    )
    .returning();
  return results.length;
}

// ─── Authorization ─────────────────────────────────────────────────

/**
 * Check whether a federated user (identified by server domain and remote user id)
 * has been granted at least the required access level for a room.
 *
 * Returns the matching principal if access is granted, null otherwise.
 */
export async function checkFederatedGrant(
  roomId: string,
  serverDomain: string,
  remoteUserId: string,
  requiredAccess: AccessLevel = 'read'
): Promise<FederatedPrincipal | null> {
  const principal = await getFederatedPrincipal({
    roomId,
    serverDomain,
    remoteUserId,
  });

  if (!principal) return null;
  if (principal.inviteStatus !== 'accepted') return null;
  if (!satisfiesAccessLevel(principal.accessLevel as AccessLevel, requiredAccess))
    return null;

  return principal;
}

// ─── Room ACL helpers ──────────────────────────────────────────────

/** Check if this user (local or federated) has at least write access to the room.
 *  This is the federated equivalent of checking rooms.writeAccess for local users. */
export async function hasWriteAccessViaFederation(
  roomId: string,
  serverDomain: string,
  remoteUserId: string
): Promise<boolean> {
  const grant = await checkFederatedGrant(roomId, serverDomain, remoteUserId, 'write');
  return grant !== null;
}

/** Check if this user (local or federated) has admin access to the room. */
export async function hasAdminAccessViaFederation(
  roomId: string,
  serverDomain: string,
  remoteUserId: string
): Promise<boolean> {
  const grant = await checkFederatedGrant(roomId, serverDomain, remoteUserId, 'admin');
  return grant !== null;
}
