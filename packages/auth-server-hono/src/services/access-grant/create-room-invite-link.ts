import jwt from 'jsonwebtoken';
import type { CreateRoomInviteBody } from '@eweser/shared';
import { env } from '../../env.js';

export function createRoomInviteLink(options: CreateRoomInviteBody): string {
  const inviteToken = jwt.sign(options, env.SERVER_SECRET);
  const protocol = env.AUTH_SERVER_URL.startsWith('https') ? 'https' : 'http';
  const url = new URL(
    '/access-grant/accept-room-invite',
    `${protocol}://${env.AUTH_SERVER_DOMAIN}`
  );
  url.searchParams.set('token', inviteToken);
  return url.toString();
}

export interface RoomInvitePayload extends CreateRoomInviteBody {
  iat?: number;
}

export function verifyRoomInviteToken(token: string): RoomInvitePayload {
  return jwt.verify(token, env.SERVER_SECRET) as RoomInvitePayload;
}
