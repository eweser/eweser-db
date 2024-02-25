import type { CollectionKey, Collections, DatabaseEvents, Document, ProviderOptions, Registry, Room, YDoc } from './types';
import { TypedEventEmitter } from './types';
import type { LoginQueryOptions, ServerRoom } from '@eweser/shared';
export * from './utils';
export * from './types';
export interface DatabaseOptions {
    authServer?: string;
    /**
     * 0=debug 1=info, 2=warn, 3=error
     * @default 2
     */
    logLevel?: number;
    /** Which providers to use. By default uses all.
     * Currently indexedDB is required and webRTC and YSweet are optional
     * Setting only indexedDB will make the database offline only
     */
    providers?: ProviderOptions[];
    /** provide a list of peers to use instead of the default */
    webRTCPeers?: string[];
    initialRooms?: Registry;
}
export declare class Database extends TypedEventEmitter<DatabaseEvents> {
    userId: string;
    authServer: string;
    online: boolean;
    offlineOnly: boolean;
    /** set to false before `db.loginWithToken()` so that offline-first mode is the default, and it upgrades to online sync after login with token */
    useYSweet: boolean;
    useWebRTC: boolean;
    useIndexedDB: boolean;
    collectionKeys: CollectionKey[];
    collections: Collections;
    registry: Registry;
    accessGrantToken: string;
    webRtcPeers: string[];
    logLevel: number;
    log: DatabaseEvents['log'];
    debug: DatabaseEvents['debug'];
    info: DatabaseEvents['info'];
    warn: DatabaseEvents['warn'];
    error: DatabaseEvents['error'];
    serverFetch: <ReturnType_1 extends object>(path: string, _options?: import("./utils/connection/serverFetch").Options | undefined) => Promise<{
        error: unknown;
        data: null;
    } | {
        error: null;
        data: ReturnType_1;
    }>;
    /**
     *
     * @param redirect default uses window.location
     * @param appDomain default uses window.location.hostname
     * @param collections default 'all', which collections your app would like to have write access to
     * @returns a string you can use to redirect the user to the auth server's login page
     */
    generateLoginUrl: (options?: LoginQueryOptions) => string;
    getAccessGrantTokenFromUrl: () => string | null;
    getToken: () => string | null;
    login: () => Promise<boolean>;
    getRegistry: () => Registry;
    /** sends the registry to the server to check for additions/subtractions on either side */
    syncRegistry: () => Promise<boolean>;
    /** first loads the local indexedDB ydoc for the room. if this.useYSweet is true and ySweetTokens are available will also connect to remote. */
    loadRoom: (room: ServerRoom) => Promise<Room<import("@eweser/shared").Note> | Room<import("@eweser/shared").Flashcard> | Room<import("@eweser/shared").Profile> | {
        indexeddbProvider: import("y-indexeddb").IndexeddbPersistence;
        webRtcProvider: null;
        ySweetProvider: import("@y-sweet/client").YSweetProvider | null | undefined;
        ydoc: YDoc<import("@eweser/shared").Note> | YDoc<import("@eweser/shared").Flashcard> | YDoc<import("@eweser/shared").Profile>;
        id: string;
        name: string;
        collectionKey: "notes" | "flashcards" | "profiles";
        token?: string | null | undefined;
        ySweetUrl?: string | null | undefined;
        publicAccess: "private" | "read" | "write";
        readAccess: string[];
        writeAccess: string[];
        adminAccess: string[];
        createdAt: string;
        updatedAt: string | null;
        _deleted?: boolean | undefined;
        _ttl?: string | null | undefined;
    }>;
    loadRooms: (rooms: Registry) => Promise<void>;
    getDocuments: <T extends Document>(room: Room<T>) => {
        documents: import("yjs-types").TypedMap<import("./types").Documents<T>>;
        get: (id: string) => T | undefined;
        set: (doc: T) => T;
        new: (doc: import("./types").DocumentWithoutBase<T>, id?: string | undefined) => T;
        delete: (id: string, timeToLiveMs?: number | undefined) => T;
        getAll: () => import("./types").Documents<T>;
        getUndeleted: () => import("./types").Documents<T>;
        onChange: (callback: (event: import("yjs").YMapEvent<any>, transaction: import("yjs").Transaction) => void) => void;
        sortByRecent: (docs: import("./types").Documents<T>) => import("./types").Documents<T>;
    };
    getRoom: <T extends Document>(collectionKey: CollectionKey, roomId: string) => Room<T>;
    newRoom: <_T extends Document>() => void;
    constructor(optionsPassed?: DatabaseOptions);
}
