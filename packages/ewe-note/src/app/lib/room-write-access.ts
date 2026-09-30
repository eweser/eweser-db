import type { Note, Room } from '@eweser/db';

export function canWriteRoom(
  room: Pick<Room<Note>, 'syncUrl' | 'writeAccess' | 'adminAccess'> &
    Partial<Pick<Room<Note>, 'db' | 'id'>>,
  userId: string | null | undefined
) {
  if (!room.syncUrl) return true;
  if (!userId) {
    // The app created this room on this device. Keep its local Yjs document
    // editable when the user ID cannot be recovered offline. Remote writes
    // still require an authorized sync connection.
    return Boolean(room.db && room.id && room.db._initialRoomIds.has(room.id));
  }
  return room.writeAccess.includes(userId) || room.adminAccess.includes(userId);
}
