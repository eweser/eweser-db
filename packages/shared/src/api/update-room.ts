import type { ServerRoom } from '../index.js';

export type UpdateRoomRouteParams = {
  roomId: string;
};
export type UpdateRoomPostBody = {
  newName: string;
};
export type UpdateRoomResponse = ServerRoom;
