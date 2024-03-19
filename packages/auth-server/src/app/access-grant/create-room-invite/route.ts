import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '../../../shared/server-constants';
import type { AccessGrantJWT } from '../../../modules/account/access-grant/create-token-from-grant';
import { parseAccessGrantId } from '../../../model/access_grants';
import { authTokenFromHeaders, serverRouteError } from '../../../shared/utils';
import type {
  CreateRoomInviteBody,
  CreateRoomInviteResponse,
} from '@eweser/shared';
import { createRoomInviteLink } from '../../../modules/account/access-grant/create-room-invite-link';

export async function POST(request: Request) {
  const token = authTokenFromHeaders(request.headers);
  if (!token) {
    return serverRouteError('No token provided', 401);
  }
  const { access_grant_id, roomIds } = jwt.verify(
    token,
    SERVER_SECRET
  ) as AccessGrantJWT;
  if (!access_grant_id || !roomIds) {
    return serverRouteError('Invalid token', 401);
  }

  const body = (await request.json()) as CreateRoomInviteBody;

  if (!body || !body.roomId) {
    return serverRouteError('Invalid request', 400);
  }
  const { ownerId } = parseAccessGrantId(access_grant_id);
  if (body.inviterId && ownerId !== body.inviterId) {
    return serverRouteError('Inviter does not match', 403);
  }
  const link = createRoomInviteLink({ ...body, inviterId: ownerId });

  const response: CreateRoomInviteResponse = { link };

  return Response.json(response);
}
export function OPTIONS() {
  return new Response('ok', { status: 200 });
}
