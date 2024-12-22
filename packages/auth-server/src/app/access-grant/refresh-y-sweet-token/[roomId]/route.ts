import type {
  RefreshYSweetTokenRouteParams,
  RefreshYSweetTokenRouteResponse,
} from '@eweser/shared';
import { getRoomById } from '../../../../model/rooms/calls';
import type { AccessGrantJWT } from '../../../../modules/account/access-grant/create-token-from-grant';
import { SERVER_SECRET } from '../../../../shared/server-constants';
import {
  authTokenFromHeaders,
  serverRouteError,
} from '../../../../shared/utils';
import jwt from 'jsonwebtoken';
import { refreshTokenIfNeededAndSaveToRoom } from '../../../../modules/rooms/refresh-token-save-to-room';
import { db } from '../../../../services/database';

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

  const refreshed = await db().transaction(async (dbInstance) => {
    const room = await getRoomById(roomId, dbInstance);
    if (!room) {
      return;
    }
    return await refreshTokenIfNeededAndSaveToRoom(room, dbInstance);
  });
  const { ySweetUrl, ySweetBaseUrl, tokenExpiry } = refreshed || {};

  if (!ySweetUrl || !ySweetBaseUrl || !tokenExpiry) {
    return serverRouteError('Could not get token', 500);
  }
  const response: RefreshYSweetTokenRouteResponse = {
    ySweetUrl,
    ySweetBaseUrl,
    tokenExpiry,
  };

  return Response.json(response);
}
