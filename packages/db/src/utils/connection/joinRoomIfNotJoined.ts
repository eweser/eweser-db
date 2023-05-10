import type { Room } from 'matrix-js-sdk';
import type { Database } from '../../';

export const joinRoomIfNotJoined = async (
  _db: Database,
  roomId: string
): Promise<Room> => {
  const logger = (message: string, data?: any, error = false) =>
    _db.emit({
      event: 'joinRoomIfNotJoined',
      message,
      data: { roomId, raw: data },
      level: error ? 'error' : 'info',
    });
  return new Promise((resolve, reject) => {
    if (!_db.matrixClient) throw new Error('client not found');
    logger('starting joinRoomIfNotJoined');
    const joinedRooms = _db.matrixClient.getRooms();
    const room = joinedRooms.find((room) => room.roomId === roomId);
    logger('room found', { room, joinedRooms });
    try {
      if (!room) {
        _db.matrixClient.joinRoom(roomId).then((room) => {
          logger('joined room', room.roomId);
          resolve(room);
        });
      }
    } catch (error) {
      if (
        error.data?.errcode === 'M_LIMIT_EXCEEDED' &&
        error.data.retry_after_ms
      ) {
        setTimeout(async () => {
          logger('retrying join room, ', error.data.retry_after_ms);
          const room = await _db.matrixClient?.joinRoom(roomId);
          if (room) {
            logger('joined room after retry', room);
            resolve(room);
          }
        }, error.data.retry_after_ms);
      } else {
        logger('error joining room', error, true);
        reject(error);
      }
    }
  });
};
