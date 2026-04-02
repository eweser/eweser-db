import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import type { DBInstance } from '../db/drizzle.js';
import { users } from '../db/schema/users.js';

export type { User } from '../db/schema/users.js';

export async function getUserById(id: string, dbInstance?: DBInstance) {
  const results = await (dbInstance ?? db)
    .select()
    .from(users)
    .where(eq(users.id, id));
  return results[0] ?? null;
}

export async function getUserByEmail(email: string, dbInstance?: DBInstance) {
  const results = await (dbInstance ?? db)
    .select()
    .from(users)
    .where(eq(users.email, email));
  return results[0] ?? null;
}

export async function updateUserRooms(
  userId: string,
  roomIds: string[],
  dbInstance?: DBInstance
) {
  await (dbInstance ?? db)
    .update(users)
    .set({ rooms: roomIds })
    .where(eq(users.id, userId));
}
