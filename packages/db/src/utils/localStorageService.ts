import type { Registry } from '../types';

enum LocalStorageKey {
  roomRegistry = 'room_registry',
  accessGrantToken = 'access_grant_token',
}
const localStorageSet = (key: LocalStorageKey, value: any) => {
  localStorage.setItem('ewe_' + key, JSON.stringify(value));
};
const localStorageGet = <T>(key: LocalStorageKey): T | null => {
  const value = localStorage.getItem('ewe_' + key);
  if (!value) return null;
  return JSON.parse(value) as T;
};

export function getLocalRegistry() {
  const registry = localStorageGet<Registry>(LocalStorageKey.roomRegistry);
  if (typeof registry === 'object' && Array.isArray(registry)) {
    return registry;
  }
  return [];
}

export function setLocalRegistry(registry: Registry) {
  localStorageSet(LocalStorageKey.roomRegistry, registry);
}

export function getLocalAccessGrantToken() {
  return localStorageGet<string>(LocalStorageKey.accessGrantToken);
}

export function setLocalAccessGrantToken(token: string) {
  localStorageSet(LocalStorageKey.accessGrantToken, token);
}
