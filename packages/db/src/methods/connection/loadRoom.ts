import { Room } from '../../room';

import type { ServerRoom } from '@eweser/shared';
import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { initializeDocAndLocalProvider } from '../../utils/connection/initializeDoc';
import type { Doc } from 'yjs';
import type { Database } from '../..';
import type { RoomConnectionStatus } from '../../events';
import { wait } from '@eweser/shared';
import { Awareness } from 'y-protocols/awareness';
import type { EweDocument } from '@eweser/shared';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

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
  return (room: Room<EweDocument>, syncUrl: string | null) => {
    const localLoaded = !!room && !!room.ydoc && !!room.indexedDbProvider;
    const syncProvider = room.syncProvider;
    const shouldLoadSync =
      room.connectionStatus === 'disconnected' &&
      !!db.getToken() &&
      db.useSync &&
      !!room?.syncUrl &&
      syncProvider?.status !== WebSocketStatus.Connecting;
    const syncLoaded =
      room.connectionStatus === 'connected' &&
      syncUrl &&
      syncProvider &&
      room.syncUrl === syncUrl &&
      syncProvider.status === WebSocketStatus.Connected;
    db.info('checkLoadedState', {
      room: room.name,
      localLoaded,
      syncLoaded,
      shouldLoadSync,
      status: syncProvider?.status,
    });

    return { localLoaded, syncLoaded, shouldLoadSync };
  };
}
async function loadLocal(db: Database, room: Room<EweDocument>) {
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

export async function loadSync(
  db: Database,
  room: Room<EweDocument>,
  withAwareness = true,
  awaitConnection = false,
  maxWait = 30000
) {
  if (!room.connectAbortController) {
    room.connectAbortController = new AbortController();
  }
  function emitConnectionChange(status: RoomConnectionStatus) {
    room.connectionStatus = status;
    if (status === 'connected') {
      room.connectionRetries = 0;
    }
    room.emit('roomConnectionChange', status, room);
    db.emit('roomConnectionChange', status, room);
  }
  const handleStatusChange = ({ status }: { status: WebSocketStatus }) => {
    if (status === WebSocketStatus.Connected) {
      room.connectionRetries = 0;
      room.connectAbortController?.abort();
    }
    emitConnectionChange(status);
  };
  function handleSynced({ state }: { state: boolean }) {
    emitConnectionChange(state ? 'connected' : 'disconnected');
    db.debug('syncProvider synced', state);
  }
  function handleAuthenticationFailed({ reason }: { reason: string }) {
    db.error('syncProvider authentication failed', room.name, reason);
    emitConnectionChange('disconnected');
  }
  async function pollForSyncConnectionAndAwait(maxWait: number) {
    let waited = 0;
    while (room.syncProvider?.status !== WebSocketStatus.Connected) {
      await wait(300);
      waited += 300;
      if (waited >= maxWait) {
        db.debug(
          'timed out waiting for sync connection',
          room.name,
          waited,
          maxWait,
          room.syncProvider
        );
        throw new Error('timed out waiting for sync connection ' + room.name);
      }
    }
  }

  async function getValidSyncToken() {
    if (
      room.syncToken &&
      room.tokenExpiry &&
      new Date(room.tokenExpiry) > new Date(Date.now() + TOKEN_EXPIRY_BUFFER_MS)
    ) {
      db.debug('returning existing sync token', room.name);
      return room.syncToken;
    }

    const refreshed = await db.refreshSyncToken(room);
    db.debug(
      'refreshed sync token. success:',
      refreshed?.syncToken && refreshed.tokenExpiry,
      room.name
    );

    if (refreshed?.syncToken && refreshed.syncUrl && refreshed.tokenExpiry) {
      room.tokenExpiry = refreshed.tokenExpiry;
      room.syncToken = refreshed.syncToken;
      room.syncUrl = refreshed.syncUrl;
      return refreshed.syncToken;
    }

    throw new Error('No sync token found: ' + room.name);
  }

  if (room.syncProvider) {
    if (awaitConnection) {
      try {
        await pollForSyncConnectionAndAwait(maxWait);
      } catch (e) {
        db.error(e);
      }
    }
    db.emit('roomRemoteLoaded', room);
    return;
  }

  if (!room.syncUrl) {
    throw new Error('No syncUrl found: ' + room.name);
  }

  emitConnectionChange('connecting');
  room.syncProvider = new HocuspocusProvider({
    url: room.syncUrl,
    name: room.id,
    document: room.ydoc as Doc,
    token: getValidSyncToken,
    awareness: withAwareness ? new Awareness(room.ydoc as Doc) : null,
  });

  room.syncProvider.on('status', handleStatusChange);
  room.syncProvider.on('synced', handleSynced);
  room.syncProvider.on('authenticationFailed', handleAuthenticationFailed);

  db.debug('created syncProvider', room.syncProvider);

  room.disconnect = () => {
    room.syncProvider?.off('status', handleStatusChange);
    room.syncProvider?.off('synced', handleSynced);
    room.syncProvider?.off('authenticationFailed', handleAuthenticationFailed);
    room.syncProvider?.disconnect();
    room.webRtcProvider?.disconnect();
    emitConnectionChange('disconnected');
  };
  if (awaitConnection) {
    try {
      await pollForSyncConnectionAndAwait(maxWait);
    } catch (e) {
      db.error(e);
    }
  }
  db.emit('roomRemoteLoaded', room);
}
export type RemoteLoadOptions = {
  /* whether to load the remote sync connection. Default is true */
  awaitLoadRemote?: boolean;
  /* whether to await the remote sync connection. Default is true */
  loadRemote?: boolean;
  /* the maximum time to wait for the remote sync connection. Default is 30000ms */
  loadRemoteMaxWait?: number;
  /** use Awareness, false by default */
  withAwareness?: boolean;
};

export const loadRoom =
  (db: Database) =>
  async (serverRoom: ServerRoom, remoteLoadOptions?: RemoteLoadOptions) => {
    const loadRemote = remoteLoadOptions?.loadRemote ?? true;
    const awaitLoadRemote = remoteLoadOptions?.awaitLoadRemote ?? true;
    const loadRemoteMaxWait = remoteLoadOptions?.loadRemoteMaxWait ?? 30000;
    const withAwareness = remoteLoadOptions?.withAwareness ?? false;

    const { roomId, collectionKey } = validate(serverRoom);

    const room = (db.collections[collectionKey][roomId] ??
      new Room({ db, ...serverRoom })) as unknown as Room<EweDocument>;
    db.info('loading room', { room, serverRoom });

    const { localLoaded, syncLoaded, shouldLoadSync } = checkLoadedState(db)(
      room,
      serverRoom.syncUrl
    );
    db.debug('loadedState', {
      localLoaded,
      syncLoaded,
      shouldLoadSync,
    });
    if (localLoaded && (!shouldLoadSync || syncLoaded)) {
      db.debug('room already loaded', room);
      return room;
    }

    if (!localLoaded) {
      await loadLocal(db, room);
    }

    if (loadRemote && shouldLoadSync && !syncLoaded) {
      if (awaitLoadRemote) {
        await loadSync(db, room, withAwareness, true, loadRemoteMaxWait);
      } else {
        loadSync(db, room, withAwareness, false);
      }
    }

    // Save the room to the db
    db.collections[collectionKey][roomId] = room;
    db.emit('roomLoaded', room);
    return room;
  };
