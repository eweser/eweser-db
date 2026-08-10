import type { Note, Room } from '@eweser/db';

export function canWriteRoom(
  room: Pick<Room<Note>, 'syncUrl' | 'writeAccess' | 'adminAccess'>,
  userId: string | null | undefined
) {
  if (!room.syncUrl) return true;
  if (!userId) return false;
  return room.writeAccess.includes(userId) || room.adminAccess.includes(userId);
}
