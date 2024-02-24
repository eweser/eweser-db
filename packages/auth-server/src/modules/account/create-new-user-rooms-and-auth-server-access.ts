import { v4 } from 'uuid';
import type { AccessGrant, AccessGrantInsert } from '../../model/access_grants';
import {
  createAccessGrantId,
  getAccessGrantById,
  insertAccessGrants,
} from '../../model/access_grants';
import {
  getProfileRoomsByUserIdForUpdate,
  insertRooms,
} from '../../model/rooms/calls';
import type { RoomInsert } from '../../model/rooms/validation';
import { db } from '../../services/database';
import { getOrCreateToken } from '../../services/y-sweet/get-or-create-token';
import { AUTH_SERVER_DOMAIN } from '../../shared/constants';

export async function createNewUserRoomsAndAuthServerAccess(
  userId: string
): Promise<{
  authServerAccessGrant: AccessGrant;
}> {
  return await db().transaction(async (dbInstance) => {
    const profiles = await getProfileRoomsByUserIdForUpdate(userId, dbInstance);

    const publicProfileName = 'Public Profile';
    const privateProfileName = 'Private Profile';

    let publicProfile = profiles.find((p) => p.name === publicProfileName);
    let privateProfile = profiles.find((p) => p.name === privateProfileName);

    const inserts: RoomInsert[] = [];

    if (!publicProfile) {
      const id = v4();
      const { token, url } = await getOrCreateToken(id);
      inserts.push({
        id,
        collectionKey: 'profiles',
        name: publicProfileName,
        publicAccess: 'read',
        readAccess: [userId, AUTH_SERVER_DOMAIN],
        writeAccess: [userId, AUTH_SERVER_DOMAIN],
        adminAccess: [userId, AUTH_SERVER_DOMAIN],
        token,
        ySweetUrl: url,
      });
    }
    if (!privateProfile) {
      const id = v4();
      const { token, url } = await getOrCreateToken(id);
      inserts.push({
        id,
        collectionKey: 'profiles',
        name: privateProfileName,
        publicAccess: 'private',
        readAccess: [userId, AUTH_SERVER_DOMAIN],
        writeAccess: [userId, AUTH_SERVER_DOMAIN],
        adminAccess: [userId, AUTH_SERVER_DOMAIN],
        token,
        ySweetUrl: url,
      });
    }

    if (inserts.length > 0) {
      const results = await insertRooms(inserts, userId, dbInstance);
      publicProfile = results.find((p) => p.name === publicProfileName);
      privateProfile = results.find((p) => p.name === privateProfileName);
    }

    if (!publicProfile || !privateProfile) {
      throw new Error('Failed to find or create profile rooms');
    }

    // Create an all access grant for the auth server
    const authServerAccessGrantId = createAccessGrantId(
      userId,
      AUTH_SERVER_DOMAIN
    );
    let authServerAccessGrant: AccessGrant | undefined;

    try {
      authServerAccessGrant = await getAccessGrantById(authServerAccessGrantId);
    } catch (error) {
      // ignore
    }

    if (!authServerAccessGrant) {
      const accessGrantInsert: AccessGrantInsert = {
        id: authServerAccessGrantId,
        ownerId: userId,
        requesterId: AUTH_SERVER_DOMAIN,
        requesterType: 'app',
        collections: ['all'],
        roomIds: [publicProfile.id, privateProfile.id],
        isValid: true,
        keepAliveDays: 365,
      };
      const result = await insertAccessGrants([accessGrantInsert], dbInstance);
      if (result.length !== 1) {
        throw new Error('Failed to insert access grant');
      }
      authServerAccessGrant = result[0];
    }
    if (!authServerAccessGrant) {
      throw new Error('Failed to create access grant');
    }

    return { authServerAccessGrant };
  });
  // TODO: send public room token to aggregators.
}
