import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '@/shared/server-constants';
import type { AccessGrantJWT } from '@/modules/account/access-grant/create-token-from-grant';
import { getAccessGrantById } from '@/model/access_grants';
import { getRoomsByIds } from '@/model/rooms/calls';

export default async function POST(request: Request) {
  const { token } = await request.json();

  const { access_grant_id, roomIds } = jwt.verify(
    token,
    SERVER_SECRET
  ) as AccessGrantJWT;

  // check the grant real quick to make sure it's valid
  const grant = await getAccessGrantById(access_grant_id);
  if (!grant || !grant.isValid) {
    return Response.json({ message: 'Invalid access grant' });
  }
  const rooms = await getRoomsByIds(roomIds);
  return Response.json(rooms);
}
