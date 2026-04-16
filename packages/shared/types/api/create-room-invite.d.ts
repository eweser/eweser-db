import type { RoomAccessType } from '../collections/index.js';
import type { LoginQueryParams } from './login-queries.js';
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
