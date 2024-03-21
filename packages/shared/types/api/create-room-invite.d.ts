import type { RoomAccessType } from '../collections';
import type { LoginQueryParams } from './login-queries';
export type CreateRoomInviteBody = LoginQueryParams & {
    inviterId?: string;
    invitees: string[];
    roomId: string;
    accessType: RoomAccessType;
    redirectQueries?: Record<string, string>;
    expiry?: string;
};
export type CreateRoomInviteResponse = {
    link: string;
};
