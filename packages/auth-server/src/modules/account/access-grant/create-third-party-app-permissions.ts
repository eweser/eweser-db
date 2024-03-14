import type { LoginQueryOptions } from '@eweser/shared';
import type {
  AccessGrant,
  AccessGrantInsert,
  AccessGrantUpdate,
} from '../../../model/access_grants';
import {
  createAccessGrantId,
  getAccessGrantById,
  insertAccessGrants,
  updateAccessGrant,
} from '../../../model/access_grants';
import { db } from '../../../services/database';
import { createTokenFromAccessGrant } from './create-token-from-grant';

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
}: ThirdPartyAppPermissions) {
  const grantCreated = await db().transaction(async (dbInstance) => {
    const grantId = createAccessGrantId(userId, domain);
    let authServerAccessGrant: AccessGrant | undefined;

    try {
      authServerAccessGrant = await getAccessGrantById(grantId);
    } catch (error) {
      // ignore
    }

    if (!authServerAccessGrant) {
      const accessGrantInsert: AccessGrantInsert = {
        id: grantId,
        ownerId: userId,
        requesterId: domain,
        requesterType: 'app',
        collections,
        roomIds,
        isValid: true,
        keepAliveDays: keepAliveDays ?? 1,
      };
      const result = await insertAccessGrants([accessGrantInsert], dbInstance);
      if (result.length !== 1) {
        throw new Error('Failed to insert access grant');
      }
      authServerAccessGrant = result[0];
    } else {
      const accessGrantUpdate: AccessGrantUpdate = {
        id: grantId,
        collections,
        roomIds,
        isValid: true,
        keepAliveDays: keepAliveDays ?? 1,
      };

      authServerAccessGrant = await updateAccessGrant(
        accessGrantUpdate,
        dbInstance
      );
    }

    return authServerAccessGrant;
  });

  if (!grantCreated) {
    throw new Error('Failed to create access grant');
  }

  return createTokenFromAccessGrant(grantCreated, domain);
}
