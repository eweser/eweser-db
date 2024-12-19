import { Room } from '../../room';
import type { ServerRoom } from '@eweser/shared';
import type { Database } from '../..';
export declare function loadYSweet(db: Database, room: Room<any>, withAwareness?: boolean, awaitConnection?: boolean, maxWait?: number): Promise<void>;
export type RemoteLoadOptions = {
    awaitLoadRemote?: boolean;
    loadRemote?: boolean;
    loadRemoteMaxWait?: number;
    /** use Awareness, false by default */
    withAwareness?: boolean;
};
export declare const loadRoom: (db: Database) => (serverRoom: ServerRoom, remoteLoadOptions?: RemoteLoadOptions) => Promise<Room<any>>;
