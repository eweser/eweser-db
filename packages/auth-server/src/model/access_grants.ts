import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users';

import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

import { eq } from 'drizzle-orm';
import { COLLECTION_KEYS } from '@eweser/shared';
import { db } from '../services/database';
import type { DBInstance } from '../services/database/drizzle/init';
import { REQUESTER_TYPES } from '../shared/constants';

export function createAccessGrantId(ownerId: string, requesterId: string) {
  return `${ownerId}|${requesterId}`;
}

export function parseAccessGrantId(id: string): {
  ownerId: string;
  requesterId: string;
} {
  const [ownerId, requesterId] = id.split('|');
  return { ownerId, requesterId };
}

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
  collections: text('collections', { enum: [...COLLECTION_KEYS, 'all'] })
    .array()
    .notNull(),
  isValid: boolean('is_valid').default(true).notNull(), // use to revoke an existing jwt next time its keep alive is called

  keepAliveDays: integer('keep_alive_days').default(1).notNull(), // auto renew, extend expiry date by x days every time token is used
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

export type AccessGrant = typeof accessGrants.$inferSelect;

export const accessGrantInsertSchema = createInsertSchema(accessGrants, {
  id: z.string(),
  roomIds: z.string().array(),
  collections: z.enum([...COLLECTION_KEYS, 'all']).array(),
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

export async function insertAccessGrants(
  inserts: AccessGrantInsert[],
  dbInstance?: DBInstance
) {
  return await db(dbInstance).insert(accessGrants).values(inserts).returning();
}

export async function updateAccessGrant(
  { id, ...update }: AccessGrantUpdate,
  dbInstance?: DBInstance
) {
  const updated = await db(dbInstance)
    .update(accessGrants)
    .set(update)
    .where(eq(accessGrants.id, id))
    .returning();
  if (updated.length !== 1) {
    throw new Error('Failed to update access grant');
  }
  return updated[0];
}

export async function getAccessGrantById(
  id: string,
  dbInstance?: DBInstance
): Promise<AccessGrant> {
  const results = await db(dbInstance)
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
