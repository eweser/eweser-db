import type { LoginQueryOptions, RoomAccessType } from '@eweser/shared';
import { Database } from '../..';
export declare const generateShareRoomLink: (db: Database) => ({ roomId, invitees, redirectUrl, redirectQueries, expiry, accessType, appName, domain, collections, }: Partial<LoginQueryOptions> & {
    roomId: string;
    invitees?: string[];
    redirectUrl?: string;
    redirectQueries?: Record<string, string>;
    expiry?: string;
    accessType: RoomAccessType;
    appName: string;
}) => Promise<string>;
