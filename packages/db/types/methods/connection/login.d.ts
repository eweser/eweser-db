import type { Database } from '../..';
export declare const login: (db: Database) => (options: {
    loadAllRooms?: boolean;
} | undefined) => Promise<boolean>;
