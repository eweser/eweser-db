import type { CollectionKey, EweDocument } from '@eweser/shared';
import type { YSweetProvider } from '@y-sweet/client';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { WebrtcProvider } from 'y-webrtc';
import type { RoomEvents } from './events';
import { TypedEventEmitter } from './events';
import type { YDoc, ServerRoom } from './types';
export type NewRoomOptions<T extends EweDocument> = {
    id?: string;
    name: string;
    collectionKey: CollectionKey;
    token?: string | null;
    ySweetUrl?: string | null;
    publicAccess?: 'private' | 'read' | 'write';
    readAccess?: string[];
    writeAccess?: string[];
    adminAccess?: string[];
    createdAt?: string | null;
    updatedAt?: string | null;
    _deleted?: boolean | null;
    _ttl?: string | null;
    indexedDbProvider?: IndexeddbPersistence | null;
    webRtcProvider?: WebrtcProvider | null;
    ySweetProvider?: YSweetProvider | null;
    ydoc?: YDoc<T> | null;
};
/** is an event listener, and adds the ydoc providers ands connection status to a ServerRoom/Registry entry */
export declare class Room<T extends EweDocument> extends TypedEventEmitter<RoomEvents<T>> implements ServerRoom {
    id: string;
    name: string;
    collectionKey: CollectionKey;
    token: string | null;
    ySweetUrl: string | null;
    publicAccess: 'private' | 'read' | 'write';
    readAccess: string[];
    writeAccess: string[];
    adminAccess: string[];
    createdAt: string | null;
    updatedAt: string | null;
    _deleted: boolean | null;
    _ttl: string | null;
    indexedDbProvider?: IndexeddbPersistence | null;
    webRtcProvider?: WebrtcProvider | null;
    ySweetProvider?: YSweetProvider | null;
    ydoc?: YDoc<T> | null;
    connectionRetries: number;
    constructor({ indexedDbProvider, webRtcProvider, ySweetProvider, ydoc, ...serverRoom }: NewRoomOptions<T>);
}
export declare function roomToServerRoom(room: Room<any>): ServerRoom;
