import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { db } from '../services/database';

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

export async function getAllAppDomains(): Promise<string[]> {
  const allApps = await db().select({ domain: apps.domain }).from(apps);
  return allApps.map((app) => app.domain);
}
