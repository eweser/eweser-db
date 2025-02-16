import type { Database } from '..';
import {
  buildAliasFromSeed,
  createRoom,
  getAliasNameFromAlias,
  getRoomId,
  joinRoomIfNotJoined,
  waitForRegistryPopulated,
  updateRegistryEntry,
} from '../utils';

import type { Document, Room, CreateAndConnectRoomOptions } from '../types';
import { getRegistry } from '../utils';

export const createAndConnectRoom =
  (_db: Database) =>
  async <T extends Document>({
    collectionKey,
    roomId,
    name,
    topic,
    initialValues,
  }: CreateAndConnectRoomOptions<T>): Promise<Room<T>> => {
    try {
      if (!_db.matrixClient)
        throw new Error("can't create room without matrixClient");
      const userId = _db.matrixClient.getUserId();

      if (!userId) throw new Error('userId not found');
      const roomId = buildAliasFromSeed(roomId, collectionKey, userId);

      const logger = (message: string, data?: any) =>
        _db.emit({
          event: 'createAndConnectRoom',
          message,
          data: { roomId, collectionKey, raw: data },
        });
      logger('starting createAndConnectRoom', { roomId, name, topic });

      const registryReady = await waitForRegistryPopulated(_db, 30000);
      if (!registryReady) throw new Error('registry not ready');

      const registry = getRegistry(_db);
      logger('registry was already populated', registry.get('0'));

      const roomIdName = getAliasNameFromAlias(roomId);
      try {
        const createRoomResult = await createRoom(_db.matrixClient, {
          roomIdName,
          name,
          topic,
        });
        logger('room created', createRoomResult);

        // save to registry.
        updateRegistryEntry(_db, {
          collectionKey,
          roomName: name,
          roomId,
          roomId: createRoomResult.room_id,
        });
      } catch (error: any) {
        if (JSON.stringify(error).includes('M_ROOM_IN_USE')) {
          logger('room already exists', error);
          const roomId = await getRoomId(_db, roomId);
          if (typeof roomId === 'string') {
            await joinRoomIfNotJoined(_db, roomId);
            logger('room joined', roomId);
            updateRegistryEntry(_db, {
              collectionKey,
              roomName: name,
              roomId,
              roomId,
            });
          }
        } else throw error;
      }

      const connectResult = await _db.connectRoom<T>({
        roomId,
        collectionKey,
        initialValues,
      });
      if (typeof connectResult === 'string') {
        throw new Error(connectResult);
      }
      return connectResult;
    } catch (error) {
      _db.emit({
        event: 'createAndConnectRoom',
        level: 'error',
        message: 'error in createAndConnectRoom',
        data: { collectionKey, raw: { error, roomId } },
      });
      throw error;
    }
  };
