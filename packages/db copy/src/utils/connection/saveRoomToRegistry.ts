import type { Database } from '../../';
import { buildAliasFromSeed, getRegistry } from '../';
import type { CollectionKey } from '../../types';

import { getroomIdFromAlias } from './aliasHelpers';

export const updateRegistryEntry = (
  _db: Database,
  {
    collectionKey,
    roomId,
    roomId,
    roomId,
    roomName,
  }: {
    collectionKey: CollectionKey;
    roomId?: string;
    roomId?: string;
    roomId?: string;
    roomName?: string;
  }
) => {
  const logger = (message: string, data?: any) =>
    _db.emit({
      event: 'updateRegistry',
      message,
      data: { roomId, collectionKey, roomId, raw: data },
    });
  logger('starting updateRegistryEntry', {
    roomId,
    roomName,
  });

  //make sure we have at least the roomId or roomId
  if (!roomId && !roomId) throw new Error('must provide roomId or roomId');

  const seed = !roomId && roomId ? getroomIdFromAlias(roomId) : roomId;

  if (!seed) throw new Error('could not get seed from alias');
  const alias =
    !roomId && roomId
      ? buildAliasFromSeed(roomId, collectionKey, _db.userId)
      : roomId;
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
        roomId: alias,
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
