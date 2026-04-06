import { and, arrayOverlaps, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from '../../db/drizzle.js';
import type { DBInstance } from '../../db/drizzle.js';
import { rooms } from '../../db/schema/rooms.js';
import type { Room } from '../../db/schema/rooms.js';
import type { RoomInsert, RoomUpdate } from './validation.js';
import { users } from '../../db/schema/users.js';
import { updateUserRooms } from '../users.js';
import type { AccessGrant } from '../../db/schema/access_grants.js';
import type { CollectionKey } from '@eweser/shared';

export type { Room };

export async function getRoomById(
  id: string,
  dbInstance?: DBInstance
): Promise<Room | null> {
  const found = await (dbInstance ?? db)
    .select()
    .from(rooms)
    .where(eq(rooms.id, id));
  return found[0] ?? null;
}

export async function getRoomsByIds(ids: string[]): Promise<Room[]> {
  if (ids.length === 0) return [];
  return await db.select().from(rooms).where(inArray(rooms.id, ids));
}

export async function getWritableRoomsByUserId(
  userId: string,
  dbInstance?: DBInstance
): Promise<Pick<Room, 'id' | 'collectionKey'>[]> {
  return await (dbInstance ?? db)
    .select({ id: rooms.id, collectionKey: rooms.collectionKey })
    .from(rooms)
    .where(
      and(
        or(isNull(rooms._deleted), ne(rooms._deleted, true)),
        arrayOverlaps(rooms.writeAccess, [userId])
      )
    );
}

/**
 * Locks rows for update. Returns profile rooms for a user.
 */
export async function getProfileRoomsByUserIdForUpdate(
  userId: string,
  instance?: DBInstance
) {
  return await (instance ?? db).transaction(async (dbInstance: DBInstance) => {
    const usersRooms =
      (
        await dbInstance
          .select({ rooms: users.rooms })
          .from(users)
          .for('update')
          .where(eq(users.id, userId))
      )[0]?.rooms ?? [];

    if (usersRooms.length === 0) return [];

    return await dbInstance
      .select({
        syncBaseUrl: rooms.syncBaseUrl,
        syncUrl: rooms.syncUrl,
        id: rooms.id,
        name: rooms.name,
      })
      .from(rooms)
      .where(
        and(inArray(rooms.id, usersRooms), eq(rooms.collectionKey, 'profiles'))
      );
  });
}

/**
 * Insert rooms and add them to the user's rooms list.
 */
export async function insertRooms(
  inserts: RoomInsert[],
  userId: string,
  instance?: DBInstance
): Promise<Room[]> {
  return await (instance ?? db).transaction(async (dbInstance: DBInstance) => {
    if (inserts.length === 0) return [];

    const usersRooms =
      (
        await dbInstance
          .select({ rooms: users.rooms })
          .from(users)
          .where(eq(users.id, userId))
      )[0]?.rooms ?? [];

    await updateUserRooms(
      userId,
      usersRooms.concat(inserts.map(({ id }) => id ?? '')),
      dbInstance
    );

    const inserted: Room[] = [];
    for (const insert of inserts) {
      const existing = await getRoomById(insert.id ?? '', dbInstance);
      if (!existing) {
        const result = await dbInstance
          .insert(rooms)
          .values({ ...insert, _ttl: insert._ttl ?? null })
          .returning();
        if (result[0]) inserted.push(result[0]);
      } else {
        inserted.push(existing);
      }
    }
    return inserted;
  });
}

export async function updateRoom(
  { id, ...update }: RoomUpdate,
  dbInstance?: DBInstance
): Promise<Room> {
  const result = await (dbInstance ?? db)
    .update(rooms)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(rooms.id, id))
    .returning();
  if (result.length !== 1) {
    throw new Error('Room not found');
  }
  const updatedRoom = result[0];
  if (!updatedRoom) {
    throw new Error('Room not found');
  }
  return updatedRoom;
}

/**
 * Returns room IDs from an access grant, filtering out soft-deleted rooms.
 */
export async function getRoomIdsFromAccessGrant(
  accessGrant: AccessGrant,
  dbInstance?: DBInstance
): Promise<string[]> {
  const { collections, roomIds: grantRoomIds, ownerId } = accessGrant;
  const allAccess = collections.includes('all');
  const collectionsWithoutAll = collections.filter(
    (c) => c !== 'all'
  ) as CollectionKey[];

  const result = allAccess
    ? await (dbInstance ?? db)
        .select({ id: rooms.id })
        .from(rooms)
        .where(
          and(
            or(isNull(rooms._deleted), ne(rooms._deleted, true)),
            arrayOverlaps(rooms.writeAccess, [ownerId])
          )
        )
    : await (dbInstance ?? db)
        .select({ id: rooms.id })
        .from(rooms)
        .where(
          and(
            or(isNull(rooms._deleted), ne(rooms._deleted, true)),
            arrayOverlaps(rooms.writeAccess, [ownerId]),
            or(
              grantRoomIds.length > 0
                ? inArray(rooms.id, grantRoomIds)
                : isNull(rooms.id),
              collectionsWithoutAll.length > 0
                ? inArray(rooms.collectionKey, collectionsWithoutAll)
                : isNull(rooms.id)
            )
          )
        );

  return result.map((r: { id: string }) => r.id);
}

/**
 * Returns full room rows from an access grant, filtering out soft-deleted rooms.
 */
export async function getRoomsFromAccessGrant(
  accessGrant: AccessGrant,
  dbInstance?: DBInstance
): Promise<Room[]> {
  const { collections, roomIds: grantRoomIds, ownerId } = accessGrant;
  const allAccess = collections.includes('all');
  const collectionsWithoutAll = collections.filter(
    (c) => c !== 'all'
  ) as CollectionKey[];

  if (allAccess) {
    return await (dbInstance ?? db)
      .select()
      .from(rooms)
      .where(
        and(
          arrayOverlaps(rooms.writeAccess, [ownerId]),
          or(isNull(rooms._deleted), ne(rooms._deleted, true))
        )
      );
  }

  return await (dbInstance ?? db)
    .select()
    .from(rooms)
    .where(
      and(
        or(isNull(rooms._deleted), ne(rooms._deleted, true)),
        arrayOverlaps(rooms.writeAccess, [ownerId]),
        or(
          grantRoomIds.length > 0
            ? inArray(rooms.id, grantRoomIds)
            : isNull(rooms.id),
          collectionsWithoutAll.length > 0
            ? inArray(rooms.collectionKey, collectionsWithoutAll)
            : isNull(rooms.id)
        )
      )
    );
}
