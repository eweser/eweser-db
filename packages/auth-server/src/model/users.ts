import { db } from '@/services/database';
import type { DBInstance } from '@/services/database/drizzle/init';
import { logger } from '@/shared/utils';
import { count, eq } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(), // corresponds to the auth.users table

  email: text('email').notNull(),
  /**
   * Make sure to update this rooms list when adding/removing/inviting users to rooms. Should be handled in the rooms model calls. only use those calls to be sure
   */
  rooms: uuid('rooms').array().notNull().default([]), // room.id array

  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

// insert helper is not needed because it is handled by the database function `public.handle_new_user()` and `on_auth_user_created` trigger on the auth.users table.

export async function getUserCount() {
  const result = await db()
    .select({ value: count(users.id) })
    .from(users);
  if (!result || !result[0]?.value || result[0].value >= 0) {
    logger('getUserCount result is null');
    return 0;
  }
  return result[0].value;
}

export async function getUserById(userId: string) {
  const results = await db().select().from(users).where(eq(users.id, userId));
  if (results.length !== 1) {
    throw new Error('User not found');
  }
  return results[0];
}

export async function getUserRooms(userId: string, instance?: DBInstance) {
  return await db(instance)
    .select({ rooms: users.rooms })
    .from(users)
    .where(eq(users.id, userId));
}

export async function updateUserRooms(
  userId: string,
  roomIds: string[],
  instance?: DBInstance
) {
  return await db(instance)
    .update(users)
    .set({ rooms: roomIds })
    .where(eq(users.id, userId));
}
