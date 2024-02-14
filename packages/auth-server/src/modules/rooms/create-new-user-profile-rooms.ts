import { getProfileRoomsByUserId, insertRooms } from '@/model/rooms/calls';
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

export async function getOrCreateNewUsersProfileRooms(userId: string) {
  const profiles = await getProfileRoomsByUserId(userId);

  const publicProfileId = createProfileRoomId(userId, 'public');
  const privateProfileId = createProfileRoomId(userId, 'private');

  let publicProfile = profiles.find((p) => p.id === publicProfileId);
  let privateProfile = profiles.find((p) => p.id === privateProfileId);
  if (publicProfile && privateProfile) {
    return { publicProfile, privateProfile };
  }

  if (!publicProfile) {
    const { token } = await getOrCreateToken(publicProfileId);
    const insertResult = await insertRooms([
      {
        id: publicProfileId,
        collectionKey: 'profiles',
        creator: userId,
        name: 'Public Profile',
        readAccess: [userId],
        writeAccess: [userId],
        adminAccess: [userId],
        public: true,
        token,
      },
    ]);
    if (insertResult.length !== 1) {
      throw new Error('Failed to insert public profile room');
    }
    publicProfile = insertResult[0];
  }
  if (!privateProfile) {
    const { token } = await getOrCreateToken(privateProfileId);
    const insertResult = await insertRooms([
      {
        id: privateProfileId,
        collectionKey: 'profiles',
        creator: userId,
        name: 'Private Profile',
        readAccess: [userId],
        writeAccess: [userId],
        adminAccess: [userId],
        public: false,
        token,
      },
    ]);
    if (insertResult.length !== 1) {
      throw new Error('Failed to insert private profile room');
    }
    privateProfile = insertResult[0];
  }
  if (publicProfile && privateProfile) {
    return { publicProfile, privateProfile };
  } else {
    throw new Error('Failed to create profile rooms');
  }
  // TODO: send public room token to aggregators.
}
