import type { Database, Room, Document } from '..';
import type { ConnectRoomOptions } from '../methods/connectRoom';

export const autoReconnectListenerName = (roomAlias: string) =>
  roomAlias + '_reconnectListener';

export const autoReconnect = (
  _db: Database,
  room: Room<Document>,
  params: ConnectRoomOptions
) => {
  if (params.doNotAutoReconnect) return;
  _db.on(autoReconnectListenerName(room.roomAlias), ({ event, data }) => {
    if (event === 'onlineChange') {
      if (data?.online) {
        _db.emit({
          event: 'reconnectRoom',
          data: { roomAlias: room.roomAlias },
        });
        _db.connectRoom(params);
      }
    }
  });
};
