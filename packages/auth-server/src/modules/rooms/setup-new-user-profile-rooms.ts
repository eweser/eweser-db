import { insertRooms } from '@/model/rooms/calls';
import type { RoomInsert } from '@/model/rooms/validation';
import { getOrCreateToken } from '@/services/y-sweet/get-or-create-token';
import { AUTH_SERVER_URL } from '@/shared/constants';
import { v4 as uuid } from 'uuid';

export function createRoomId() {
  return `${AUTH_SERVER_URL}|${uuid()}`;
}

export async function setUpNewUsersProfileRooms(userId: string) {
  const publicProfileRoom: RoomInsert = {
    id: createRoomId(),
    collectionKey: 'profiles',
    creator: userId,
    name: 'Public Profile',
    readAccess: [userId],
    writeAccess: [],
    adminAccess: [userId],
    public: true,
  };
  const privateProfileRoom: RoomInsert = {
    id: createRoomId(),
    collectionKey: 'profiles',
    creator: userId,
    name: 'Private Profile',
    readAccess: [userId],
    writeAccess: [userId],
    adminAccess: [userId],
    public: false,
  };

  const { token: publicProfileToken } = await getOrCreateToken(
    publicProfileRoom.id
  );
  const { token: privateProfileToken } = await getOrCreateToken(
    privateProfileRoom.id
  );

  publicProfileRoom.token = publicProfileToken;
  privateProfileRoom.token = privateProfileToken;

  const insertResult = await insertRooms([
    publicProfileRoom,
    privateProfileRoom,
  ]);
  if (insertResult.length !== 2) {
    throw new Error('Failed to insert profile rooms');
  }
  // TODO: send public room token to aggregators.
}
