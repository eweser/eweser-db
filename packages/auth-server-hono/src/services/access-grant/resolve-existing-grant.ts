/**
 * Purpose: Fast-path grant satisfaction check — looks up an existing access grant
 * and mints a fresh token if the existing grant satisfies the request scope,
 * without creating or updating the grant.
 *
 * Key design: The satisfies() function is a pure check exported for unit testing.
 * resolveExistingGrant() is the full service that does DB lookup + token minting.
 */

import type { AccessGrant } from '../../model/access_grants.js';
import {
  createAccessGrantId,
  getAccessGrantById,
} from '../../model/access_grants.js';
import { createTokenFromAccessGrant } from './create-token-from-grant.js';

export interface ResolveGrantRequest {
  domain: string;
  redirect: string;
  collections: string[];
  roomIds: string[];
}

export interface ResolveGrantResult {
  satisfied: boolean;
  token?: string;
}

/**
 * Checks whether an existing grant satisfies the requested scope without
 * modifying any state. Returns { satisfied: true, token } on success,
 * { satisfied: false } when the grant does not exist, is invalid, or
 * does not cover the requested scope.
 */
export async function resolveExistingGrant(
  userId: string,
  request: ResolveGrantRequest
): Promise<ResolveGrantResult> {
  const grantId = createAccessGrantId(userId, request.domain);

  let existing: AccessGrant | undefined;
  try {
    existing = await getAccessGrantById(grantId);
  } catch {
    return { satisfied: false };
  }

  if (!satisfies(existing, request)) {
    return { satisfied: false };
  }

  const token = await createTokenFromAccessGrant(existing, request.domain);
  return { satisfied: true, token };
}

/**
 * Pure predicate: returns true when the given access grant covers the
 * requested domain, redirect, collections, and roomIds.
 *
 * Checks:
 *  - Grant is marked valid
 *  - Requester type is 'app'
 *  - Domain matches exactly
 *  - Grant has not expired (keepAliveDays from last update)
 *  - Redirect URL parses and its host matches the domain
 *  - Requested collections are a subset of the grant's collections
 *  - Requested roomIds are a subset of the grant's roomIds (unless
 *    the grant covers 'all' collections, which implies all rooms)
 */
export function satisfies(
  grant: AccessGrant,
  request: ResolveGrantRequest
): boolean {
  // 1. Grant must be valid
  if (!grant.isValid) return false;

  // 2. Only app-type grants are eligible for the app fast path
  if (grant.requesterType !== 'app') return false;

  // 3. Exact domain match
  if (grant.requesterId !== request.domain) return false;

  // 4. Grant not expired (based on keepAliveDays from the most recent timestamp)
  const lastUpdated = grant.updatedAt ?? grant.createdAt;
  const expiryMs = lastUpdated.getTime() + grant.keepAliveDays * 86400000;
  if (Date.now() > expiryMs) return false;

  // 5. Redirect URL validates against the domain
  try {
    const redirectUrl = new URL(request.redirect);
    if (redirectUrl.host !== request.domain) return false;
  } catch {
    return false;
  }

  // 6. Collections subset check
  const grantHasAll = grant.collections.includes('all');
  if (!grantHasAll) {
    // If the request asks for 'all' but the grant doesn't have it → no
    if (request.collections.includes('all')) return false;

    // Every requested collection must be in the grant's list
    const hasUncoveredCollection = request.collections.some(
      (c) => !grant.collections.includes(c)
    );
    if (hasUncoveredCollection) return false;
  }
  // If grant has 'all', any collection subset passes

  // 7. Room IDs subset check
  if (!grantHasAll && request.roomIds.length > 0) {
    const hasUncoveredRoomId = request.roomIds.some(
      (roomId) => !grant.roomIds.includes(roomId)
    );
    if (hasUncoveredRoomId) return false;
  }
  // Grant with 'all' collections implies all rooms are covered

  return true;
}
