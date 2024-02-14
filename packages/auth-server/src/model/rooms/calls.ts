import { db } from '@/services/database';
import { eq } from 'drizzle-orm';
import type { Room } from './schema';
import { rooms } from './schema';
import type { RoomInsert, RoomUpdate } from './validation';

export async function getRoomsByUserId(userId: string): Promise<Room[]> {
  return await db().select().from(rooms).where(eq(rooms.creator, userId));
}

export async function insertRooms(inserts: RoomInsert[]) {
  return await db().insert(rooms).values(inserts).returning({ id: rooms.id });
}

export async function updateRooms(update: RoomUpdate) {
  return await db().update(rooms).set(update).where(eq(rooms.id, update.id));
}
