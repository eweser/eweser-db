import { db } from '../../services/database';
import { and, arrayOverlaps, eq, inArray, or } from 'drizzle-orm';
import type { Room } from './schema';
import { rooms } from './schema';
import type { RoomInsert, RoomUpdate } from './validation';
import { updateUserRooms, users } from '../users';
import type { DBInstance } from '../../services/database/drizzle/init';
import type { CollectionKey } from '@eweser/db';
import type { AccessGrant } from '../access_grants';

export async function getRoomsByIds(ids: string[]): Promise<Room[]> {
  return await db().select().from(rooms).where(inArray(rooms.id, ids));
}

/**
 *
 * locks the rows for update
 */
export async function getProfileRoomsByUserIdForUpdate(
  userId: string,
  instance?: DBInstance
) {
  return await db(instance).transaction(async (dbInstance) => {
    const usersRooms =
      (
        await db(dbInstance)
          .select({ rooms: users.rooms })
          .from(users)
          .for('update')
          .where(eq(users.id, userId))
      )[0]?.rooms || [];
    if (usersRooms.length == 0) {
      return [];
    }
    return await db(dbInstance)
      .select({
        token: rooms.token,
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
 * Insert rooms and update the user's rooms list
 */
export async function insertRooms(
  inserts: RoomInsert[],
  userId: string,
  instance?: DBInstance
) {
  return await db(instance).transaction(async (dbInstance) => {
    const usersRooms =
      (
        await db()
          .select({ rooms: users.rooms })
          .from(users)
          .where(eq(users.id, userId))
      )[0]?.rooms || [];
    await updateUserRooms(
      userId,
      usersRooms.concat(inserts.map(({ id }) => id)),
      dbInstance
    );

    return dbInstance.insert(rooms).values(inserts).returning();
  });
}

/**
 * ACTUALLY deletes rooms, doesn't just mark _deleted
 * Deletes rooms and removes them from the user's rooms list
 */
export async function deleteRooms(
  ids: string[],
  userId: string,
  instance?: DBInstance
) {
  return await db(instance).transaction(async (dbInstance) => {
    const usersRooms =
      (
        await db()
          .select({ rooms: users.rooms })
          .from(users)
          .where(eq(users.id, userId))
      )[0]?.rooms || [];
    await updateUserRooms(
      userId,
      usersRooms.filter((r) => !ids.includes(r)),
      dbInstance
    );
    await dbInstance.delete(rooms).where(inArray(rooms.id, ids));
  });
}

export async function updateRoom(
  { id, ...update }: RoomUpdate,
  dbInstance?: DBInstance
) {
  return await db(dbInstance).update(rooms).set(update).where(eq(rooms.id, id));
}

/**
 * Note: filters out soft deleted rooms (rooms with _deleted = true)
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
  const roomIds = allAccess
    ? await db(dbInstance)
        .select({ id: rooms.id })
        .from(rooms)
        .where(
          and(
            arrayOverlaps(rooms.writeAccess, [ownerId]),
            eq(rooms._deleted, false)
          )
        )
    : await db(dbInstance)
        .select({ id: rooms.id })
        .from(rooms)
        .where(
          and(
            arrayOverlaps(rooms.writeAccess, [ownerId]),
            eq(rooms._deleted, false),
            or(
              inArray(rooms.id, grantRoomIds),
              inArray(rooms.collectionKey, collectionsWithoutAll)
            )
          )
        );
  return roomIds.map((r) => r.id);
}

/**
 * Note: filters out soft deleted rooms (rooms with _deleted = true)
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
    return await db(dbInstance)
      .select()
      .from(rooms)
      .where(
        and(
          arrayOverlaps(rooms.writeAccess, [ownerId]),
          eq(rooms._deleted, false)
        )
      );
  } else {
    return await db(dbInstance)
      .select()
      .from(rooms)
      .where(
        and(
          arrayOverlaps(rooms.writeAccess, [ownerId]),
          eq(rooms._deleted, false),
          or(
            inArray(rooms.id, grantRoomIds),
            inArray(rooms.collectionKey, collectionsWithoutAll)
          )
        )
      );
  }
}
