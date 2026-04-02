import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const PUBLIC_ACCESS_TYPES = ['private', 'read', 'write'] as const;

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: text('name').notNull(), // user facing name of the room ('folder')

  collectionKey: text('collection_key').notNull(),

  tokenExpiry: timestamp('token_expiry', {
    withTimezone: true,
    mode: 'date',
  }),

  // Sync server connection fields used by the Hocuspocus integration.
  syncUrl: text('sync_url'),
  syncBaseUrl: text('sync_base_url'),

  publicAccess: text('public_access', { enum: PUBLIC_ACCESS_TYPES })
    .default('private')
    .notNull(),

  readAccess: text('read_access').array().notNull().default([]),
  writeAccess: text('write_access').array().notNull().default([]),
  adminAccess: text('admin_access').array().notNull().default([]),

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

  _deleted: boolean('_deleted').default(false),
  _ttl: timestamp('_ttl', { withTimezone: true, mode: 'date' }),
});

export type Room = typeof rooms.$inferSelect;
