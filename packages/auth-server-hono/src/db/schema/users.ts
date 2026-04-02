import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // for email/password auth
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  name: text('name'),

  /**
   * Make sure to update this rooms list when adding/removing/inviting users to rooms.
   */
  rooms: uuid('rooms').array().notNull().default([]), // room.id array

  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'date',
  }).$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
