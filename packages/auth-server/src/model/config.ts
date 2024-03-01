import { pgTable, text } from 'drizzle-orm/pg-core';

export const config = pgTable('config', {
  key: text('key').primaryKey().notNull(),
  value: text('value').notNull(),
});
