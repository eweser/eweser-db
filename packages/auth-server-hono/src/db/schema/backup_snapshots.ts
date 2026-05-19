import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const backupSnapshots = pgTable('backup_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessGrantId: text('access_grant_id'),
  providerProfileId: text('provider_profile_id').notNull(),
  objectKey: text('object_key').notNull(),
  filename: text('filename').notNull(),
  contentHash: text('content_hash').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  roomCount: integer('room_count').notNull(),
  documentCount: integer('document_count').notNull(),
  retentionExpiresAt: timestamp('retention_expires_at', {
    withTimezone: true,
    mode: 'date',
  }),
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

export type BackupSnapshot = typeof backupSnapshots.$inferSelect;
