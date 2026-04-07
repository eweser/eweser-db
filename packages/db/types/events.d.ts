import type { EweDocument } from '@eweser/shared';
import { EventEmitter } from 'events';
import type { Room } from './types';
import type { Database } from '.';
type EmittedEvents = Record<string | symbol, (...args: never[]) => void>;
export declare class TypedEventEmitter<_Events extends EmittedEvents> extends EventEmitter {
}
export type RoomConnectionStatus = 'connected' | 'disconnected' | 'connecting';
export type DatabaseEvents = {
    log: (level: number, ...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    roomLoaded: (room: Room<EweDocument>) => void;
    roomRemoteLoaded: (room: Room<EweDocument>) => void;
    roomsLoaded: (rooms: Room<EweDocument>[]) => void;
    roomsRemotesLoaded: (rooms: Room<EweDocument>[]) => void;
    roomConnectionChange: (status: RoomConnectionStatus, room: Room<EweDocument>) => void;
    onLoggedInChange: (loggedIn: boolean) => void;
    onlineChange: (online: boolean) => void;
    status: (status: {
        db: Database;
        online: boolean;
        hasToken: boolean;
        allRoomsCount: number;
        connectedRoomsCount: number;
        connectedRooms: string[];
        connectingRoomsCount: number;
        connectingRooms: string[];
    }) => void;
    registrySync: (status: 'syncing' | 'success' | 'error', error?: unknown) => void;
    initialized: () => void;
};
export type RoomEvents<T extends EweDocument> = {
    roomConnectionChange: (status: RoomConnectionStatus, room: Room<T>) => void;
};
export declare const setupLogger: (db: Database) => void;
export {};
