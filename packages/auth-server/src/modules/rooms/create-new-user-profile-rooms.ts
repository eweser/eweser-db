import { getProfileRoomsByUserId, insertRooms } from '@/model/rooms/calls';
import { getOrCreateToken } from '@/services/y-sweet/get-or-create-token';
import { v4 } from 'uuid';

export async function getOrCreateNewUsersProfileRooms(userId: string) {
  const profiles = await getProfileRoomsByUserId(userId);

  const publicProfileName = 'Public Profile';
  const privateProfileName = 'Private Profile';

  let publicProfile = profiles.find((p) => p.name === publicProfileName);
  let privateProfile = profiles.find((p) => p.name === privateProfileName);
  if (publicProfile && privateProfile) {
    return { publicProfile, privateProfile };
  }

  if (!publicProfile) {
    const id = v4();
    const { token } = await getOrCreateToken(id);
    const insertResult = await insertRooms(
      [
        {
          id,
          collectionKey: 'profiles',
          name: publicProfileName,
          publicAccess: 'read',
          readAccess: [userId],
          writeAccess: [userId],
          adminAccess: [userId],
          token,
        },
      ],
      userId
    );
    if (insertResult.length !== 1) {
      throw new Error('Failed to insert public profile room');
    }
    publicProfile = insertResult[0];
  }
  if (!privateProfile) {
    const id = v4();
    const { token } = await getOrCreateToken(id);
    const insertResult = await insertRooms(
      [
        {
          id,
          collectionKey: 'profiles',
          name: privateProfileName,
          publicAccess: 'private',
          readAccess: [userId],
          writeAccess: [userId],
          adminAccess: [userId],
          token,
        },
      ],
      userId
    );
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
