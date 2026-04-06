import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const accessGrants = pgTable('access_grants', {
  id: text('id').primaryKey().notNull(), // <owner_user_id>|<requester_id/app_domain>
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  requesterId: text('requester_id').notNull(), // requester_app_domain or requester_user_id
  requesterType: text('requester_type').notNull(),

  roomIds: text('room_ids').array().notNull().default([]),
  collections: text('collections').array().notNull().default([]),
  isValid: boolean('is_valid').default(true).notNull(),

  keepAliveDays: integer('keep_alive_days').default(1).notNull(),
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

export type AccessGrant = typeof accessGrants.$inferSelect;
