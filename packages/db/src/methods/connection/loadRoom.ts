import { Room } from '../../room';

import type { ServerRoom } from '@eweser/shared';
import { initializeDocAndLocalProvider } from '../../utils/connection/initializeDoc';
import { createYjsProvider } from '@y-sweet/client';
import type { Doc } from 'yjs';
import type { Database } from '../..';
import type { RoomConnectionStatus } from '../../events';
import { wait } from '@eweser/shared';
import { Awareness } from 'y-protocols/awareness';

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
  return (room: Room<any>, ySweetUrl: string | null) => {
    const localLoaded = !!room && !!room.ydoc && !!room.indexedDbProvider;
    const ySweet = room.ySweetProvider;
    const shouldLoadYSweet =
      db.useYSweet &&
      room?.ySweetUrl &&
      ySweet?.status !== 'connecting' &&
      ySweet?.status !== 'handshaking';
    const ySweetLoaded =
      ySweetUrl &&
      ySweet &&
      room.ySweetUrl === ySweetUrl &&
      ySweet.status === 'connected';

    return { localLoaded, ySweetLoaded, shouldLoadYSweet };
  };
}
async function loadLocal(db: Database, room: Room<any>) {
  const { yDoc: ydoc, localProvider } = await initializeDocAndLocalProvider(
    room.id,
    room.ydoc,
    db.indexedDBProviderPolyfill
  );

  room.ydoc = ydoc;
  room.indexedDbProvider = localProvider;
  db.debug(
    'initialized ydoc and localProvider',
    room.ydoc,
    room.indexedDbProvider
  );
}

export async function loadYSweet(
  db: Database,
  room: Room<any>,
  withAwareness = true,
  awaitConnection = false,
  maxWait = 10000
) {
  function emitConnectionChange(status: RoomConnectionStatus) {
    if (status === 'connected') {
      room.connectionRetries = 0;
    }
    room.emit('roomConnectionChange', status, room);
    db.emit('roomConnectionChange', status, room);
  }
  const handleStatusChange = ({ status }: { status: RoomConnectionStatus }) =>
    emitConnectionChange(status);
  function handleSync(synced: boolean) {
    emitConnectionChange(synced ? 'connected' : 'disconnected');
    db.debug('ySweetProvider synced', synced);
  }
  async function handleConnectionError(error: any) {
    db.error('ySweetProvider error', error);
    emitConnectionChange('disconnected');
    // because this is a change listener, it could be called many times. In order to prevent an infinite loop of retries, we will only allow 3 retries.
    if (room.connectionRetries < 3) {
      await wait(1000);
      room.connectionRetries++;
      checkTokenAndConnectProvider(withAwareness);
    }
  }
  async function pollForYSweetConnectionAndAwait() {
    let waited = 0;
    return new Promise<void>((resolve, reject) => {
      const poll = setInterval(() => {
        if (room.ySweetProvider?.status === 'connected') {
          clearInterval(poll);
          resolve();
        } else {
          waited += 1000;
          if (waited >= maxWait) {
            clearInterval(poll);
            reject(new Error('timed out waiting for ySweet connection'));
          }
        }
      }, 1000);
    });
  }
  async function checkTokenAndConnectProvider(withAwareness = true) {
    emitConnectionChange('connecting');

    room.ySweetProvider = createYjsProvider(
      room.ydoc as Doc,
      room.id,
      async () => {
        const refreshed = await db.refreshYSweetToken(room);
        db.debug(
          'refreshed token. success: ',
          refreshed?.ySweetUrl && refreshed.tokenExpiry
        );
        if (
          refreshed?.ySweetUrl &&
          refreshed.tokenExpiry &&
          refreshed.ySweetBaseUrl
        ) {
          room.tokenExpiry = refreshed.tokenExpiry;
          room.ySweetUrl = refreshed.ySweetUrl;
          room.ySweetBaseUrl = refreshed.ySweetBaseUrl;
          return {
            url: refreshed.ySweetUrl,
            baseUrl: refreshed.ySweetBaseUrl,
            docId: room.id,
          };
        } else {
          throw new Error('No ySweetUrl found');
        }
      },
      withAwareness ? { awareness: new Awareness(room.ydoc as Doc) } : {}
    );
    // update the room's ydoc with the new provider attached
    // room.ydoc = room.ySweetProvider.doc as YDoc<any>;
    room.ySweetProvider.on('status', handleStatusChange);
    room.ySweetProvider.on('sync', handleSync);
    room.ySweetProvider.on('connection-error', handleConnectionError);
    // room.ySweetProvider.connect();
  }
  await checkTokenAndConnectProvider();

  db.debug('created ySweetProvider', room.ySweetProvider);

  room.disconnect = () => {
    room.ySweetProvider?.off('status', handleStatusChange);
    room.ySweetProvider?.off('sync', handleSync);
    room.ySweetProvider?.off('connection-error', handleConnectionError);
    room.ySweetProvider?.disconnect();
    room.webRtcProvider?.disconnect();
    emitConnectionChange('disconnected');
  };
  if (awaitConnection) {
    try {
      await pollForYSweetConnectionAndAwait();
    } catch (e) {
      db.error(e);
    }
  }
  db.emit('roomRemoteLoaded', room);
}
export type RemoteLoadOptions = {
  /* whether to load the remote ySweet connection. Default is true */
  awaitLoadRemote?: boolean;
  /* whether to await the remote ySweet connection. Default is true*/
  loadRemote?: boolean;
  /* the maximum time to wait for the remote ySweet connection. Default is 10000ms */
  loadRemoteMaxWait?: number;
  /** use Awareness, false by default */
  withAwareness?: boolean;
};

export const loadRoom =
  (db: Database) =>
  async (serverRoom: ServerRoom, remoteLoadOptions?: RemoteLoadOptions) => {
    const loadRemote = remoteLoadOptions?.loadRemote ?? true;
    const awaitLoadRemote = remoteLoadOptions?.awaitLoadRemote ?? true;
    const loadRemoteMaxWait = remoteLoadOptions?.loadRemoteMaxWait ?? 10000;
    const withAwareness = remoteLoadOptions?.withAwareness ?? false;

    const { roomId, collectionKey } = validate(serverRoom);

    const room: Room<any> =
      db.collections[collectionKey][roomId] ?? new Room({ db, ...serverRoom });
    db.info('loading room', { room, serverRoom });

    const { localLoaded, ySweetLoaded, shouldLoadYSweet } = checkLoadedState(
      db
    )(room, serverRoom.ySweetUrl);
    db.debug('loadedState', {
      localLoaded,
      ySweetLoaded,
      shouldLoadYSweet,
    });
    if (localLoaded && (!shouldLoadYSweet || ySweetLoaded)) {
      db.debug('room already loaded', room);
      return room;
    }

    if (!localLoaded) {
      await loadLocal(db, room);
    }

    if (loadRemote && shouldLoadYSweet && !ySweetLoaded) {
      if (awaitLoadRemote) {
        await loadYSweet(db, room, withAwareness, true, loadRemoteMaxWait);
      } else {
        loadYSweet(db, room, withAwareness, false);
      }
    }

    // Save the room to the db
    db.collections[collectionKey][roomId] = room;
    db.emit('roomLoaded', room);
    return room;
  };
