import type { Database, CollectionKey } from '..';
import { autoReconnectListenerName } from '../connectionUtils/autoReconnect';
export type DisconnectRoomOptions = {
  collectionKey: CollectionKey;
  aliasSeed: string;
};
export const disconnectRoom =
  (_db: Database) =>
  ({ collectionKey, aliasSeed }: DisconnectRoomOptions) => {
    const room = _db.collections[collectionKey][aliasSeed];
    if (!room) return;
    _db.emit({
      event: 'disconnectRoom',
      message: 'disconnecting room',
      data: { roomAlias: room.roomAlias },
    });

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

    _db.off(autoReconnectListenerName(room.roomAlias));
  };
