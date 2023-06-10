import type { Database, Room, Document } from '../../';
import type { ConnectRoomOptions } from '../../methods/connectRoom';

export const autoReconnectListenerName = (roomAlias: string) =>
  roomAlias + '_reconnectListener';

export const autoReconnect = (
  _db: Database,
  room: Room<Document>,
  params: ConnectRoomOptions<any>
) => {
  if (params.doNotAutoReconnect) return;
  _db.on(autoReconnectListenerName(room.roomAlias), async ({ event, data }) => {
    if (event === 'onlineChange') {
      if (data?.online) {
        _db.emit({
          event: 'reconnectRoom',
          data: { roomAlias: room.roomAlias },
        });
        try {
          await _db.connectRoom(params);
          _db.emit({
            event: 'reconnectRoom',
            data: { roomAlias: room.roomAlias },
            message: 'reconnected',
          });
        } catch (error) {
          _db.emit({
            event: 'reconnectRoom',
            level: 'error',
            data: { roomAlias: room.roomAlias, raw: error },
            message: 'reconnect failed',
          });
        }
      }
    }
  });
};
