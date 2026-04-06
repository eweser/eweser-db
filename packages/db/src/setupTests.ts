// in case we run into these issues too https://github.com/developit/microbundle/issues/708, otherwise vscode-lib fails
import 'regenerator-runtime/runtime.js';
import 'fake-indexeddb/auto';

if (!globalThis.localStorage) {
  const storage = new Map<string, string>();

  globalThis.localStorage = {
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      const value = storage.get(key);
      return value ?? null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    get length() {
      return storage.size;
    },
  } as Storage;
}
