import type { ServerRoom } from '../index.js';

export type AcceptRoomInviteQueries = {
  token: string;
};

export type AcceptRoomInviteResponse = ServerRoom;
