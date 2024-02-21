// Seems we might not need this route if we just always use the sync-rooms-with-client.ts function

import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '@/shared/server-constants';
import type { AccessGrantJWT } from '@/modules/account/access-grant/create-token-from-grant';
import { getAccessGrantById } from '@/model/access_grants';
import { getRoomsByIds } from '@/model/rooms/calls';
import { authTokenFromHeaders, serverRouteError } from '@/shared/utils';

export default async function POST(request: Request) {
  const token = authTokenFromHeaders(request.headers);
  if (!token) {
    return serverRouteError('No token provided', 401);
  }
  const { access_grant_id, roomIds } = jwt.verify(
    token,
    SERVER_SECRET
  ) as AccessGrantJWT;

  // check the grant real quick to make sure it's valid
  const grant = await getAccessGrantById(access_grant_id);
  if (!grant || !grant.isValid) {
    return serverRouteError('Invalid access grant', 401);
  }
  const rooms = await getRoomsByIds(roomIds);
  return Response.json(rooms);
}
