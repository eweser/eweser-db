import type { MatrixClient } from 'matrix-js-sdk';

export const getRoomId = async (
  matrixClient: MatrixClient | null,
  alias: string
) => {
  let existingRoom: { room_id: string } | null = null;
  try {
    if (!matrixClient) throw new Error('client not found');
    // console.time('getRoomIdForAlias');
    existingRoom = await matrixClient.getRoomIdForAlias(alias);
  } catch (error) {
    console.log('room not found from alias: ' + alias, error);
  }
  // console.timeEnd('getRoomIdForAlias');
  // console.log({ existingRoom });
  if (existingRoom?.room_id) {
    return existingRoom.room_id;
  } else return false;
};
