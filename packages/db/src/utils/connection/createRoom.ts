import type sdk from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { registerRoomToSpace } from './registerRoomToSpace';

export enum Visibility {
  Public = 'public',
  Private = 'private',
}

export interface CreateRoomOptions {
  roomAliasName: string;
  name?: string;
  topic?: string;
  encrypt?: boolean;
  spaceRoom?: boolean;
  isPublic?: boolean;
}

export const createRoom = async (
  matrixClient: MatrixClient | null,
  options: CreateRoomOptions
) => {
  if (!matrixClient) throw new Error('client not found');

  const { roomAliasName, name, topic, encrypt, spaceRoom } = options;

  let newRoom: { room_id: string } | null = null;
  const initialState: sdk.ICreateRoomStateEvent[] = [];
  if (options.name) {
    initialState.push({
      type: 'm.room.name',
      state_key: '',
      content: { name },
    });
  }
  if (options.isPublic) {
    initialState.push({
      type: 'm.room.join_rules',
      state_key: '',
      content: {
        join_rule: 'public',
      },
    });
  }
  if (!options.isPublic && encrypt) {
    initialState.push({
      type: 'm.room.encryption',
      state_key: '',
      content: {
        algorithm: 'm.megolm.v1.aes-sha2',
      },
    });
  }
  console.dir({ initialState }, { depth: null });
  newRoom = await matrixClient.createRoom({
    // see the example in MatrixProvider source. options might not be correct
    room_alias_name: roomAliasName,
    name,
    topic,
    visibility:
      options.isPublic === true ? Visibility.Public : Visibility.Private, // some bad typings from the sdk. this is expecting an enum. but the enum is not exported from the library.
    // this enables encryption
    initial_state: initialState,
    creation_content: { type: spaceRoom ? 'm.space' : undefined },
  });

  if (!newRoom || !newRoom.room_id) throw new Error('failed to create room');

  if (!spaceRoom) registerRoomToSpace(matrixClient, newRoom.room_id);

  return newRoom;
};
