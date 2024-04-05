import { polyfillWebCrypto } from 'expo-standard-web-crypto';

polyfillWebCrypto();

import SyncStorage from 'sync-storage';

export const localStoragePolyfill = {
  getItem: (key: string) => {
    const test = SyncStorage.get(key);
    console.log({ test });
    return test as any;
  },
  setItem: (key: string, value: string) => {
    const set = SyncStorage.set(key, value).then(console.log);
    console.log({ set });
  },
  removeItem: (key: string) => SyncStorage.remove(key),
  length: SyncStorage.getAllKeys().length,
  clear: () =>
    SyncStorage.getAllKeys().forEach((key) => SyncStorage.remove(key)),
  key: (index: number) => SyncStorage.getAllKeys()[index],
};
