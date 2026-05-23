import { and, eq } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import type { DBInstance } from '../db/drizzle.js';
import { accessGrants } from '../db/schema/access_grants.js';

export type { AccessGrant } from '../db/schema/access_grants.js';

export type AccessGrantInsert = typeof accessGrants.$inferInsert;
export type AccessGrantUpdate = Partial<typeof accessGrants.$inferInsert> & {
  id: string;
};

export function createAccessGrantId(ownerId: string, requesterId: string) {
  return `${ownerId}|${requesterId}`;
}

export function parseAccessGrantId(id: string): {
  ownerId: string;
  requesterId: string;
} {
  const [ownerId, requesterId] = id.split('|');
  return { ownerId: ownerId ?? '', requesterId: requesterId ?? '' };
}

export async function getAccessGrantById(id: string, dbInstance?: DBInstance) {
  const results = await (dbInstance ?? db)
    .select()
    .from(accessGrants)
    .where(eq(accessGrants.id, id));
  if (results.length !== 1) {
    throw new Error('Access grant not found');
  }
  const accessGrant = results[0];
  if (!accessGrant) {
    throw new Error('Access grant not found');
  }
  return accessGrant;
}

export async function getAccessGrantsByOwnerId(
  ownerId: string,
  dbInstance?: DBInstance
) {
  return await (dbInstance ?? db)
    .select()
    .from(accessGrants)
    .where(eq(accessGrants.ownerId, ownerId));
}

export async function insertAccessGrants(
  inserts: AccessGrantInsert[],
  dbInstance?: DBInstance
) {
  return await (dbInstance ?? db)
    .insert(accessGrants)
    .values(inserts)
    .returning();
}

export async function updateAccessGrant(
  { id, ...update }: AccessGrantUpdate,
  dbInstance?: DBInstance
) {
  const updated = await (dbInstance ?? db)
    .update(accessGrants)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(accessGrants.id, id))
    .returning();
  if (updated.length !== 1) {
    throw new Error('Failed to update access grant');
  }
  const accessGrant = updated[0];
  if (!accessGrant) {
    throw new Error('Failed to update access grant');
  }
  return accessGrant;
}

export async function revokeAccessGrantForOwner(
  id: string,
  ownerId: string,
  dbInstance?: DBInstance
) {
  const updated = await (dbInstance ?? db)
    .update(accessGrants)
    .set({ isValid: false, updatedAt: new Date() })
    .where(and(eq(accessGrants.id, id), eq(accessGrants.ownerId, ownerId)))
    .returning();
  if (updated.length !== 1) {
    throw new Error('Access grant not found');
  }
  const accessGrant = updated[0];
  if (!accessGrant) {
    throw new Error('Access grant not found');
  }
  return accessGrant;
}
