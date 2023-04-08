import type { Database } from '..';
import { buildAliasFromSeed } from '..';
import type { CollectionKey } from '../types';
import { getRegistry } from '../utils';
import { getAliasSeedFromAlias } from './aliasHelpers';

export const updateRegistryEntry = (
  _db: Database,
  {
    collectionKey,
    aliasSeed,
    roomId,
    roomAlias,
    roomName,
  }: {
    collectionKey: CollectionKey;
    aliasSeed?: string;
    roomId?: string;
    roomAlias?: string;
    roomName?: string;
  }
) => {
  const logger = (message: string, data?: any) =>
    _db.emit({
      event: 'updateRegistryEntry',
      message,
      data: { roomAlias, collectionKey, roomId, raw: data },
    });
  logger('starting updateRegistryEntry', {
    aliasSeed,
    roomName,
  });

  //make sure we have at least the aliasSeed or roomAlias
  if (!aliasSeed && !roomAlias)
    throw new Error('must provide aliasSeed or roomAlias');

  const seed =
    !aliasSeed && roomAlias ? getAliasSeedFromAlias(roomAlias) : aliasSeed;

  if (!seed) throw new Error('could not get seed from alias');
  const alias =
    !roomAlias && aliasSeed
      ? buildAliasFromSeed(aliasSeed, collectionKey, _db.userId)
      : roomAlias;
  if (!alias) throw new Error('could not get alias from seed');

  const registry = getRegistry(_db);

  const registryDoc = registry.get('0');
  logger('current registry', registryDoc);

  if (!registryDoc) throw new Error('registry document not found');

  const updatedRegistry = {
    ...registryDoc,
    [collectionKey]: {
      ...registryDoc[collectionKey],
      [seed]: {
        ...registryDoc[collectionKey][seed],
        roomAlias: alias,
      },
    },
  };
  logger('updated registry', updatedRegistry);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (roomId) updatedRegistry[collectionKey][seed]!.roomId = roomId;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (roomName) updatedRegistry[collectionKey][seed]!.roomName = roomName;

  registry.set('0', updatedRegistry);
  logger('registry updated');
  return updatedRegistry;
};
