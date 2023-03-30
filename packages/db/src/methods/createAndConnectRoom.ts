import {
  buildRoomAlias,
  createRoom,
  truncateRoomAlias,
} from '../connectionUtils';

import type {
  Documents,
  RegistryData,
  IDatabase,
  CollectionKey,
  ConnectStatus,
} from '../types';

/** pass in undecorated alias. if the final will be # `#<alias>_<username>:matrix.org' just pass <alias> */
export async function createAndConnectRoom(
  this: IDatabase,
  {
    collectionKey,
    aliasName,
    name,
    topic,
    registryStore,
  }: {
    collectionKey: CollectionKey;
    /** undecorated alias */
    aliasName: string;
    name?: string;
    topic?: string;
    registryStore?: {
      documents: Documents<RegistryData>;
    };
  },
  callback?: (status: ConnectStatus) => void
) {
  try {
    if (!this.matrixClient)
      throw new Error("can't create room without matrixClient");
    const userId = this.matrixClient.getUserId();

    if (!userId) throw new Error('userId not found');
    const newRoomAlias = buildRoomAlias(aliasName, userId);
    const newRoomAliasTruncated = truncateRoomAlias(newRoomAlias);
    try {
      const createRoomResult = await createRoom(
        this.matrixClient,
        newRoomAliasTruncated,
        name,
        topic
      );
      // console.log({ createRoomResult });
    } catch (error: any) {
      if (JSON.stringify(error).includes('M_ROOM_IN_USE')) {
        console.log('room already exists');
        await this.matrixClient.joinRoom(newRoomAlias);
      } else throw error;
    }

    return await this.connectRoom(
      newRoomAlias,
      collectionKey,
      registryStore,
      callback
    );
  } catch (error) {
    if (callback) callback('failed');
    console.error(error);
    return false;
  }
}
