import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  level: text('level').notNull().default('info'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
});

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type SecurityEventInsert = typeof securityEvents.$inferInsert;
