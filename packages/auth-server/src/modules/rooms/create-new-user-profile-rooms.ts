import {
  getProfileRoomsByUserIdForUpdate,
  insertRooms,
} from '@/model/rooms/calls';
import type { RoomInsert } from '@/model/rooms/validation';
import { db } from '@/services/database';
import { getOrCreateToken } from '@/services/y-sweet/get-or-create-token';
import { v4 } from 'uuid';

export async function getOrCreateNewUsersProfileRooms(userId: string) {
  return await db().transaction(async (dbInstance) => {
    const profiles = await getProfileRoomsByUserIdForUpdate(userId, dbInstance);

    const publicProfileName = 'Public Profile';
    const privateProfileName = 'Private Profile';

    let publicProfile = profiles.find((p) => p.name === publicProfileName);
    let privateProfile = profiles.find((p) => p.name === privateProfileName);
    if (publicProfile && privateProfile) {
      return { publicProfile, privateProfile };
    }

    const inserts: RoomInsert[] = [];

    if (!publicProfile) {
      const id = v4();
      const { token } = await getOrCreateToken(id);
      inserts.push({
        id,
        collectionKey: 'profiles',
        name: publicProfileName,
        publicAccess: 'read',
        readAccess: [userId],
        writeAccess: [userId],
        adminAccess: [userId],
        token,
      });
    }
    if (!privateProfile) {
      const id = v4();
      const { token } = await getOrCreateToken(id);
      inserts.push({
        id,
        collectionKey: 'profiles',
        name: privateProfileName,
        publicAccess: 'private',
        readAccess: [userId],
        writeAccess: [userId],
        adminAccess: [userId],
        token,
      });
    }

    if (inserts.length > 0) {
      const results = await insertRooms(inserts, userId, dbInstance);
      publicProfile = results.find((p) => p.name === publicProfileName);
      privateProfile = results.find((p) => p.name === privateProfileName);
    }

    if (publicProfile && privateProfile) {
      return { publicProfile, privateProfile };
    } else {
      throw new Error('Failed to create profile rooms');
    }
  });
  // TODO: send public room token to aggregators.
}
