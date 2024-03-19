import type { RoomAccessType } from '../collections';

export type CreateRoomInviteBody = {
  inviterId?: string;
  invitees: string[];
  roomId: string;
  accessType: RoomAccessType;
  redirect: string;
  redirectQueries?: Record<string, string>;
  expiry?: string;
};
export type CreateRoomInviteResponse = {
  link: string;
};
