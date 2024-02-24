import { syncRoomsWithClient } from '../../../modules/rooms/sync-rooms-with-client';
import { authTokenFromHeaders, serverRouteError } from '../../../shared/utils';
import type {
  RegistrySyncRequestBody,
  RegistrySyncResponse,
} from '@eweser/shared';

export default async function POST(request: Request) {
  const token = authTokenFromHeaders(request.headers);
  if (!token) {
    return serverRouteError('No token provided', 401);
  }

  // TODO: add validation
  const { rooms } = (await request.json()) as RegistrySyncRequestBody;

  const { rooms: newRooms, token: newToken } = await syncRoomsWithClient(
    token,
    rooms
  );
  const response: RegistrySyncResponse = { rooms: newRooms, token: newToken };

  return Response.json(response);
}
