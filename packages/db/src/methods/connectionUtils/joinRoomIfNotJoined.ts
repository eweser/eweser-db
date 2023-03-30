import sdk from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { MatrixProvider } from 'matrix-crdt';
import { Doc } from 'yjs';
import type { Room, LoginData, IDatabase } from '../../types';
import { CollectionKey } from '../../types';

const joinRoomIfNotJoined = async (matrixClient: MatrixClient, roomId: string) => {
  const joinedRooms = matrixClient.getRooms();
  const room = joinedRooms.find((room) => room.roomId === roomId);
  try {
    if (!room) {
      await matrixClient.joinRoom(roomId);
    }
  } catch (error: any) {
    if (error.data?.errcode === 'M_LIMIT_EXCEEDED' && error.data.retry_after_ms) {
      setTimeout(async () => {
        console.log('retrying join room, ', error.data.retry_after_ms);
        await matrixClient.joinRoom(roomId);
      }, error.data.retry_after_ms);
    } else {
      console.log('error joining room');
      console.error(error);
    }
  }
};
