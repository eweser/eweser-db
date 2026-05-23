import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createAccessGrantId,
  getAccessGrantById,
  getAccessGrantsByOwnerId,
  parseAccessGrantId,
  revokeAccessGrantForOwner,
} from '../model/access_grants.js';
import { getRoomsFromAccessGrant } from '../model/rooms/calls.js';
import { getUserCount } from '../model/users.js';
import { ensureUserRoomsAndAuthServerAccess } from '../services/account/create-user-rooms.js';
import { getStorageProviderProfile } from '../lib/storage.js';

export const accountRouter = new Hono();

const revokeConnectedAppBodySchema = z.object({
  grantId: z.string().min(1),
});

function noStoreJson(c: Context, body: unknown) {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
  return c.json(body);
}

accountRouter.get('/bootstrap', requireAuth, async (c) => {
  const user = c.get('user');
  const grantId = createAccessGrantId(user.id, env.AUTH_SERVER_DOMAIN);

  await ensureUserRoomsAndAuthServerAccess(user.id);

  const accessGrant = await getAccessGrantById(grantId);
  if (!accessGrant) {
    return c.json({ error: 'Access grant not found' }, 404);
  }
  const rooms = await getRoomsFromAccessGrant(accessGrant);
  const profileRooms = rooms.filter(
    (room) => room.collectionKey === 'profiles'
  );
  const userCount = await getUserCount();

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
      image: user.image ?? null,
      name: user.name ?? null,
    },
    rooms,
    profileRooms,
    storageProviderProfile: getStorageProviderProfile(),
    userCount,
  });
});

accountRouter.get('/connected-apps', requireAuth, async (c) => {
  const user = c.get('user');
  const grants = await getAccessGrantsByOwnerId(user.id);
  const connectedApps = grants
    .filter((grant) => grant.requesterId !== env.AUTH_SERVER_DOMAIN)
    .map((grant) => ({
      id: grant.id,
      collections: grant.collections,
      createdAt: grant.createdAt.toISOString(),
      domain: grant.requesterId,
      keepAliveDays: grant.keepAliveDays,
      requesterType: grant.requesterType,
      roomIds: grant.roomIds,
      status: grant.isValid ? 'active' : 'revoked',
      updatedAt: grant.updatedAt?.toISOString() ?? null,
    }));

  return noStoreJson(c, { connectedApps });
});

accountRouter.post('/connected-apps/revoke', requireAuth, async (c) => {
  const user = c.get('user');
  const parsed = revokeConnectedAppBodySchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Invalid request' }, 400);
  }
  const { requesterId } = parseAccessGrantId(parsed.data.grantId);
  if (requesterId === env.AUTH_SERVER_DOMAIN) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  try {
    const grant = await revokeAccessGrantForOwner(parsed.data.grantId, user.id);
    return noStoreJson(c, {
      grantId: grant.id,
      status: 'revoked',
    });
  } catch {
    return c.json({ error: 'Access grant not found' }, 404);
  }
});
