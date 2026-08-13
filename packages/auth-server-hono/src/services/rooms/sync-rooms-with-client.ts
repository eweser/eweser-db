import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '../../env.js';
import { db } from '../../db/drizzle.js';
import { accessGrants } from '../../db/schema/access_grants.js';
import {
  getRoomsFromAccessGrant,
  updateRoom,
  insertRooms,
} from '../../model/rooms/calls.js';
import {
  parseAccessGrantId,
  updateAccessGrant,
} from '../../model/access_grants.js';
import type { RegistrySyncResponse, ServerRoom } from '@eweser/shared';

export interface AccessGrantJWT {
  access_grant_id: string;
  roomIds: string[];
}

export function getNewClientRooms(
  clientRooms: ServerRoom[],
  serverRoomIds: Set<string>,
  newRoomIds: string[]
) {
  const pendingRoomIds = new Set(newRoomIds);

  return clientRooms.filter(
    (room) =>
      pendingRoomIds.has(room.id) &&
      !serverRoomIds.has(room.id) &&
      !room._deleted
  );
}

export function getAuthorizedDeletedRoomIds(
  clientRooms: Array<Pick<ServerRoom, 'id' | '_deleted'>>,
  serverRooms: Array<Pick<ServerRoom, 'id' | 'adminAccess'>>,
  userId: string
) {
  const serverRoomsById = new Map(serverRooms.map((room) => [room.id, room]));

  return clientRooms
    .filter((room) => room._deleted)
    .filter((room) =>
      serverRoomsById.get(room.id)?.adminAccess.includes(userId)
    )
    .map((room) => room.id);
}

/**
 * Syncs client rooms with server.
 * Hard cutover: uses syncUrl/syncBaseUrl directly.
 */
export async function syncRoomsWithClient(
  token: string,
  clientRooms: ServerRoom[],
  newRoomIds: string[]
): Promise<RegistrySyncResponse> {
  const secret = env.SERVER_SECRET;
  const decoded = jwt.verify(token, secret) as AccessGrantJWT;
  const { access_grant_id } = decoded;

  const { ownerId: userId } = parseAccessGrantId(access_grant_id);
  if (!userId) {
    throw new Error('Invalid access grant, could not parse user');
  }

  return await db.transaction(async (dbInstance) => {
    const grantResults = await dbInstance
      .select()
      .from(accessGrants)
      .where(eq(accessGrants.id, access_grant_id));

    const grant = grantResults[0];
    if (!grant || !grant.isValid) {
      throw new Error('Invalid access grant');
    }

    const serverRooms = await getRoomsFromAccessGrant(grant, dbInstance);
    const serverRoomIds = serverRooms.map((r) => r.id);
    const serverRoomIdSet = new Set(serverRoomIds);
    const serverRoomsById = new Map(serverRooms.map((room) => [room.id, room]));

    // Only rooms explicitly created by this client may be added to the
    // authoritative server registry. Cached rooms omitted from a grant must
    // remain omitted so a stale device cannot recreate them.
    const newClientRooms = getNewClientRooms(
      clientRooms,
      serverRoomIdSet,
      newRoomIds
    );

    if (newClientRooms.length > 0) {
      const inserts = newClientRooms.map((r) => ({
        id: r.id,
        name: r.name,
        collectionKey: r.collectionKey,
        syncUrl: env.SYNC_SERVER_URL,
        syncBaseUrl: env.SYNC_SERVER_URL,
        publicAccess: r.publicAccess,
        readAccess: [userId, env.AUTH_SERVER_DOMAIN],
        writeAccess: [userId, env.AUTH_SERVER_DOMAIN],
        adminAccess: [userId],
      }));

      await insertRooms(inserts, userId, dbInstance);
    }

    for (const clientRoom of clientRooms) {
      const serverRoom = serverRoomsById.get(clientRoom.id);
      if (
        serverRoom &&
        serverRoom.publicAccess !== clientRoom.publicAccess &&
        serverRoom.adminAccess.includes(userId)
      ) {
        await updateRoom(
          { id: serverRoom.id, publicAccess: clientRoom.publicAccess },
          dbInstance
        );
      }
    }

    // Handle soft deletes from client
    const clientDeletedRoomIds = getAuthorizedDeletedRoomIds(
      clientRooms,
      serverRooms,
      userId
    );
    for (const id of clientDeletedRoomIds) {
      await updateRoom({ id, _deleted: true }, dbInstance);
    }

    const finalRooms = await getRoomsFromAccessGrant(grant, dbInstance);
    const finalRoomIds = finalRooms.map((r) => r.id);

    // Update grant if room list changed
    if (
      JSON.stringify(finalRoomIds.sort()) !==
      JSON.stringify(serverRoomIds.sort())
    ) {
      await updateAccessGrant(
        { id: grant.id, roomIds: finalRoomIds },
        dbInstance
      );
    }

    const newToken = jwt.sign(
      { access_grant_id: grant.id, roomIds: finalRoomIds } as AccessGrantJWT,
      env.SERVER_SECRET,
      { expiresIn: `${grant.keepAliveDays}d` }
    );

    return {
      rooms: finalRooms.map(
        (r) =>
          ({
            ...r,
            syncUrl: r.syncUrl ?? r.syncBaseUrl,
            tokenExpiry: r.tokenExpiry?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt?.toISOString() ?? null,
            _ttl: r._ttl?.toISOString() ?? null,
            encryption: null,
          }) as ServerRoom
      ),
      token: newToken,
      userId,
    };
  });
}
