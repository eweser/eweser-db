import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow(),
  domain: text('domain').notNull().unique(),
});

export type App = typeof apps.$inferSelect;
