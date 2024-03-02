import type {
  RefreshYSweetTokenRouteParams,
  RefreshYSweetTokenRouteResponse,
} from '@eweser/shared';
import { updateRoom } from '../../../../model/rooms/calls';
import type { AccessGrantJWT } from '../../../../modules/account/access-grant/create-token-from-grant';
import { getOrCreateToken } from '../../../../services/y-sweet/get-or-create-token';
import { SERVER_SECRET } from '../../../../shared/server-constants';
import {
  authTokenFromHeaders,
  serverRouteError,
} from '../../../../shared/utils';
import jwt from 'jsonwebtoken';

export async function GET(
  request: Request,
  { params }: { params: RefreshYSweetTokenRouteParams }
) {
  const roomId = params.roomId;
  if (!roomId) {
    return serverRouteError('No roomId provided', 400);
  }
  const authToken = authTokenFromHeaders(request.headers);
  if (!authToken) {
    return serverRouteError('No token provided', 401);
  }
  const { roomIds } = jwt.verify(authToken, SERVER_SECRET) as AccessGrantJWT;

  if (!roomIds.includes(roomId)) {
    return serverRouteError('Invalid room', 401);
  }

  // get token from ysweet, update the room and return token
  const gotToken = await getOrCreateToken(roomId);
  const token = gotToken.token;
  const ySweetUrl = gotToken.url;
  if (!token || !ySweetUrl) {
    return serverRouteError('Could not get token', 500);
  }
  await updateRoom({ id: roomId, token, ySweetUrl });

  const response: RefreshYSweetTokenRouteResponse = { token, ySweetUrl };

  return Response.json(response);
}
