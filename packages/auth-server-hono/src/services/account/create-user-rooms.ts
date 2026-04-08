import { db } from '../../db/drizzle.js';
import {
  createAccessGrantId,
  insertAccessGrants,
} from '../../model/access_grants.js';
import { insertRooms } from '../../model/rooms/calls.js';
import { env } from '../../env.js';

/**
 * Creates initial rooms and access grant for a new user.
 * Hard cutover: no backwards compatibility needed.
 */
export async function createNewUserRoomsAndAuthServerAccess(userId: string) {
  return await db.transaction(async (dbInstance) => {
    const publicProfileId = crypto.randomUUID();
    const privateProfileId = crypto.randomUUID();
    const privateNotesId = crypto.randomUUID();
    const privateFlashcardsId = crypto.randomUUID();
    const privateAgentConfigId = crypto.randomUUID();
    const privateConversationsId = crypto.randomUUID();

    const rooms = [
      {
        id: publicProfileId,
        name: 'Public Profile',
        collectionKey: 'profiles',
        publicAccess: 'read' as const,
        readAccess: [userId, env.AUTH_SERVER_DOMAIN],
        writeAccess: [userId, env.AUTH_SERVER_DOMAIN],
        adminAccess: [userId],
        syncUrl: env.SYNC_SERVER_URL,
        syncBaseUrl: env.SYNC_SERVER_URL,
      },
      {
        id: privateProfileId,
        name: 'Private Profile',
        collectionKey: 'profiles',
        publicAccess: 'private' as const,
        readAccess: [userId, env.AUTH_SERVER_DOMAIN],
        writeAccess: [userId, env.AUTH_SERVER_DOMAIN],
        adminAccess: [userId],
        syncUrl: env.SYNC_SERVER_URL,
        syncBaseUrl: env.SYNC_SERVER_URL,
      },
      {
        id: privateNotesId,
        name: 'Notes',
        collectionKey: 'notes',
        publicAccess: 'private' as const,
        readAccess: [userId, env.AUTH_SERVER_DOMAIN],
        writeAccess: [userId, env.AUTH_SERVER_DOMAIN],
        adminAccess: [userId],
        syncUrl: env.SYNC_SERVER_URL,
        syncBaseUrl: env.SYNC_SERVER_URL,
      },
      {
        id: privateFlashcardsId,
        name: 'Flashcards',
        collectionKey: 'flashcards',
        publicAccess: 'private' as const,
        readAccess: [userId, env.AUTH_SERVER_DOMAIN],
        writeAccess: [userId, env.AUTH_SERVER_DOMAIN],
        adminAccess: [userId],
        syncUrl: env.SYNC_SERVER_URL,
        syncBaseUrl: env.SYNC_SERVER_URL,
      },
      {
        id: privateAgentConfigId,
        name: 'Agent Config',
        collectionKey: 'agentConfigs',
        publicAccess: 'private' as const,
        readAccess: [userId, env.AUTH_SERVER_DOMAIN],
        writeAccess: [userId, env.AUTH_SERVER_DOMAIN],
        adminAccess: [userId],
        syncUrl: env.SYNC_SERVER_URL,
        syncBaseUrl: env.SYNC_SERVER_URL,
      },
      {
        id: privateConversationsId,
        name: 'Conversations',
        collectionKey: 'conversations',
        publicAccess: 'private' as const,
        readAccess: [userId, env.AUTH_SERVER_DOMAIN],
        writeAccess: [userId, env.AUTH_SERVER_DOMAIN],
        adminAccess: [userId],
        syncUrl: env.SYNC_SERVER_URL,
        syncBaseUrl: env.SYNC_SERVER_URL,
      },
    ];

    await insertRooms(rooms, userId, dbInstance);

    const grantId = createAccessGrantId(userId, env.AUTH_SERVER_DOMAIN);
    await insertAccessGrants(
      [
        {
          id: grantId,
          ownerId: userId,
          requesterId: env.AUTH_SERVER_DOMAIN,
          requesterType: 'app',
          collections: ['all'],
          roomIds: [
            publicProfileId,
            privateProfileId,
            privateNotesId,
            privateFlashcardsId,
            privateAgentConfigId,
            privateConversationsId,
          ],
          isValid: true,
          keepAliveDays: 365,
        },
      ],
      dbInstance
    );

    return { grantId };
  });
}
