import { COLLECTION_KEYS } from '@/shared/constants';
import { pgTable, boolean, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../users';

export const rooms = pgTable('rooms', {
  id: text('id').primaryKey().notNull(), // <authserver-url>|<uuid>
  creator: text('creator')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // user facing name of the room ('folder')
  collectionKey: text('collection_key', {
    enum: COLLECTION_KEYS,
  }).notNull(),
  token: text('token'), // y-sweet access token to sync the document
  public: boolean('public').default(false).notNull(), // if true, anyone can access the room. will invite all aggregators.

  readAccess: text('read_access').array().notNull(), // requester_id array, could be user ids or app domains
  writeAccess: text('write_access').array().notNull(), // requester_id array, could be user ids or app domains
  adminAccess: text('admin_access').array().notNull(), // requester_id array, could be user ids or app domains. Can change access and invite others.

  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

export type Room = typeof rooms.$inferSelect;
