import { buildRoomAlias, createRoom, truncateRoomAlias } from '../utils';

import type {
  Documents,
  RegistryData,
  IDatabase,
  CollectionKey,
} from '../types';

/** pass in undecorated alias. if the final will be # `#<alias>_<username>:matrix.org' just pass <alias> */
export async function createAndConnectRoom(
  this: IDatabase,
  {
    collectionKey,
    alias,
    name,
    topic,
    registryStore,
  }: {
    collectionKey: CollectionKey;
    /** undecorated alias */
    alias: string;
    name?: string;
    topic?: string;
    registryStore?: {
      documents: Documents<RegistryData>;
    };
  }
) {
  try {
    if (!this.matrixClient)
      throw new Error("can't create room without matrixClient");
    const userId = this.matrixClient.getUserId();
    console.log({ userId });
    if (!userId) throw new Error('userId not found');
    const newRoomAlias = buildRoomAlias(alias, userId);
    const newRoomAliasTruncated = truncateRoomAlias(newRoomAlias);
    try {
      const createRoomResult = await createRoom(
        this.matrixClient,
        newRoomAliasTruncated,
        name,
        topic
      );
      console.log({ createRoomResult });
    } catch (error: any) {
      if (JSON.stringify(error).includes('M_ROOM_IN_USE')) {
        // console.log('room already exists');
        await this.matrixClient.joinRoom(newRoomAlias);
      } else throw error;
    }

    await this.connectRoom(newRoomAlias, collectionKey, registryStore);
    return alias;
  } catch (error) {
    console.error(error);
    return false;
  }
}
