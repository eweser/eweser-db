import type {
  AcceptRoomInviteQueries,
  AcceptRoomInviteResponse,
  CreateRoomInviteBody,
} from '@eweser/shared';
import { serverRouteError } from '../../../shared/utils';
import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '../../../shared/server-constants';
import { getRoomById, updateRoom } from '../../../model/rooms/calls';
import { db } from '../../../services/database';
import { getSessionUser } from '../../../modules/account/get-session-user';
import { redirect } from 'next/navigation';
import { AUTH_SERVER_DOMAIN } from '../../../shared/constants';

const roomNotFoundError = 'Room not found';
const notAdminOfRoomError = 'You are not an admin of this room';
export async function GET(
  request: Request,
  { params }: { params: AcceptRoomInviteQueries }
) {
  const token = params.token;
  if (!token) {
    return serverRouteError('No token provided', 400);
  }
  const options = jwt.verify(token, SERVER_SECRET) as CreateRoomInviteBody;
  if (!options) {
    return serverRouteError('Invalid token', 400);
  }

  const { error, user } = await getSessionUser();
  if (error || !user) {
    const loginUrl = new URL('/', `https://${AUTH_SERVER_DOMAIN}`);
    loginUrl.searchParams.set('redirect', '/accept-room-invite?token=' + token);

    return redirect(loginUrl.toString());
  }

  const {
    inviterId,
    invitees,
    roomId,
    accessType,
    expiry,
    redirect: redirectUrl,
  } = options;
  if (!inviterId || !roomId || !accessType) {
    return serverRouteError('Invalid invite', 400);
  }
  if (inviterId === user.id) {
    return serverRouteError('You cannot invite yourself', 403);
  }

  // no invitees would be an 'invite anyone' link. But if specified, should match.
  if (invitees.length > 0 && !invitees.includes(user.id)) {
    return serverRouteError('You are not invited to this room', 403);
  }
  if (expiry && new Date(expiry) < new Date()) {
    return serverRouteError('Invite has expired', 403);
  }
  try {
    const result = await db().transaction(async (dbInstance) => {
      const existingRoom = await getRoomById(roomId, dbInstance);
      if (!existingRoom) {
        throw new Error(roomNotFoundError);
      }
      if (!existingRoom.adminAccess.includes(inviterId)) {
        throw new Error(notAdminOfRoomError);
      }
      const existingWritePermissions = existingRoom.writeAccess;
      const newWritePermissions = [...existingWritePermissions];
      const newReadPermissions = [...existingRoom.readAccess];
      const newAdminPermissions = [...existingRoom.adminAccess];
      if (accessType === 'write') {
        newWritePermissions.push(user.id);
      }
      if (accessType === 'read') {
        newReadPermissions.push(user.id);
      }
      if (accessType === 'admin') {
        newAdminPermissions.push(user.id);
      }
      const update = {
        writeAccess: newWritePermissions,
        readAccess: newReadPermissions,
        adminAccess: newAdminPermissions,
      };
      await updateRoom({ id: roomId, ...update }, dbInstance);
      return { ...existingRoom, ...update };
    });
    const res: AcceptRoomInviteResponse = {
      ...result,
      redirect: redirectUrl,
    };
    return res;
  } catch (error: any) {
    const message =
      error.message === roomNotFoundError
        ? roomNotFoundError
        : error.message === notAdminOfRoomError
        ? notAdminOfRoomError
        : 'Failed to update room';
    return serverRouteError(message, 500);
  }
}
