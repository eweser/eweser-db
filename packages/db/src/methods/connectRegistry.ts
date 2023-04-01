import { connectMatrixProvider, getOrCreateRegistry } from '../connectionUtils';
import type { ConnectStatus, IDatabase, RegistryData } from '../types';
import { initializeDocAndLocalProvider } from '../connectionUtils/initializeDoc';

const logStatusChange = (status: ConnectStatus) => {
  console.log('registry status change:', status);
};

export async function connectRegistry<T extends IDatabase>(this: IDatabase) {
  await getOrCreateRegistry(this);

  if (!this.userId) throw new Error('userId not found');

  const { ydoc } = await initializeDocAndLocalProvider<RegistryData>(
    'registry'
  );

  this.collections.registry[0].ydoc = ydoc;

  const connected = await connectMatrixProvider(
    this,
    this.collections.registry[0],
    logStatusChange
  );
  if (!connected) throw new Error('could not connect to registry');
}
