import type { CollectionKey, Collections, CollectionToDocument, EweDocument, indexedDBProviderPolyfill, ProviderOptions, Registry } from './types';
import { Room } from './room';
import { TypedEventEmitter } from './events';
import type { DatabaseEvents } from './events';
import type { LocalStoragePolyfill, LocalStorageService } from './utils/localStorageService';
import type { Doc } from 'yjs';
import type { WebrtcProvider } from 'y-webrtc';
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
    indexedDBProviderPolyfill?: indexedDBProviderPolyfill;
    /** provide a list of peers to use instead of the default */
    webRTCPeers?: string[];
    initialRooms?: Registry;
    /** a polyfill for localStorage for react native apps */
    localStoragePolyfill?: LocalStoragePolyfill;
}
export declare class Database extends TypedEventEmitter<DatabaseEvents> {
    userId: string;
    authServer: string;
    online: boolean;
    isPolling: boolean;
    offlineOnly: boolean;
    /** set to false before `db.loginWithToken()` so that offline-first mode is the default, and it upgrades to online sync after login with token */
    useYSweet: boolean;
    useWebRTC: boolean;
    useIndexedDB: boolean;
    indexedDBProviderPolyfill?: indexedDBProviderPolyfill;
    collectionKeys: CollectionKey[];
    collections: Collections;
    registry: Registry;
    accessGrantToken: string;
    webRtcPeers: string[];
    logLevel: number;
    log: (level: number, ...args: any[]) => void;
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
    generateLoginUrl: (options: Partial<import("@eweser/shared").LoginQueryOptions> & {
        name: string;
    }) => string;
    login: (options: {
        loadAllRooms?: boolean | undefined;
    } | undefined) => Promise<boolean>;
    logout: () => void;
    logoutAndClear: () => void;
    getAccessGrantTokenFromUrl: () => string | null;
    getToken: () => string | null;
    refreshYSweetToken: (room: Room<any>) => Promise<import("@eweser/shared").RefreshYSweetTokenRouteResponse | null>;
    loadRoom: (serverRoom: import("@eweser/shared").ServerRoom) => Promise<Room<any>>;
    loadRooms: (rooms: Registry) => Promise<void>;
    syncRegistry: () => Promise<boolean>;
    getRegistry: () => Registry;
    localStoragePolyfill: LocalStoragePolyfill;
    localStorageService: LocalStorageService;
    getDocuments: <T extends EweDocument>(room: Room<T>) => import("./types").GetDocuments<T>;
    getRoom: <T extends EweDocument>(collectionKey: CollectionKey, roomId: string) => Room<T>;
    getRooms<T extends CollectionKey>(collectionKey: T): Room<CollectionToDocument[T]>[];
    /**
     * new rooms must be added to the registry and then synced with the auth server
     * Note: If your app does not have access privileges to the collection, the room won't be synced server-side.
     */
    newRoom: <T extends EweDocument>(options: Room<T>) => Room<T>;
    renameRoom: (room: Room<any>, newName: string) => Promise<import("@eweser/shared").ServerRoom | null>;
    generateShareRoomLink: ({ roomId, invitees, redirectUrl, redirectQueries, expiry, accessType, appName, domain, collections, }: Partial<import("@eweser/shared").LoginQueryOptions> & {
        roomId: string;
        invitees?: string[] | undefined;
        redirectUrl?: string | undefined;
        redirectQueries?: Record<string, string> | undefined;
        expiry?: string | undefined;
        accessType: "read" | "write" | "admin";
        appName: string;
    }) => Promise<string>;
    pingServer: () => Promise<boolean | "" | undefined>;
    tempDocs: {
        [eweserDocRef: string]: {
            doc: Doc;
            provider?: WebrtcProvider;
            awareness?: any;
        };
    };
    constructor(optionsPassed?: DatabaseOptions);
}
