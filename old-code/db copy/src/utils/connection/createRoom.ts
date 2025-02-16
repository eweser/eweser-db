import type sdk from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { registerRoomToSpace } from './registerRoomToSpace';

export enum Visibility {
  Public = 'public',
  Private = 'private',
}

export interface CreateRoomOptions {
  roomIdName: string;
  name?: string;
  topic?: string;
  encrypt?: boolean;
  spaceRoom?: boolean;
}

export const createRoom = async (
  matrixClient: MatrixClient | null,
  options: CreateRoomOptions
) => {
  if (!matrixClient) throw new Error('client not found');

  const { roomIdName, name, topic, encrypt, spaceRoom } = options;

  let newRoom: { room_id: string } | null = null;
  const initialState: sdk.ICreateRoomStateEvent[] = [];
  if (encrypt) {
    initialState.push({
      type: 'm.room.encryption',
      state_key: '',
      content: {
        algorithm: 'm.megolm.v1.aes-sha2',
      },
    });
  }
  newRoom = await matrixClient.createRoom({
    // see the example in MatrixProvider source. options might not be correct
    room_alias_name: roomIdName,
    name,
    topic,
    visibility: Visibility.Private, // some bad typings from the sdk. this is expecting an enum. but the enum is not exported from the library.
    // this enables encryption
    initial_state: initialState,
    creation_content: { type: spaceRoom ? 'm.space' : undefined },
  });

  if (!newRoom || !newRoom.room_id) throw new Error('failed to create room');

  if (!spaceRoom) registerRoomToSpace(matrixClient, newRoom.room_id);

  return newRoom;
};
