import { db } from '../../services/database';
import { and, arrayOverlaps, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import type { Room } from './schema';
import { rooms } from './schema';
import type { RoomInsert, RoomUpdate } from './validation';
import { updateUserRooms, users } from '../users';
import type { DBInstance } from '../../services/database/drizzle/init';
import type { CollectionKey } from '@eweser/db';
import type { AccessGrant } from '../access_grants';

export async function getRoomById(id: string): Promise<Room | null> {
  const roomsFound = await db().select().from(rooms).where(eq(rooms.id, id));
  return roomsFound[0] || null;
}

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
    if (inserts.length === 0) {
      return [];
    }
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
    const roomInserts = inserts.map(({ id, ...rest }) => ({
      ...rest,
      id,
      _ttl: rest._ttl || null, // provide a default value if _ttl is undefined or an empty string
    }));

    return dbInstance.insert(rooms).values(roomInserts).returning();
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
            or(isNull(rooms._deleted), ne(rooms._deleted, true)),
            arrayOverlaps(rooms.writeAccess, [ownerId])
          )
        )
    : await db(dbInstance)
        .select({ id: rooms.id })
        .from(rooms)
        .where(
          and(
            or(isNull(rooms._deleted), ne(rooms._deleted, true)),
            or(
              grantRoomIds.length > 0
                ? inArray(rooms.id, grantRoomIds)
                : isNull(rooms.id), // we can't pass an empty array to inArray so just provide a condition here that is always false
              collectionsWithoutAll.length > 0
                ? inArray(rooms.collectionKey, collectionsWithoutAll)
                : isNull(rooms.id)
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
  // const allAccess = collections.includes('all');
  const allAccess = true;
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
          or(isNull(rooms._deleted), ne(rooms._deleted, true))
        )
      );
  } else {
    return await db(dbInstance)
      .select()
      .from(rooms)
      .where(
        and(
          or(isNull(rooms._deleted), ne(rooms._deleted, true)),
          or(
            grantRoomIds.length > 0
              ? inArray(rooms.id, grantRoomIds)
              : isNull(rooms.id), // we can't pass an empty array to inArray so just provide a condition here that is always false
            collectionsWithoutAll.length > 0
              ? inArray(rooms.collectionKey, collectionsWithoutAll)
              : isNull(rooms.id)
          )
        )
      );
  }
}
