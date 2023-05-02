import type { Database, CollectionKey } from '..';
import { autoReconnectListenerName } from '../utils';
export type DisconnectRoomOptions = {
  collectionKey: CollectionKey;
  aliasSeed: string;
  removeReconnectListener?: boolean;
};
export const disconnectRoom =
  (_db: Database) =>
  ({
    collectionKey,
    aliasSeed,
    removeReconnectListener = true,
  }: DisconnectRoomOptions) => {
    const room = _db.collections[collectionKey][aliasSeed];
    if (!room) return;
    _db.emit({
      event: 'disconnectRoom',
      message: 'disconnecting room',
      data: { roomAlias: room.roomAlias },
    });
    room.connectStatus = 'disconnected';

    room.matrixProvider?.dispose();

    if (room.webRtcProvider) {
      room.webRtcProvider.disconnect();
      room.webRtcProvider.signalingConns.forEach((conn) => {
        if (conn.connected) {
          conn.send({ type: 'unsubscribe' });
          // for some reason `.disconnect()` isn't setting these to false
          conn.connected = false;
        }
      });
    }
    if (removeReconnectListener) {
      _db.off(autoReconnectListenerName(room.roomAlias));
    }
  };
