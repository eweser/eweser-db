import {
  connectMatrixProvider,
  getOrCreateRegistryRoom,
} from '../connectionUtils';
import type { RegistryData } from '../types';
import { initializeDocAndLocalProvider } from '../connectionUtils/initializeDoc';
import { populateRegistry } from '../connectionUtils/populateRegistry';
import { getRegistry } from '../utils';
import type { Database } from '..';

/** initializes the registry's ydoc and matrix provider */
export const connectRegistry = (_db: Database) => async () => {
  const logger = (message: string, data?: any) =>
    _db.emit({
      event: '.connectRegistry',
      message,
      data: { raw: data },
    });
  const { wasNew } = await getOrCreateRegistryRoom(_db);

  if (!_db.userId) throw new Error('userId not found');

  const { ydoc } = await initializeDocAndLocalProvider<RegistryData>(
    'registry'
  );
  logger('ydoc initialized', ydoc);
  _db.collections.registry[0].ydoc = ydoc;

  const connected = await connectMatrixProvider(
    _db,
    _db.collections.registry[0]
  );

  if (wasNew) {
    await populateRegistry(_db);
  }
  if (!connected) throw new Error('could not connect to registry');

  logger('registry connected', getRegistry(_db));
  return getRegistry(_db);
};
