import { buildAliasFromSeed } from '..';
import type { CollectionKey, IDatabase } from '../types';
import { getRegistry } from '../utils';
import { getAliasSeedFromAlias } from './aliasHelpers';

export const updateRegistryEntry = (
  _db: IDatabase,
  {
    collection,
    roomAliasSeed,
    roomId,
    roomAlias,
    roomName,
  }: {
    collection: CollectionKey;
    roomAliasSeed?: string;
    roomId?: string;
    roomAlias?: string;
    roomName?: string;
  }
) => {
  //make sure we have at least the roomAliasSeed or roomAlias
  if (!roomAliasSeed && !roomAlias)
    throw new Error('must provide roomAliasSeed or roomAlias');

  const seed =
    !roomAliasSeed && roomAlias
      ? getAliasSeedFromAlias(roomAlias)
      : roomAliasSeed;

  if (!seed) throw new Error('could not get seed from alias');
  const alias =
    !roomAlias && roomAliasSeed
      ? buildAliasFromSeed(roomAliasSeed, collection, _db.userId)
      : roomAlias;
  if (!alias) throw new Error('could not get alias from seed');

  const registry = getRegistry(_db);

  const registryDoc = registry.get('0');
  if (!registryDoc) throw new Error('registry document not found');

  const updatedRegistry = {
    ...registryDoc,
    [collection]: {
      ...registryDoc[collection],
      [seed]: {
        ...registryDoc[collection][seed],
        roomAlias: alias,
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (roomId) updatedRegistry[collection][seed]!.roomId = roomId;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (roomName) updatedRegistry[collection][seed]!.roomName = roomName;

  registry.set('0', updatedRegistry);
  return updatedRegistry;
};
