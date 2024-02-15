import type { Database } from '../../';
import {
  buildSpaceroomId,
  getAliasNameFromAlias,
  buildRegistryroomId,
} from './aliasHelpers';
import { createRoom } from './createRoom';
import { getRoomId } from './getRoomId';
import { joinRoomIfNotJoined } from './joinRoomIfNotJoined';

export const getOrCreateSpace = async (_db: Database) => {
  const logger = (message: string) =>
    _db.emit({ event: 'getOrCreateSpace', message });
  logger('starting getOrCreateSpace');
  const matrixClient = _db.matrixClient;
  if (!matrixClient) throw new Error('client not found');

  const userId = _db.userId || matrixClient.getUserId();
  if (!userId) throw new Error('userId not found');

  const spaceroomId = buildSpaceroomId(userId);
  const spaceroomIdName = getAliasNameFromAlias(spaceroomId);
  const roomId = await getRoomId(_db, spaceroomId);
  // if space exists
  if (typeof roomId == 'string') {
    await joinRoomIfNotJoined(_db, roomId);
    return spaceroomId;
  } else {
    try {
      logger('creating space room');
      const createSpaceRoomRes = await createRoom(matrixClient, {
        roomIdName: spaceroomIdName,
        name: 'My Database',
        topic: 'The parent space for all eweser-db rooms',
        spaceRoom: true,
      });
      if (!createSpaceRoomRes.room_id)
        throw new Error('failed to create space');
      logger('created space room');
      return spaceroomId;
    } catch (error: any) {
      if (
        error.message.includes('M_ROOM_IN_USE') ||
        error.message.includes('Room alias already taken')
      ) {
        logger('space room already exists');
        const roomId = await getRoomId(_db, spaceroomId);

        if (typeof roomId === 'string') await joinRoomIfNotJoined(_db, roomId);

        logger('joined space room');
        return spaceroomId;
      } else {
        throw new Error(error);
      }
    }
  }
};

/** creates the registry room on the Matrix server if it doesn't exist. Saves the roomId and roomID to the DB */
export const getOrCreateRegistryRoom = async (
  _db: Database
): Promise<{ registryroomId: string; wasNew: boolean }> => {
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

  const registryroomId = buildRegistryroomId(userId);
  const registryroomIdName = getAliasNameFromAlias(registryroomId);
  registryRoom.roomId = registryroomId;

  const roomId = await getRoomId(_db, registryroomId);

  // if registry exists
  if (typeof roomId === 'string') {
    await joinRoomIfNotJoined(_db, roomId);
    registryRoom.roomId = roomId;
    logger('joined registry room', { wasNew });
    return { registryroomId, wasNew };
  } else {
    try {
      logger('creating registry room');
      const createRegistryRes = await createRoom(matrixClient, {
        roomIdName: registryroomIdName,
        name: 'Database Registry',
        topic:
          'Where the database stores links to all your other rooms -- DO NOT DELETE',
      });

      registryRoom.roomId = createRegistryRes.room_id;
      wasNew = true;
      logger('created registry room', {
        wasNew,
        createRegistryRes,
        registryroomId,
      });
      return { registryroomId, wasNew };
    } catch (error: any) {
      if (
        error.message.includes('M_ROOM_IN_USE') ||
        error.message.includes('Room alias already taken')
      ) {
        logger('registry room already exists', error);
        const registryRoom = _db.collections.registry[0];
        registryRoom.roomId = registryroomId;
        const roomId = await getRoomId(_db, registryroomId);
        if (typeof roomId === 'string') {
          registryRoom.roomId = roomId;
          await joinRoomIfNotJoined(_db, roomId);
        }
        logger('joined existing registry room', {
          wasNew,
          registryRoom,
          roomId,
        });
        return { registryroomId, wasNew };
      } else {
        throw error;
      }
    }
  }
};
