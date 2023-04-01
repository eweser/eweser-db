import type { MatrixClient, Room } from 'matrix-js-sdk';

export const joinRoomIfNotJoined = async (
  matrixClient: MatrixClient | null,
  roomId: string
): Promise<Room> => {
  return new Promise((resolve, reject) => {
    if (!matrixClient) throw new Error('client not found');
    const joinedRooms = matrixClient.getRooms();
    const room = joinedRooms.find((room) => room.roomId === roomId);
    try {
      if (!room) {
        matrixClient.joinRoom(roomId).then((room) => {
          resolve(room);
        });
      }
    } catch (error) {
      if (
        error.data?.errcode === 'M_LIMIT_EXCEEDED' &&
        error.data.retry_after_ms
      ) {
        setTimeout(async () => {
          console.log('retrying join room, ', error.data.retry_after_ms);
          const room = await matrixClient.joinRoom(roomId);
          if (room) resolve(room);
        }, error.data.retry_after_ms);
      } else {
        reject(error);
        console.log('error joining room');
        console.error(error);
      }
    }
  });
};
