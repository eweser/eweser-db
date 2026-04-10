import type { EweDocument } from '@eweser/shared';
import type { Room } from './types';
import type { Database } from '.';
type EmittedEvents = Record<string | symbol, (...args: never[]) => void>;
/** Minimal browser-compatible typed event emitter (no Node.js 'events' dependency). */
export declare class TypedEventEmitter<Events extends EmittedEvents> {
    private _listeners;
    on<K extends keyof Events>(event: K, listener: Events[K]): this;
    off<K extends keyof Events>(event: K, listener: Events[K]): this;
    emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): boolean;
    once<K extends keyof Events>(event: K, listener: Events[K]): this;
    removeAllListeners<K extends keyof Events>(event?: K): this;
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
