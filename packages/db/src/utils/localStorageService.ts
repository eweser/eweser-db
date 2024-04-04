import type { Database } from '..';
import type { Registry } from '../types';

export enum LocalStorageKey {
  roomRegistry = 'room_registry',
  accessGrantToken = 'access_grant_token',
}

export type LocalStoragePolyfill = Storage;

export type LocalStorageService = {
  getItem: <T = any>(key: LocalStorageKey) => T | null;
  setItem: <T = any>(key: LocalStorageKey, value: T) => void;
  removeItem: (key: LocalStorageKey) => void;
};
export const localStorageSet =
  (db: Database) => (key: LocalStorageKey, value: any) => {
    db.localStoragePolyfill.setItem('ewe_' + key, JSON.stringify(value));
  };
export const localStorageGet =
  (db: Database) =>
  <T>(key: LocalStorageKey): T | null => {
    const value = db.localStoragePolyfill.getItem('ewe_' + key);
    if (!value) return null;
    return JSON.parse(value) as T;
  };
export const localStorageRemove = (db: Database) => (key: LocalStorageKey) => {
  db.localStoragePolyfill.removeItem('ewe_' + key);
};

// Helpers

export const getLocalRegistry = (db: Database) => () => {
  const registry = db.localStorageService.getItem<Registry>(
    LocalStorageKey.roomRegistry
  );
  if (typeof registry === 'object' && Array.isArray(registry)) {
    return registry;
  }
  return [];
};

export const setLocalRegistry = (db: Database) => (registry: Registry) => {
  db.localStorageService.setItem(LocalStorageKey.roomRegistry, registry);
};
export const clearLocalRegistry = (db: Database) => () => {
  db.localStorageService.removeItem(LocalStorageKey.roomRegistry);
};

export const getLocalAccessGrantToken = (db: Database) => () => {
  return db.localStorageService.getItem<string>(
    LocalStorageKey.accessGrantToken
  );
};

export const setLocalAccessGrantToken = (db: Database) => (token: string) => {
  db.localStorageService.setItem(LocalStorageKey.accessGrantToken, token);
};

export const clearLocalAccessGrantToken = (db: Database) => () => {
  db.localStorageService.removeItem(LocalStorageKey.accessGrantToken);
};
