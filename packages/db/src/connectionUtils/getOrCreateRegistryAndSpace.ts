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
  const logger = (message: string) =>
    _db.emit({ event: 'getOrCreateSpace', message });
  logger('starting getOrCreateSpace');
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
      logger('creating space room');
      const createSpaceRoomRes = await createRoom(matrixClient, {
        roomAliasName: spaceRoomAliasName,
        name: 'My Database',
        topic: 'The parent space for all eweser-db rooms',
        spaceRoom: true,
      });
      if (!createSpaceRoomRes.room_id)
        throw new Error('failed to create space');
      logger('created space room');
      return spaceRoomAlias;
    } catch (error: any) {
      if (
        error.message.includes('M_ROOM_IN_USE') ||
        error.message.includes('Room alias already taken')
      ) {
        logger('space room already exists');
        const roomId = await getRoomId(matrixClient, spaceRoomAlias);

        if (typeof roomId === 'string')
          await joinRoomIfNotJoined(matrixClient, roomId);

        logger('joined space room');
        return spaceRoomAlias;
      } else {
        throw new Error(error);
      }
    }
  }
};

/** creates the registry room on the Matrix server if it doesn't exist. Saves the roomAlias and roomID to the DB */
export const getOrCreateRegistryRoom = async (
  _db: IDatabase
): Promise<{ registryRoomAlias: string; wasNew: boolean }> => {
  const logger = (message: string, data?: any) =>
    _db.emit({ event: 'getOrCreateRegistry', message, data: { raw: data } });
  logger('starting getOrCreateRegistry');
  let wasNew = false;
  const registryRoom = _db.collections.registry[0];
  const matrixClient = _db.matrixClient;
  if (!matrixClient) throw new Error('client not found');

  const userId = _db.userId || matrixClient.getUserId();
  if (!userId) throw new Error('userId not found');

  await getOrCreateSpace(_db);
  logger('got space');

  const registryRoomAlias = buildRegistryRoomAlias(userId);
  const registryRoomAliasName = getAliasNameFromAlias(registryRoomAlias);
  registryRoom.roomAlias = registryRoomAlias;

  const roomId = await getRoomId(matrixClient, registryRoomAlias);
  logger('got registry roomId', roomId);

  // if registry exists
  if (typeof roomId === 'string') {
    await joinRoomIfNotJoined(matrixClient, roomId);
    registryRoom.roomId = roomId;
    logger('joined registry room', { wasNew });
    return { registryRoomAlias, wasNew };
  } else {
    try {
      logger('creating registry room');
      const createRegistryRes = await createRoom(matrixClient, {
        roomAliasName: registryRoomAliasName,
        name: 'Database Registry',
        topic:
          'Where the database stores links to all your other rooms -- DO NOT DELETE',
      });

      registryRoom.roomId = createRegistryRes.room_id;
      wasNew = true;
      logger('created registry room', {
        wasNew,
        createRegistryRes,
        registryRoomAlias,
      });
      return { registryRoomAlias, wasNew };
    } catch (error: any) {
      if (
        error.message.includes('M_ROOM_IN_USE') ||
        error.message.includes('Room alias already taken')
      ) {
        logger('registry room already exists', error);
        const registryRoom = _db.collections.registry[0];
        registryRoom.roomAlias = registryRoomAlias;
        const roomId = await getRoomId(matrixClient, registryRoomAlias);
        if (typeof roomId === 'string') {
          registryRoom.roomId = roomId;
          await joinRoomIfNotJoined(matrixClient, roomId);
        }
        logger('joined existing registry room', {
          wasNew,
          registryRoom,
          roomId,
        });
        return { registryRoomAlias, wasNew };
      } else {
        throw new Error(error);
      }
    }
  }
};
