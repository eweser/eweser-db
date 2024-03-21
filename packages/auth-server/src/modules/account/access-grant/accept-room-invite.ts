'use server';
import type { AcceptRoomInviteResponse } from '@eweser/shared';
import { getRoomById, updateRoom } from '../../../model/rooms/calls';
import { db } from '../../../services/database';
import type { User } from '@supabase/supabase-js';
import { roomNotFoundError, notAdminOfRoomError } from './roomNotFoundError';

export type AcceptRoomInviteParams = {
  roomId: string;
  inviterId: string;
  accessType: string;
  user: User;
};

export async function acceptRoomInvite({
  roomId,
  inviterId,
  accessType,
  user,
}: AcceptRoomInviteParams) {
  const result = await db().transaction(async (dbInstance) => {
    const existingRoom = await getRoomById(roomId, dbInstance);
    if (!existingRoom) {
      throw new Error(roomNotFoundError);
    }
    if (!existingRoom.adminAccess.includes(inviterId)) {
      throw new Error(notAdminOfRoomError);
    }
    const existingWritePermissions = existingRoom.writeAccess;
    const newWritePermissions = [...existingWritePermissions];
    const newReadPermissions = [...existingRoom.readAccess];
    const newAdminPermissions = [...existingRoom.adminAccess];
    if (accessType === 'write' && !newWritePermissions.includes(user.id)) {
      newWritePermissions.push(user.id);
    }
    if (accessType === 'read' && !newReadPermissions.includes(user.id)) {
      newReadPermissions.push(user.id);
    }
    if (accessType === 'admin' && !newAdminPermissions.includes(user.id)) {
      newAdminPermissions.push(user.id);
    }
    const update = {
      writeAccess: newWritePermissions,
      readAccess: newReadPermissions,
      adminAccess: newAdminPermissions,
    };
    if (
      update.writeAccess.length === existingWritePermissions.length &&
      update.readAccess.length === existingRoom.readAccess.length &&
      update.adminAccess.length === existingRoom.adminAccess.length
    ) {
      return existingRoom;
    }
    await updateRoom({ id: roomId, ...update }, dbInstance);
    return { ...existingRoom, ...update };
  });
  const res: AcceptRoomInviteResponse = result;
  return res;
}
