import type {
  UpdateRoomPostBody,
  UpdateRoomResponse,
  UpdateRoomRouteParams,
} from '@eweser/shared';
import {
  authTokenFromHeaders,
  serverRouteError,
} from '../../../../shared/utils';
import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '../../../../shared/server-constants';
import type { AccessGrantJWT } from '../../../../modules/account/access-grant/create-token-from-grant';
import { updateRoom } from '../../../../model/rooms/calls';

export async function POST(
  request: Request,
  { params }: { params: UpdateRoomRouteParams }
) {
  const authToken = authTokenFromHeaders(request.headers);
  if (!authToken) {
    return serverRouteError('No token provided', 401);
  }
  const { roomId } = params;
  if (!roomId) {
    return serverRouteError('No roomId provided', 400);
  }

  const { newName } = (await request.json()) as UpdateRoomPostBody;
  if (!newName) {
    return serverRouteError('No new name provided', 400);
  }

  const { roomIds } = jwt.verify(authToken, SERVER_SECRET) as AccessGrantJWT;
  if (!roomIds.includes(roomId)) {
    return serverRouteError('Invalid room', 401);
  }

  const updated = await updateRoom({
    id: roomId,
    name: newName,
  });
  const result: UpdateRoomResponse = updated;
  return Response.json(result);
}

export function OPTIONS() {
  return new Response('ok', { status: 200 });
}
