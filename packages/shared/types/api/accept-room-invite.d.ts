import type { ServerRoom } from '..';
export type AcceptRoomInviteQueries = {
    token: string;
};
export type AcceptRoomInviteResponse = ServerRoom & {
    redirect: string;
};
