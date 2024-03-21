import type { ServerRoom } from '..';
export type UpdateRoomRouteParams = {
    roomId: string;
};
export type UpdateRoomPostBody = {
    newName: string;
};
export type UpdateRoomResponse = ServerRoom;
