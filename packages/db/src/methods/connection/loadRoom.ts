import { Room } from '../../room';
import type { YDoc } from '../../types';
import { isTokenExpired, type ServerRoom } from '@eweser/shared';
import { initializeDocAndLocalProvider } from '../../utils/connection/initializeDoc';
import { createYjsProvider } from '@y-sweet/client';
import type { Doc } from 'yjs';
import type { Database } from '../..';
import type { RoomConnectionStatus } from '../../events';

function validate(room: ServerRoom) {
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
}

function checkLoadedState(db: Database) {
  return (room: Room<any>, token: string | null) => {
    const localLoaded = room && room.ydoc && room.indexedDbProvider;
    const shouldLoadYSweet = db.useYSweet && token && room && room.ySweetUrl;
    const ySweetLoaded =
      token &&
      room &&
      room.ySweetProvider &&
      room.token === token &&
      room.tokenExpiry &&
      !isTokenExpired(room.tokenExpiry);

    return { localLoaded, ySweetLoaded, shouldLoadYSweet };
  };
}
async function loadLocal(db: Database, room: Room<any>) {
  const { yDoc: ydoc, localProvider } = await initializeDocAndLocalProvider(
    room.id
  );

  room.ydoc = ydoc;
  room.indexedDbProvider = localProvider;
  db.debug(
    'initialized ydoc and localProvider',
    room.ydoc,
    room.indexedDbProvider
  );
}

async function loadYSweet(db: Database, room: Room<any>) {
  function emitConnectionChange(status: RoomConnectionStatus) {
    room.emit('roomConnectionChange', status, room);
    db.emit('roomConnectionChange', status, room);
  }
  const handleStatusChange = emitConnectionChange;
  function handleSync(synced: boolean) {
    emitConnectionChange(synced ? 'connected' : 'disconnected');
    db.debug('ySweetProvider synced', synced);
  }
  async function handleConnectionError(error: any) {
    db.error('ySweetProvider error', error);
    emitConnectionChange('disconnected');
    // because this is a change listener, it could be called many times. In order to prevent an infinite loop of retries, we will only allow 3 retries.
    if (room.connectionRetries < 3) {
      room.connectionRetries++;
      checkTokenAndConnectProvider();
    }
  }

  async function checkTokenAndConnectProvider() {
    if (room.tokenExpiry && isTokenExpired(room.tokenExpiry)) {
      const refreshed = await db.refreshYSweetToken(room);
      db.debug(
        'refreshed token. success: ',
        refreshed?.token && refreshed.ySweetUrl && refreshed.tokenExpiry
      );
      if (refreshed?.token && refreshed.ySweetUrl && refreshed.tokenExpiry) {
        room.token = refreshed.token;
        room.tokenExpiry = refreshed.tokenExpiry;
        room.ySweetUrl = refreshed.ySweetUrl;
      }
    }
    room.ySweetProvider = createYjsProvider(room.ydoc as Doc, {
      url: room.ySweetUrl ?? '',
      token: room.token ?? '',
      docId: room.id,
    });
    // update the room's ydoc with the new provider attached
    room.ydoc = room.ySweetProvider.doc as YDoc<any>;
    room.ySweetProvider.on('status', handleStatusChange);
    room.ySweetProvider.on('sync', handleSync);
    room.ySweetProvider.on('connection-error', handleConnectionError);
    room.ySweetProvider.connect();
  }
  await checkTokenAndConnectProvider();

  db.debug('created ySweetProvider', room.ySweetProvider);

  room.disconnect = () => {
    room.ySweetProvider?.off('status', handleStatusChange);
    room.ySweetProvider?.off('sync', handleSync);
    room.ySweetProvider?.off('connection-error', handleConnectionError);
    room.ySweetProvider?.disconnect();
    room.webRtcProvider?.disconnect();
  };
}

/** first loads the local indexedDB ydoc for the room. if this.useYSweet is true and ySweetTokens are available will also connect to remote. IF a connection error, will  */
export const loadRoom = (db: Database) => async (serverRoom: ServerRoom) => {
  const { roomId, collectionKey } = validate(serverRoom);
  db.info('loading room', serverRoom);

  const room: Room<any> =
    db.collections[collectionKey][roomId] ?? new Room(serverRoom);

  const { localLoaded, ySweetLoaded, shouldLoadYSweet } = checkLoadedState(db)(
    room,
    serverRoom.token
  );

  if (localLoaded && (!shouldLoadYSweet || ySweetLoaded)) {
    db.debug('room already loaded', room);
    return room;
  }

  if (!localLoaded) {
    await loadLocal(db, room);
  }

  if (shouldLoadYSweet && !ySweetLoaded) {
    await loadYSweet(db, room);
  }

  // Save the room to the db
  db.collections[collectionKey][roomId] = room;
  db.emit('roomLoaded', room);
  return room;
};
