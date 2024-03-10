import type { Room, YDoc } from '../../types';
import type { ServerRoom } from '@eweser/shared';
import { initializeDocAndLocalProvider } from '../../utils/connection/initializeDoc';
import { createYjsProvider } from '@y-sweet/client';
import type { Doc } from 'yjs';
import type { Database } from '../..';
import type { RoomConnectionStatus } from '../../events';

const validate = (room: ServerRoom) => {
  if (!room) {
    throw new Error('room is required');
  }
  const { id: roomId, collectionKey } = room;
  if (!roomId) {
    throw new Error('roomId is required');
  }
  if (!collectionKey) {
    throw new Error('collectionKey is required');
  }
  return { roomId, collectionKey };
};

const checkLoadedState =
  (db: Database) => (room: Room<any>, token: string | null) => {
    const localLoaded = room && room.ydoc && room.indexedDbProvider;
    const shouldLoadYSweet = db.useYSweet && token && room && room.ySweetUrl;
    const ySweetLoaded =
      token && room && room.ySweetProvider && room.token === token;

    return { localLoaded, ySweetLoaded, shouldLoadYSweet };
  };

/** first loads the local indexedDB ydoc for the room. if this.useYSweet is true and ySweetTokens are available will also connect to remote. */
export const loadRoom = (db: Database) => async (serverRoom: ServerRoom) => {
  const { roomId, collectionKey } = validate(serverRoom);
  db.info('loading room', serverRoom);

  const room: Room<any> = db.collections[collectionKey][roomId] ?? {
    ...serverRoom,
    ydoc: undefined,
    indexedDbProvider: null,
    ySweetProvider: null,
    webRtcProvider: null,
  };

  const emitConnectionChange = (status: RoomConnectionStatus) => {
    room.emit('roomConnectionChange', status, room);
    db.emit('roomConnectionChange', status, room);
  };

  const { localLoaded, ySweetLoaded, shouldLoadYSweet } = checkLoadedState(db)(
    room,
    serverRoom.token
  );

  if (localLoaded && (!shouldLoadYSweet || ySweetLoaded)) {
    db.debug('room already loaded', room);
    return room;
  }

  if (!localLoaded) {
    const { ydoc: newYDoc, localProvider } =
      await initializeDocAndLocalProvider(roomId);

    room.ydoc = newYDoc;
    room.indexedDbProvider = localProvider;
    db.debug(
      'initialized ydoc and localProvider',
      room.ydoc,
      room.indexedDbProvider
    );
  }

  if (shouldLoadYSweet && !ySweetLoaded) {
    const ySweetProvider = createYjsProvider(room.ydoc as Doc, {
      url: room.ySweetUrl ?? '', // checked in shouldLoadYSweet
      token: room.token ?? '', // checked in shouldLoadYSweet
      docId: roomId,
    });

    // update the room's ydoc with the new provider attached
    room.ydoc = ySweetProvider.doc as YDoc<any>;
    room.ySweetProvider = ySweetProvider;

    ySweetProvider.on('status', (status: any) => {
      emitConnectionChange(status);
    });
    ySweetProvider.on('connection-error', async (error: any) => {
      db.error('ySweetProvider error', error);
      emitConnectionChange('disconnected');

      await db.refreshYSweetToken(db.collections[collectionKey][roomId]);
    });
    ySweetProvider.on('sync', (synced: boolean) => {
      emitConnectionChange(synced ? 'connected' : 'disconnected');

      db.debug('ySweetProvider synced', synced);
    });
    db.debug('created ySweetProvider', ySweetProvider);
    ySweetProvider.connect();
  }

  // Save the room to the db
  db.collections[collectionKey][roomId] = room;
  db.emit('roomLoaded', room);
  return room;
};
