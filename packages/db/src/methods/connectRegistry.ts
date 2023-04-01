import { connectMatrixProvider, getOrCreateRegistry } from '../connectionUtils';
import type { ConnectStatus, IDatabase, RegistryData } from '../types';
import { initializeDocAndLocalProvider } from '../connectionUtils/initializeDoc';
import { populateRegistry } from '../connectionUtils/populateRegistry';

/** initializes the registry's ydoc and matrix provider */
export async function connectRegistry(this: IDatabase) {
  const { wasNew } = await getOrCreateRegistry(this);

  if (!this.userId) throw new Error('userId not found');

  const { ydoc } = await initializeDocAndLocalProvider<RegistryData>(
    'registry'
  );

  this.collections.registry[0].ydoc = ydoc;

  const connected = await connectMatrixProvider(
    this,
    this.collections.registry[0]
  );

  if (wasNew) {
    await populateRegistry(this);
  }
  if (!connected) throw new Error('could not connect to registry');
}
