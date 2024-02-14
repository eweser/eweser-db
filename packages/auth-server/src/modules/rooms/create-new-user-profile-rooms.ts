import { getProfileRoomsByUserId, insertRooms } from '@/model/rooms/calls';
import type { RoomInsert } from '@/model/rooms/validation';
import { getOrCreateToken } from '@/services/y-sweet/get-or-create-token';
import { AUTH_SERVER_URL } from '@/shared/constants';
import { v4 as uuid } from 'uuid';

export function createRoomId() {
  return `${AUTH_SERVER_URL}|${uuid()}`;
}

export function createProfileRoomId(
  userId: string,
  type: 'public' | 'private'
) {
  return `${AUTH_SERVER_URL}|${type}-profile-${userId}`;
}

export async function createNewUsersProfileRooms(userId: string) {
  const profiles = await getProfileRoomsByUserId(userId);

  const publicProfileId = createProfileRoomId(userId, 'public');
  const privateProfileId = createProfileRoomId(userId, 'private');

  const publicProfile = profiles.find((p) => p.id === publicProfileId);
  const privateProfile = profiles.find((p) => p.id === privateProfileId);
  if (publicProfile && privateProfile) {
    return;
  }
  const inserts: RoomInsert[] = [];

  if (!publicProfile) {
    const { token } = await getOrCreateToken(publicProfileId);
    inserts.push({
      id: publicProfileId,
      collectionKey: 'profiles',
      creator: userId,
      name: 'Public Profile',
      readAccess: [userId],
      writeAccess: [],
      adminAccess: [userId],
      public: true,
      token,
    });
  }
  if (!privateProfile) {
    const { token } = await getOrCreateToken(privateProfileId);
    inserts.push({
      id: privateProfileId,
      collectionKey: 'profiles',
      creator: userId,
      name: 'Private Profile',
      readAccess: [userId],
      writeAccess: [userId],
      adminAccess: [userId],
      public: false,
      token,
    });
  }

  const insertResult = await insertRooms(inserts);
  if (insertResult.length !== inserts.length) {
    throw new Error('Failed to insert profile rooms');
  }
  // TODO: send public room token to aggregators.
}
