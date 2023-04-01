import {
  buildAliasFromSeed,
  createRoom,
  getAliasNameFromAlias,
  getRoomId,
  joinRoomIfNotJoined,
} from '../connectionUtils';
import { waitForRegistryPopulated } from '../connectionUtils/populateRegistry';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';

import type { IDatabase, CollectionKey, ConnectStatus } from '../types';

/**
 *
 *
 */
export async function createAndConnectRoom(
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
  },
  callback?: (status: ConnectStatus) => void
) {
  try {
    if (!this.matrixClient)
      throw new Error("can't create room without matrixClient");
    const userId = this.matrixClient.getUserId();

    if (!userId) throw new Error('userId not found');

    await waitForRegistryPopulated(this);

    const roomAlias = buildAliasFromSeed(aliasSeed, collectionKey, userId);
    const roomAliasName = getAliasNameFromAlias(roomAlias);
    try {
      const createRoomResult = await createRoom(this.matrixClient, {
        roomAliasName,
        name,
        topic,
      });
      // save to registry.
      updateRegistryEntry(this, {
        collectionKey,
        roomName: name,
        roomAlias,
        roomId: createRoomResult.room_id,
      });
      // console.log({ createRoomResult });
    } catch (error: any) {
      if (JSON.stringify(error).includes('M_ROOM_IN_USE')) {
        console.log('room already exists');
        const roomId = await getRoomId(this.matrixClient, roomAlias);
        if (typeof roomId === 'string') {
          await joinRoomIfNotJoined(this.matrixClient, roomId);
          updateRegistryEntry(this, {
            collectionKey,
            roomName: name,
            roomAlias,
            roomId,
          });
        }
      } else throw error;
    }

    return await this.connectRoom(aliasSeed, collectionKey);
  } catch (error) {
    if (callback) callback('failed');
    console.error(error);
    return false;
  }
}
