import { db } from '../../db/drizzle.js';
import {
  createAccessGrantId,
  getAccessGrantById,
  insertAccessGrants,
  updateAccessGrant,
} from '../../model/access_grants.js';
import {
  getWritableRoomsByUserId,
  insertRooms,
} from '../../model/rooms/calls.js';
import { env } from '../../env.js';

type StarterRoomSpec = {
  name: string;
  collectionKey: string;
  publicAccess: 'private' | 'read';
};

const starterRoomSpecs: StarterRoomSpec[] = [
  {
    name: 'Public Profile',
    collectionKey: 'profiles',
    publicAccess: 'read',
  },
  {
    name: 'Private Profile',
    collectionKey: 'profiles',
    publicAccess: 'private',
  },
  {
    name: 'Notes',
    collectionKey: 'notes',
    publicAccess: 'private',
  },
  {
    name: 'Flashcards',
    collectionKey: 'flashcards',
    publicAccess: 'private',
  },
  {
    name: 'Agent Config',
    collectionKey: 'agentConfigs',
    publicAccess: 'private',
  },
  {
    name: 'Conversations',
    collectionKey: 'conversations',
    publicAccess: 'private',
  },
  {
    name: 'File Attachments',
    collectionKey: 'fileAttachments',
    publicAccess: 'private',
  },
];

/**
 * Ensures initial rooms and the auth-server access grant exist for a user.
 * Hard cutover: no backwards compatibility needed.
 */
export async function ensureUserRoomsAndAuthServerAccess(userId: string) {
  return await db.transaction(async (dbInstance) => {
    const grantId = createAccessGrantId(userId, env.AUTH_SERVER_DOMAIN);
    const existingRooms = await getWritableRoomsByUserId(userId, dbInstance);
    const missingRoomSpecs = starterRoomSpecs.filter((spec) => {
      if (spec.collectionKey !== 'profiles') {
        return !existingRooms.some(
          (room) => room.collectionKey === spec.collectionKey
        );
      }

      return !existingRooms.some(
        (room) =>
          room.collectionKey === spec.collectionKey && room.name === spec.name
      );
    });

    const insertedRooms = await insertRooms(
      missingRoomSpecs.map((spec) => ({
        id: crypto.randomUUID(),
        name: spec.name,
        collectionKey: spec.collectionKey,
        publicAccess: spec.publicAccess,
        readAccess: [userId, env.AUTH_SERVER_DOMAIN],
        writeAccess: [userId, env.AUTH_SERVER_DOMAIN],
        adminAccess: [userId],
        syncUrl: env.SYNC_SERVER_URL,
        syncBaseUrl: env.SYNC_SERVER_URL,
      })),
      userId,
      dbInstance
    );

    const roomIds = Array.from(
      new Set(
        existingRooms
          .map((room) => room.id)
          .concat(insertedRooms.map((room) => room.id))
      )
    );

    let grant: Awaited<ReturnType<typeof getAccessGrantById>> | null = null;
    try {
      grant = await getAccessGrantById(grantId, dbInstance);
    } catch {
      grant = null;
    }

    if (grant) {
      await updateAccessGrant(
        {
          id: grant.id,
          roomIds: Array.from(new Set(grant.roomIds.concat(roomIds))),
        },
        dbInstance
      );
    } else {
      await insertAccessGrants(
        [
          {
            id: grantId,
            ownerId: userId,
            requesterId: env.AUTH_SERVER_DOMAIN,
            requesterType: 'app',
            collections: ['all'],
            roomIds,
            isValid: true,
            keepAliveDays: 365,
          },
        ],
        dbInstance
      );
    }

    return { grantId };
  });
}

export async function createNewUserRoomsAndAuthServerAccess(userId: string) {
  return await ensureUserRoomsAndAuthServerAccess(userId);
}
