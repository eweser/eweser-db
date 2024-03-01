import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  })
    .notNull()
    .defaultNow(),
  domain: text('domain').notNull().unique(),
});
