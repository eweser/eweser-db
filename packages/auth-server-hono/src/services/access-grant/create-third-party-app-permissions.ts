import type { LoginQueryOptions } from '@eweser/shared';
import type { AccessGrant } from '../../model/access_grants.js';
import {
  createAccessGrantId,
  getAccessGrantById,
  insertAccessGrants,
  updateAccessGrant,
} from '../../model/access_grants.js';
import { db } from '../../db/drizzle.js';
import { createTokenFromAccessGrant } from './create-token-from-grant.js';

export type ThirdPartyAppPermissions = {
  domain: string;
  userId: string;
  roomIds: string[];
  collections: LoginQueryOptions['collections'];
  keepAliveDays?: number;
};

export async function createOrUpdateThirdPartyAppPermissions({
  domain,
  userId,
  roomIds,
  collections,
  keepAliveDays,
}: ThirdPartyAppPermissions): Promise<string> {
  const grantCreated = await db.transaction(async (dbInstance) => {
    const grantId = createAccessGrantId(userId, domain);
    let existing: AccessGrant | undefined;

    try {
      existing = await getAccessGrantById(grantId, dbInstance);
    } catch {
      // not found — will create
    }

    if (!existing) {
      const result = await insertAccessGrants(
        [
          {
            id: grantId,
            ownerId: userId,
            requesterId: domain,
            requesterType: 'app',
            collections,
            roomIds,
            isValid: true,
            keepAliveDays: keepAliveDays ?? 1,
          },
        ],
        dbInstance
      );
      if (result.length !== 1) {
        throw new Error('Failed to insert access grant');
      }
      return result[0];
    }

    return await updateAccessGrant(
      {
        id: grantId,
        collections,
        roomIds,
        isValid: true,
        keepAliveDays: keepAliveDays ?? 1,
      },
      dbInstance
    );
  });

  if (!grantCreated) {
    throw new Error('Failed to create or update access grant');
  }

  return createTokenFromAccessGrant(grantCreated, domain);
}
