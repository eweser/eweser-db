import {
  connectMatrixProvider,
  getOrCreateRegistryRoom,
} from '../connectionUtils';
import type { IDatabase, RegistryData } from '../types';
import { initializeDocAndLocalProvider } from '../connectionUtils/initializeDoc';
import { populateRegistry } from '../connectionUtils/populateRegistry';
import { getRegistry } from '../utils';

/** initializes the registry's ydoc and matrix provider */
export async function connectRegistry(this: IDatabase) {
  const logger = (message: string, data?: any) =>
    this.emit({
      event: 'DB.connectRegistry',
      message,
      data: { raw: data },
    });
  const { wasNew } = await getOrCreateRegistryRoom(this);

  if (!this.userId) throw new Error('userId not found');

  const { ydoc } = await initializeDocAndLocalProvider<RegistryData>(
    'registry'
  );
  logger('ydoc initialized', ydoc);
  this.collections.registry[0].ydoc = ydoc;

  const connected = await connectMatrixProvider(
    this,
    this.collections.registry[0]
  );

  if (wasNew) {
    await populateRegistry(this);
  }
  if (!connected) throw new Error('could not connect to registry');

  logger('registry connected', getRegistry(this));
  return getRegistry(this);
}