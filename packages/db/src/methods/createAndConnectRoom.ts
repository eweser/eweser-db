import {
  buildAliasFromSeed,
  createRoom,
  getAliasNameFromAlias,
  getRoomId,
  joinRoomIfNotJoined,
} from '../connectionUtils';
import { waitForRegistryPopulated } from '../connectionUtils/populateRegistry';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';

import type { IDatabase, CollectionKey, CollectionType } from '../types';
import { getRegistry } from '../utils';

/**
 *
 *
 */
export async function createAndConnectRoom<T extends CollectionType>(
  this: IDatabase,
  {
    collectionKey,
    aliasSeed,
    name,
    topic,
  }: {
    collectionKey: CollectionKey;
    /** undecorated alias */
    aliasSeed: string;
    name?: string;
    topic?: string;
  }
) {
  try {
    if (!this.matrixClient)
      throw new Error("can't create room without matrixClient");
    const userId = this.matrixClient.getUserId();

    if (!userId) throw new Error('userId not found');
    const roomAlias = buildAliasFromSeed(aliasSeed, collectionKey, userId);

    const logger = (message: string, data?: any) =>
      this.emit({
        event: 'createAndConnectRoom',
        message,
        data: { roomAlias, collectionKey, raw: data },
      });
    logger('starting createAndConnectRoom', { aliasSeed, name, topic });

    await waitForRegistryPopulated(this);
    const registry = getRegistry(this);
    logger('registry populated', registry.get('0'));

    const roomAliasName = getAliasNameFromAlias(roomAlias);
    try {
      const createRoomResult = await createRoom(this.matrixClient, {
        roomAliasName,
        name,
        topic,
      });
      logger('room created', createRoomResult);

      // save to registry.
      updateRegistryEntry(this, {
        collectionKey,
        roomName: name,
        roomAlias,
        roomId: createRoomResult.room_id,
      });
    } catch (error: any) {
      if (JSON.stringify(error).includes('M_ROOM_IN_USE')) {
        logger('room already exists', error);
        const roomId = await getRoomId(this.matrixClient, roomAlias);
        if (typeof roomId === 'string') {
          await joinRoomIfNotJoined(this.matrixClient, roomId);
          logger('room joined', roomId);
          updateRegistryEntry(this, {
            collectionKey,
            roomName: name,
            roomAlias,
            roomId,
          });
        }
      } else throw error;
    }

    return await this.connectRoom<T>(aliasSeed, collectionKey);
  } catch (error) {
    this.emit({
      event: 'createAndConnectRoom',
      level: 'error',
      message: 'error in createAndConnectRoom',
      data: { collectionKey, raw: { error, aliasSeed } },
    });
    return null;
  }
}
