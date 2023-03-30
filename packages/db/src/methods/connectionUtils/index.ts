import sdk from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { MatrixProvider } from 'matrix-crdt';
import { Doc } from 'yjs';
import type { Room, LoginData, IDatabase } from '../../types';
import { CollectionKey } from '../../types';

/** @example ('#roomName_username:matrix.org')=> 'roomName_username' */
export const truncateRoomAlias = (fullAlias: string) => {
  const truncated = fullAlias.split('#')[1].split(':')[0];
  return truncated;
};

/** @example ('#roomName_@username:matrix.org')=> 'roomName' */
export const getUndecoratedRoomAlias = (fullAlias: string) => {
  // all usernames are decorated with '@' in matrix. and we add a '~' to the end of the room name in `buildRoomAlias`
  return fullAlias.split('~@')[0].split('#')[1];
};

/** @example ('@username:matrix.org')=> '#eweser-db_registry_username:matrix.org' */
export const buildRegistryRoomAlias = (userId: string) => {
  return buildRoomAlias('eweser-db_registry_____', userId);
};

/** @example ('@username:matrix.org')=> '#eweser-db_space_username:matrix.org' */
export const buildSpaceRoomAlias = (userId: string) => {
  return buildRoomAlias('eweser-db_space______', userId);
};

/** @example ('roomName', '@username:matrix.org')=> '#roomName_username:matrix.org' */
export const buildRoomAlias = (alias: string, userId: string) => {
  // already been added
  if (alias.includes('~@')) {
    return alias;
  }
  const res = `#${alias}~${userId}`;
  return res;
};

export const getRoomId = async (matrixClient: MatrixClient, alias: string) => {
  let existingRoom: { room_id: string } | null = null;
  try {
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

export type NewMatrixProviderOptions =
  | {
      matrixClient: MatrixClient;
      doc: any; // Y.Doc;
      /** full room alias with #name:host */
    } & ({ roomAlias: string } | { roomId: string });

/** passing the id will connect faster */
export const newMatrixProvider = (
  matrixClient: MatrixClient,
  doc: Doc,
  room:
    | {
        type: 'id';
        id: string;
      }
    | {
        type: 'alias';
        alias: string;
      }
) => {
  // This is the main code that sets up the connection between
  // yjs and Matrix. It creates a new MatrixProvider and
  // registers it to the `doc`.
  const newMatrixProvider = new MatrixProvider(
    doc,
    matrixClient,
    room.type === 'id' ? { type: 'id', id: room.id } : { type: 'alias', alias: room.alias },
    undefined,
    {
      translator: { updatesAsRegularMessages: true },
      reader: {
        //  snapshotInterval: 1000
      },
      writer: {
        //  flushInterval: 5000
      },
    }
  );
  // console.log({ newMatrixProvider });
  return newMatrixProvider;
};

const registerRoomToSpace = async (matrixClient: MatrixClient, roomId: string) => {
  const userId = matrixClient.getUserId();
  if (!userId) throw new Error('userId not found');
  const spaceAlias = buildSpaceRoomAlias(userId);
  const spaceIdRes = await matrixClient.getRoomIdForAlias(spaceAlias);
  if (!spaceIdRes) throw new Error('space not found');
  const spaceId = spaceIdRes.room_id;

  const host = spaceId.split(':')[1];

  const registerToSpaceRes = await matrixClient.sendStateEvent(
    spaceId,
    'm.space.child',
    { via: host },
    roomId
  );
  // console.log({ registerToSpaceRes });
  // const hierarchy = await matrixClient.getRoomHierarchy(spaceId);
  // console.log({ hierarchy });
};

export const newEmptyRoom = <T>(collectionKey: CollectionKey, roomAlias: string) => {
  const room: Room<T> = {
    connectStatus: 'initial',
    collectionKey,
    matrixProvider: null,
    created: new Date(),
    roomAlias,
    roomId: undefined,
  };
  return room;
};
