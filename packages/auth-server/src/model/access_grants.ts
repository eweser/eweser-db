import {
  pgTable,
  text,
  boolean,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { REQUESTER_TYPES } from '@/shared/constants';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { db } from '@/services/database';
import { eq } from 'drizzle-orm';

export const accessGrants = pgTable('access_grants', {
  id: text('id').primaryKey().notNull(), // <owner_user_id>|<requester_id/app_domain>
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // user_id
  requesterId: text('requester_id').notNull(), // requester_app_domain or requester_user_id
  requesterType: text('requester_type', {
    enum: REQUESTER_TYPES,
  }).notNull(),

  roomIds: text('room_ids').array().notNull(),
  jwtId: text('jwt_id').notNull(),
  isValid: boolean('is_valid').default(true).notNull(), // use to revoke an existing jwt
  expires: timestamp('expires', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
  keepAliveDays: numeric('keep_alive_days').default('1').notNull(), // auto renew, extend expiry date by x days every time token is used
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

export type AccessGrant = typeof accessGrants.$inferSelect;

export const accessGrantInsertSchema = createInsertSchema(accessGrants, {
  roomIds: z.string().array(),
});

export type AccessGrantInsert = typeof accessGrantInsertSchema._type;

export const accessGrantUpdateSchema = accessGrantInsertSchema
  .partial()
  .extend({
    id: z.string(),
  });

export type AccessGrantUpdate = typeof accessGrantUpdateSchema._type;

export async function validateAccessGrantInsert(insert: AccessGrantInsert) {
  const res = accessGrantInsertSchema.safeParse(insert);
  if (!res.success) {
    throw new Error(res.error.toString());
  }
  return res.data;
}

export async function validateAccessGrantUpdate(update: AccessGrantUpdate) {
  const res = accessGrantUpdateSchema.safeParse(update);
  if (!res.success) {
    throw new Error(res.error.toString());
  }
  return res.data;
}

export async function getAccessGrantsByOwnerId(
  ownerId: string
): Promise<AccessGrant[]> {
  return await db()
    .select()
    .from(accessGrants)
    .where(eq(accessGrants.ownerId, ownerId));
}

export async function insertAccessGrants(inserts: AccessGrantInsert[]) {
  return await db().insert(accessGrants).values(inserts);
}

export async function updateAccessGrants(update: AccessGrantUpdate) {
  return await db()
    .update(accessGrants)
    .set(update)
    .where(eq(accessGrants.id, update.id));
}

export async function getAccessGrantById(id: string): Promise<AccessGrant> {
  const results = await db()
    .select()
    .from(accessGrants)
    .where(eq(accessGrants.id, id));
  if (results.length !== 1) {
    throw new Error('Access grant not found');
  }
  return results[0];
}

export async function getAppsAccessGrantsByOwnerId(
  ownerId: string,
  appDomain: string
): Promise<AccessGrant> {
  return getAccessGrantById(`${ownerId}|${appDomain}`);
}
