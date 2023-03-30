import type { MatrixClient } from 'matrix-js-sdk';
import type { IDatabase } from '../types';
import { CollectionKey } from '../types';
import {
  buildSpaceRoomAlias,
  truncateRoomAlias,
  buildRegistryRoomAlias,
} from './aliasHelpers';
import { createRoom } from './createRoom';
import { getRoomId } from './getRoomId';
import { joinRoomIfNotJoined } from './joinRoomIfNotJoined';

export const getOrCreateSpace = async (
  matrixClient: MatrixClient,
  userId: string
) => {
  const spaceRoomAlias = buildSpaceRoomAlias(userId);
  const spaceRoomAliasTruncated = truncateRoomAlias(spaceRoomAlias);
  const roomId = await getRoomId(matrixClient, spaceRoomAlias);
  // if space exists
  if (typeof roomId == 'string') {
    await joinRoomIfNotJoined(matrixClient, roomId);
    return spaceRoomAlias;
  } else {
    try {
      console.log('creating space room');
      const createSpaceRoomRes = await createRoom(
        matrixClient,
        spaceRoomAliasTruncated,
        'My Database',
        'The parent space for all eweser-db rooms',
        false,
        true
      );
      console.log({ createSpaceRoomRes });
      return spaceRoomAlias;
    } catch (error: any) {
      console.log(error.message, 'error creating space room');
      if (
        error.message.includes('M_ROOM_IN_USE') ||
        error.message.includes('Room alias already taken')
      ) {
        console.log('space room already exists');
        const roomId = await getRoomId(matrixClient, spaceRoomAlias);

        if (typeof roomId === 'string')
          await joinRoomIfNotJoined(matrixClient, roomId);
        return spaceRoomAlias;
      } else {
        throw new Error(error);
      }
    }
  }
};

export const getOrCreateRegistry = async (_db: IDatabase) => {
  const matrixClient = _db.matrixClient;
  if (!matrixClient) throw new Error('client not found');
  const userId = matrixClient.getUserId();
  // console.log({ userId });
  if (!userId) throw new Error('userId not found');
  const space = await getOrCreateSpace(matrixClient, userId);
  const registryRoomAlias = buildRegistryRoomAlias(userId);
  const registryRoomAliasTruncated = truncateRoomAlias(registryRoomAlias);
  const roomId = await getRoomId(matrixClient, registryRoomAlias);
  // if registry exists
  if (typeof roomId === 'string') {
    await joinRoomIfNotJoined(matrixClient, roomId);
    return registryRoomAlias;
  } else {
    try {
      console.log('creating registry room');
      const createRegistryRes = await createRoom(
        matrixClient,
        registryRoomAliasTruncated,
        'Database Registry',
        'Where the database stores links to all your other rooms -- DO NOT DELETE'
      );
      _db.collections[CollectionKey.registry][0].roomAlias = registryRoomAlias;
      _db.collections.registry[0].roomId = createRegistryRes.room_id;
      return registryRoomAlias;
    } catch (error: any) {
      if (
        error.message.includes('M_ROOM_IN_USE') ||
        error.message.includes('Room alias already taken')
      ) {
        console.log('registry room already exists');
        _db.collections.registry[0].roomAlias = registryRoomAlias;
        const roomId = await getRoomId(matrixClient, registryRoomAlias);
        if (typeof roomId === 'string')
          await joinRoomIfNotJoined(matrixClient, roomId);
        return registryRoomAlias;
      } else {
        throw new Error(error);
      }
    }
  }
};
