import type { Database } from '../..';
export declare const logout: (db: Database) => () => void;
export declare const logoutAndClear: (db: Database) => () => void;
