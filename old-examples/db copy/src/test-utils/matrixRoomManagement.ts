import type { MatrixClient } from 'matrix-js-sdk';
import { testroomIdName } from '.';

export const createTestRoomIfNotCreated = async (
  matrixClient: MatrixClient,
  username: string
) => {
  try {
    return await createMatrixRoom(
      matrixClient,
      testroomIdName(username),
      'public-read-write'
    );
  } catch (error) {
    if (error.data?.errcode === 'M_ROOM_IN_USE') {
      // const rooms = matrixClient.getRooms();
      // console.log({ rooms });
      const testRoomId = await matrixClient.getRoomIdForAlias(
        testroomIdName(username)
      );
      await matrixClient.joinRoom(testRoomId.room_id);
      // console.log('test room already created');
    } else {
      throw new Error(error);
    }
  }
};

/**
 * Helper function to create a Matrix room suitable for use with MatrixProvider.
 * Access can currently be set to "public-read-write" | "public-read"
 */
export async function createMatrixRoom(
  matrixClient: MatrixClient,
  aliasName: string,
  access: 'public-read-write' | 'public-read'
) {
  try {
    const initial_state = [];

    // guests should not be able to actually join the room,
    // because we don't want guests to be able to write
    initial_state.push({
      type: 'm.room.guest_access',
      state_key: '',
      content: {
        guest_access: 'forbidden',
      },
    });

    // if there is no public write access, make sure to set
    // join_rule to invite
    initial_state.push({
      type: 'm.room.join_rules',
      content: {
        join_rule: access === 'public-read-write' ? 'public' : 'invite',
      },
    });

    // The history of a (publicly accessible) room should be readable by everyone,
    // so that all users can get all yjs updates
    initial_state.push({
      type: 'm.room.history_visibility',
      content: {
        history_visibility: 'world_readable',
      },
    });

    // for e2ee
    // initial_state.push({
    //   type: "m.room.encryption",
    //   state_key: "",
    //   content: {
    //     algorithm: "m.megolm.v1.aes-sha2",
    //   },
    // });

    const ret = await matrixClient.createRoom({
      room_alias_name: aliasName,
      visibility: 'public' as any, // Whether this room is visible to the /publicRooms API or not." One of: ["private", "public"]
      name: aliasName,
      topic: '',
      initial_state,
    });

    // TODO: add room to space

    return { status: 'ok' as const, roomId: ret.room_id };
  } catch (e: any) {
    if (e.errcode === 'M_ROOM_IN_USE') {
      return 'already-exists' as const;
    }
    if (e.name === 'ConnectionError') {
      return 'offline';
    }

    return {
      status: 'error' as const,
      error: e,
    };
    // offline error?
  }
}

export async function getMatrixRoomAccess(matrixClient: any, roomId: string) {
  let result: any;

  try {
    result = await matrixClient.getStateEvent(roomId, 'm.room.join_rules');
  } catch (e) {
    return {
      status: 'error' as const,
      error: e,
    };
  }

  if (result.join_rule === 'public') {
    return 'public-read-write';
  } else if (result.join_rule === 'invite') {
    return 'public-read';
  } else {
    throw new Error('unsupported join_rule');
  }
}

/**
 * Helper function to change access of a Matrix Room
 * Access can currently be set to "public-read-write" | "public-read"
 */
export async function updateMatrixRoomAccess(
  matrixClient: any,
  roomId: string,
  access: 'public-read-write' | 'public-read'
) {
  try {
    await matrixClient.sendStateEvent(
      roomId,
      'm.room.join_rules',
      { join_rule: access === 'public-read-write' ? 'public' : 'invite' },
      ''
    );

    // TODO: add room to space

    return { status: 'ok' as const, roomId };
  } catch (e: any) {
    if (e.name === 'ConnectionError') {
      return 'offline';
    }

    return {
      status: 'error' as const,
      error: e,
    };
  }
}
