import type { MatrixClient } from 'matrix-js-sdk';
import type { IDatabase } from '../types';
import {
  buildSpaceRoomAlias,
  getAliasNameFromAlias,
  buildRegistryRoomAlias,
} from './aliasHelpers';
import { createRoom } from './createRoom';
import { getRoomId } from './getRoomId';
import { joinRoomIfNotJoined } from './joinRoomIfNotJoined';

export const getOrCreateSpace = async (_db: IDatabase) => {
  const createSpaceLogger = (message: string) =>
    _db.emit({ event: 'getOrCreateSpace', message });
  createSpaceLogger('starting getOrCreateSpace');
  const matrixClient = _db.matrixClient;
  if (!matrixClient) throw new Error('client not found');

  const userId = _db.userId || matrixClient.getUserId();
  if (!userId) throw new Error('userId not found');

  const spaceRoomAlias = buildSpaceRoomAlias(userId);
  const spaceRoomAliasName = getAliasNameFromAlias(spaceRoomAlias);
  const roomId = await getRoomId(matrixClient, spaceRoomAlias);
  // if space exists
  if (typeof roomId == 'string') {
    await joinRoomIfNotJoined(matrixClient, roomId);
    return spaceRoomAlias;
  } else {
    try {
      createSpaceLogger('creating space room');
      const createSpaceRoomRes = await createRoom(matrixClient, {
        roomAliasName: spaceRoomAliasName,
        name: 'My Database',
        topic: 'The parent space for all eweser-db rooms',
        spaceRoom: true,
      });
      if (!createSpaceRoomRes.room_id)
        throw new Error('failed to create space');
      createSpaceLogger('created space room');
      return spaceRoomAlias;
    } catch (error: any) {
      if (
        error.message.includes('M_ROOM_IN_USE') ||
        error.message.includes('Room alias already taken')
      ) {
        createSpaceLogger('space room already exists');
        const roomId = await getRoomId(matrixClient, spaceRoomAlias);

        if (typeof roomId === 'string')
          await joinRoomIfNotJoined(matrixClient, roomId);

        createSpaceLogger('joined space room');
        return spaceRoomAlias;
      } else {
        throw new Error(error);
      }
    }
  }
};

/** creates the registry room on the Matrix server if it doesn't exist. Saves the roomAlias and roomID to the DB */
export const getOrCreateRegistry = async (
  _db: IDatabase
): Promise<{ registryRoomAlias: string; wasNew: boolean }> => {
  const createRegistryLogger = (message: string) =>
    _db.emit({ event: 'getOrCreateRegistry', message });
  createRegistryLogger('starting getOrCreateRegistry');

  const registryRoom = _db.collections.registry[0];
  const matrixClient = _db.matrixClient;
  if (!matrixClient) throw new Error('client not found');

  const userId = _db.userId || matrixClient.getUserId();
  if (!userId) throw new Error('userId not found');

  await getOrCreateSpace(_db);
  createRegistryLogger('got space');

  const registryRoomAlias = buildRegistryRoomAlias(userId);
  const registryRoomAliasName = getAliasNameFromAlias(registryRoomAlias);
  registryRoom.roomAlias = registryRoomAlias;

  const roomId = await getRoomId(matrixClient, registryRoomAlias);
  createRegistryLogger('got registry roomId');

  // if registry exists
  if (typeof roomId === 'string') {
    await joinRoomIfNotJoined(matrixClient, roomId);
    registryRoom.roomId = roomId;
    createRegistryLogger('joined registry room');
    return { registryRoomAlias, wasNew: false };
  } else {
    try {
      createRegistryLogger('creating registry room');
      const createRegistryRes = await createRoom(matrixClient, {
        roomAliasName: registryRoomAliasName,
        name: 'Database Registry',
        topic:
          'Where the database stores links to all your other rooms -- DO NOT DELETE',
      });

      registryRoom.roomId = createRegistryRes.room_id;

      return { registryRoomAlias, wasNew: true };
    } catch (error: any) {
      if (
        error.message.includes('M_ROOM_IN_USE') ||
        error.message.includes('Room alias already taken')
      ) {
        createRegistryLogger('registry room already exists');
        const registryRoom = _db.collections.registry[0];
        registryRoom.roomAlias = registryRoomAlias;
        const roomId = await getRoomId(matrixClient, registryRoomAlias);
        if (typeof roomId === 'string') {
          registryRoom.roomId = roomId;
          await joinRoomIfNotJoined(matrixClient, roomId);
        }
        return { registryRoomAlias, wasNew: false };
      } else {
        throw new Error(error);
      }
    }
  }
};
