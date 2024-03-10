import type { Database, Room } from '..';

export type DatabaseEvents = {
  log: (level: number, ...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  roomLoaded: (room: Room<any>) => void;
  roomsLoaded: (rooms: Room<any>[]) => void;
  roomConnectionChange: (room: Room<any>, status: string) => void;
  onLoggedInChange: (loggedIn: boolean) => void;
};

export const log: (db: Database) => DatabaseEvents['log'] =
  (db) =>
  (level, ...message) => {
    if (level <= db.logLevel) {
      db.emit('log', level, ...message);
    }
  };
