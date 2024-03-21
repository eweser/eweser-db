import type { LoginQueryOptions, RoomAccessType } from '@eweser/shared';
import { Database } from '../..';
export declare const generateShareRoomLink: (db: Database) => ({ roomId, invitees, redirectUrl, redirectQueries, expiry, accessType, appName, domain, collections, }: Partial<LoginQueryOptions> & {
    roomId: string;
    invitees?: string[] | undefined;
    redirectUrl?: string | undefined;
    redirectQueries?: Record<string, string> | undefined;
    expiry?: string | undefined;
    accessType: RoomAccessType;
    appName: string;
}) => Promise<string>;
