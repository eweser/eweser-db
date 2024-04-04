import { getLocalRegistry } from '../utils/localStorageService';
import type { Database } from '..';

export const getRegistry = (db: Database) => () => {
  if (db.registry.length > 0) {
    return db.registry;
  } else {
    const localRegistry = getLocalRegistry(db)();
    if (localRegistry) {
      db.registry = localRegistry;
    }
    return db.registry;
  }
};
