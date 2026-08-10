import type { Room } from '../../db/schema/rooms.js';

export function roomAllowsRead(
  room: Pick<Room, 'readAccess' | 'writeAccess' | 'adminAccess'>,
  userId: string
) {
  return (
    room.readAccess.includes(userId) ||
    room.writeAccess.includes(userId) ||
    room.adminAccess.includes(userId)
  );
}

export function roomAllowsWrite(
  room: Pick<Room, 'writeAccess' | 'adminAccess'>,
  userId: string
) {
  return room.writeAccess.includes(userId) || room.adminAccess.includes(userId);
}
