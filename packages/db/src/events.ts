/* eslint-disable no-console -- this IS the logger implementation */
import type { EweDocument } from '@eweser/shared';
import type { Room } from './types';
import type { Database } from '.';

type EmittedEvents = Record<string | symbol, (...args: never[]) => void>;

type Listener = (...args: unknown[]) => void;

/** Minimal browser-compatible typed event emitter (no Node.js 'events' dependency). */
export class TypedEventEmitter<Events extends EmittedEvents> {
  private _listeners: Map<string | symbol, Set<Listener>> = new Map();

  on<K extends keyof Events>(event: K, listener: Events[K]): this {
    const key = event as string | symbol;
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    const listeners = this._listeners.get(key);
    if (listeners) {
      listeners.add(listener as unknown as Listener);
    }
    return this;
  }

  off<K extends keyof Events>(event: K, listener: Events[K]): this {
    this._listeners
      .get(event as string | symbol)
      ?.delete(listener as unknown as Listener);
    return this;
  }

  emit<K extends keyof Events>(
    event: K,
    ...args: Parameters<Events[K]>
  ): boolean {
    const listeners = this._listeners.get(event as string | symbol);
    if (!listeners || listeners.size === 0) return false;
    listeners.forEach((l) => l(...(args as unknown[])));
    return true;
  }

  once<K extends keyof Events>(event: K, listener: Events[K]): this {
    const wrapper: Listener = (...args) => {
      this.off(event, listener);

      (listener as unknown as Listener)(...args);
    };

    return this.on(event, wrapper as unknown as Events[K]);
  }

  removeAllListeners<K extends keyof Events>(event?: K): this {
    if (event !== undefined) {
      this._listeners.delete(event as string | symbol);
    } else {
      this._listeners.clear();
    }
    return this;
  }
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
  roomConnectionChange: (
    status: RoomConnectionStatus,
    room: Room<EweDocument>
  ) => void;
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
  registrySync: (
    status: 'syncing' | 'success' | 'error',
    error?: unknown
  ) => void;
  initialized: () => void;
};

export type RoomEvents<T extends EweDocument> = {
  roomConnectionChange: (status: RoomConnectionStatus, room: Room<T>) => void;
};

export const setupLogger = (db: Database) => {
  db.on('log', (level, ...message) => {
    switch (level) {
      case 0:
        return console.info(...message);
      case 1:
        return console.log(...message);
      case 2:
        return console.warn(...message);
      case 3:
        return console.error(...message);
    }
  });
};
