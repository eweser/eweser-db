import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * People who tried to sign up while signups are limited to the alpha
 * allowlist. Approval is adding the email to SIGNUP_ALLOWLIST.
 */
export const alphaAccessRequests = pgTable('alpha_access_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Lowercased email. */
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  lastRequestedAt: timestamp('last_requested_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
});

export type AlphaAccessRequest = typeof alphaAccessRequests.$inferSelect;
