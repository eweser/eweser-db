import type { Database, CollectionKey } from '..';
import { autoReconnectListenerName } from '../utils';
export type DisconnectRoomOptions = {
  collectionKey: CollectionKey;
  roomId: string;
  removeReconnectListener?: boolean;
};
export const disconnectRoom =
  (_db: Database) =>
  ({
    collectionKey,
    roomId,
    removeReconnectListener = true,
  }: DisconnectRoomOptions) => {
    const room = _db.collections[collectionKey][roomId];
    if (!room) return;
    _db.emit({
      event: 'disconnectRoom',
      message: 'disconnecting room',
      data: { roomId: room.roomId },
    });
    room.connectStatus = 'disconnected';

    room.matrixProvider?.dispose();

    if (room.webRtcProvider) {
      room.webRtcProvider.disconnect();
      room.webRtcProvider.destroy();
    }
    if (removeReconnectListener) {
      _db.off(autoReconnectListenerName(room.roomId));
    }
  };
