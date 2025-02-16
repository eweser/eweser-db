import type { Database, Room, Document } from '../..';
import type { ConnectRoomOptions } from '../../methods/connectRoom';

export const autoReconnectListenerName = (roomId: string) =>
  roomId + '_reconnectListener';

export const autoReconnect = (
  _db: Database,
  room: Room<Document>,
  params: ConnectRoomOptions<any>
) => {
  if (params.doNotAutoReconnect) return;
  _db.on(autoReconnectListenerName(room.roomId), async ({ event, data }) => {
    if (event === 'onlineChange') {
      if (data?.online) {
        _db.emit({
          event: 'reconnectRoom',
          data: { roomId: room.roomId },
        });
        try {
          await _db.connectRoom(params);
          _db.emit({
            event: 'reconnectRoom',
            data: { roomId: room.roomId },
            message: 'reconnected',
          });
        } catch (error) {
          _db.emit({
            event: 'reconnectRoom',
            level: 'error',
            data: { roomId: room.roomId, raw: error },
            message: 'reconnect failed',
          });
        }
      }
    }
  });
};
