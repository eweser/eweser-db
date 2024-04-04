import type { Database } from '..';
import type { Registry } from '../types';
export declare enum LocalStorageKey {
    roomRegistry = "room_registry",
    accessGrantToken = "access_grant_token"
}
export type LocalStorageService = {
    getItem: <T = any>(key: LocalStorageKey) => T | null;
    setItem: <T = any>(key: LocalStorageKey, value: T) => void;
    removeItem: (key: LocalStorageKey) => void;
};
export declare const localStorageSet: (key: LocalStorageKey, value: any) => void;
export declare const localStorageGet: <T>(key: LocalStorageKey) => T | null;
export declare const localStorageRemove: (key: LocalStorageKey) => void;
export declare const getLocalRegistry: (db: Database) => () => Registry;
export declare const setLocalRegistry: (db: Database) => (registry: Registry) => void;
export declare const clearLocalRegistry: (db: Database) => () => void;
export declare const getLocalAccessGrantToken: (db: Database) => () => string | null;
export declare const setLocalAccessGrantToken: (db: Database) => (token: string) => void;
export declare const clearLocalAccessGrantToken: (db: Database) => () => void;
