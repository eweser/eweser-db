import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const twoFactor = pgTable('twoFactor', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  enabled: boolean('enabled').notNull().default(false),
});

export type TwoFactor = typeof twoFactor.$inferSelect;
