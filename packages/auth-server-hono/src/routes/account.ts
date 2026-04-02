import { Hono } from 'hono';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createAccessGrantId,
  getAccessGrantById,
} from '../model/access_grants.js';
import { getRoomsFromAccessGrant } from '../model/rooms/calls.js';
import { getUserCount } from '../model/users.js';
import { createNewUserRoomsAndAuthServerAccess } from '../services/account/create-user-rooms.js';

export const accountRouter = new Hono();

accountRouter.get('/bootstrap', requireAuth, async (c) => {
  const user = c.get('user');
  const grantId = createAccessGrantId(user.id, env.AUTH_SERVER_DOMAIN);

  try {
    await getAccessGrantById(grantId);
  } catch {
    await createNewUserRoomsAndAuthServerAccess(user.id);
  }

  const accessGrant = await getAccessGrantById(grantId);
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
    userCount,
  });
});
