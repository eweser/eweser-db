import type { AcceptRoomInviteResponse } from '@eweser/shared';
import { getRoomById, updateRoom } from '../../model/rooms/calls.js';
import { db } from '../../db/drizzle.js';
import type { Room } from '../../db/schema/rooms.js';

export const roomNotFoundError = 'Room not found';
export const notAdminOfRoomError = 'You are not an admin of this room';

export type AcceptRoomInviteParams = {
  roomId: string;
  inviterId: string;
  accessType: string;
  userId: string;
};

export async function acceptRoomInvite({
  roomId,
  inviterId,
  accessType,
  userId,
}: AcceptRoomInviteParams): Promise<AcceptRoomInviteResponse> {
  return await db.transaction(async (dbInstance) => {
    const existingRoom = await getRoomById(roomId, dbInstance);
    if (!existingRoom) {
      throw new Error(roomNotFoundError);
    }
    if (!existingRoom.adminAccess.includes(inviterId)) {
      throw new Error(notAdminOfRoomError);
    }

    const writeAccess = [...existingRoom.writeAccess];
    const readAccess = [...existingRoom.readAccess];
    const adminAccess = [...existingRoom.adminAccess];

    if (accessType === 'write' && !writeAccess.includes(userId)) {
      writeAccess.push(userId);
    }
    if (accessType === 'read' && !readAccess.includes(userId)) {
      readAccess.push(userId);
    }
    if (accessType === 'admin' && !adminAccess.includes(userId)) {
      adminAccess.push(userId);
    }

    const unchanged =
      writeAccess.length === existingRoom.writeAccess.length &&
      readAccess.length === existingRoom.readAccess.length &&
      adminAccess.length === existingRoom.adminAccess.length;

    if (unchanged) {
      return roomToServerRoom(existingRoom);
    }

    const updated = await updateRoom(
      { id: roomId, writeAccess, readAccess, adminAccess },
      dbInstance
    );
    return roomToServerRoom(updated);
  });
}

/** Maps the auth server room model to the shared ServerRoom type used by the SDK. */
export function roomToServerRoom(room: Room): AcceptRoomInviteResponse {
  return {
    id: room.id,
    name: room.name,
    collectionKey:
      room.collectionKey as AcceptRoomInviteResponse['collectionKey'],
    syncUrl: room.syncUrl ?? room.syncBaseUrl ?? null,
    tokenExpiry: room.tokenExpiry?.toISOString() ?? null,
    publicAccess: room.publicAccess,
    readAccess: room.readAccess,
    writeAccess: room.writeAccess,
    adminAccess: room.adminAccess,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt?.toISOString() ?? null,
    _deleted: room._deleted ?? null,
    _ttl: room._ttl?.toISOString() ?? null,
    encryption: null,
  };
}
