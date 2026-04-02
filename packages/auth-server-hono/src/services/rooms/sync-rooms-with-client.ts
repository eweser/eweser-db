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

/**
 * Syncs client rooms with server.
 * Hard cutover: uses syncUrl/syncBaseUrl directly.
 */
export async function syncRoomsWithClient(
  token: string,
  clientRooms: ServerRoom[]
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

    // Identify new rooms from client
    const newClientRooms = clientRooms.filter(
      (r) => !serverRoomIds.includes(r.id)
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

    // Handle soft deletes from client
    const clientDeletedRoomIds = clientRooms
      .filter((r) => r._deleted)
      .map((r) => r.id);
    for (const id of clientDeletedRoomIds) {
      if (serverRoomIds.includes(id)) {
        await updateRoom({ id, _deleted: true }, dbInstance);
      }
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
          }) as ServerRoom
      ),
      token: newToken,
      userId,
    };
  });
}
