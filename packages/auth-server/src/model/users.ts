import { db } from '@/services/database';
import { eq } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey().notNull(), // internal user id. includes the authserver url <authserver-url>|<uuid>
  authId: uuid('auth_id').notNull(), // corresponds to the auth.users table
  email: text('email').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

// insert helper is not needed because it is handled by the database function `public.handle_new_user()` and `on_auth_user_created` trigger on the auth.users table.

export async function getUserById(userId: string) {
  const results = await db().select().from(users).where(eq(users.id, userId));
  if (results.length !== 1) {
    throw new Error('User not found');
  }
  return results[0];
}
