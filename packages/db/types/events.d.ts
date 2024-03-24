/// <reference types="node" />
import type { EweDocument } from '@eweser/shared';
import { EventEmitter } from 'events';
import type { Room } from './types';
import type { Database } from '.';
type EmittedEvents = Record<string | symbol, (...args: any[]) => any>;
export declare class TypedEventEmitter<Events extends EmittedEvents> extends EventEmitter {
    on<E extends keyof Events>(event: (E & string) | symbol, listener: Events[E]): this;
    emit<E extends keyof Events>(event: (E & string) | symbol, ...args: Parameters<Events[E]>): boolean;
}
export type RoomConnectionStatus = 'connected' | 'disconnected' | 'connecting';
export type DatabaseEvents = {
    log: (level: number, ...args: any[]) => void;
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    roomLoaded: (room: Room<any>) => void;
    roomsLoaded: (rooms: Room<any>[]) => void;
    roomConnectionChange: (status: RoomConnectionStatus, room: Room<any>) => void;
    onLoggedInChange: (loggedIn: boolean) => void;
    onlineChange: (online: boolean) => void;
};
export type RoomEvents<T extends EweDocument> = {
    roomConnectionChange: (status: RoomConnectionStatus, room: Room<T>) => void;
};
export declare const setupLogger: (db: Database, logLevel?: number) => void;
export {};
