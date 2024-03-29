import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '../../../shared/server-constants';
import type { CreateRoomInviteBody } from '@eweser/shared';
import { AUTH_SERVER_DOMAIN } from '../../../shared/constants';

export function createRoomInviteLink(options: CreateRoomInviteBody) {
  const inviteToken = jwt.sign(options, SERVER_SECRET);
  const url = new URL(
    '/access-grant/accept-room-invite',
    `http${
      process.env.NODE_ENV === 'development' ? '' : 's'
    }://${AUTH_SERVER_DOMAIN}`
  );
  url.searchParams.set('token', inviteToken);
  return url.toString();
}
