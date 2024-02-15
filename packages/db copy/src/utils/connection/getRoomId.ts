import type { Database } from '../../';

export const getRoomId = async (_db: Database, alias: string) => {
  let existingRoom: { room_id: string } | null = null;
  const logger = (message: string, data?: any) =>
    _db.emit({
      event: 'getRoomId',
      message,
      data: { roomId: alias, raw: data },
    });
  try {
    logger('starting getRoomId');
    if (!_db.matrixClient) throw new Error('client not found');
    // console.time('getRoomIdForAlias');
    existingRoom = await _db.matrixClient.getRoomIdForAlias(alias);
  } catch (error) {
    logger('error getting room id', error);
  }
  if (existingRoom?.room_id) {
    logger('got room id', existingRoom);
    return existingRoom.room_id;
  } else {
    logger('no room id found');
    return false;
  }
};
