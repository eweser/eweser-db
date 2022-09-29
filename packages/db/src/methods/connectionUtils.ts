import sdk from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { MatrixProvider } from 'matrix-crdt';
// import * as Y from 'yjs';
import type { Room, LoginData, IDatabase } from '../types';
import { CollectionKey } from '../types';

type MatrixLoginRes = {
  access_token: string;
  device_id: string;
  home_server: string;
  user_id: string;
  well_known: { 'm.homeserver': { base_url: string } };
};

export enum Visibility {
  Public = 'public',
  Private = 'private',
}
/** @example ('#roomName_username:matrix.org')=> 'roomName_username' */
export const truncateRoomAlias = (fullAlias: string) => {
  return fullAlias.split('#')[1].split(':')[0];
};

/** @example ('#roomName_username:matrix.org')=> 'roomName' */
export const getUndecoratedRoomAlias = (fullAlias: string, userId: string) => {
  return fullAlias.split(userId)[0];
};

/** @example ('@username:matrix.org')=> '#eweser-db_registry_username:matrix.org' */
export const buildRegistryRoomAlias = (userId: string) => {
  return buildRoomAlias('eweser-db_registry_', userId);
};

/** @example ('@username:matrix.org')=> '#eweser-db_space_username:matrix.org' */
export const buildSpaceRoomAlias = (userId: string) => {
  return buildRoomAlias('eweser-db_space_', userId);
};

/** @example ('roomName', '@username:matrix.org')=> '#roomName_username:matrix.org' */
export const buildRoomAlias = (alias: string, userId: string) => {
  // console.log({ alias, userId });
  const res = `#${alias}_${userId}`;
  // console.log({ res });
  return res;
};

export const checkForExistingRoomAlias = async (matrixClient: MatrixClient, alias: string) => {
  let existingRoom: { room_id: string } | null = null;
  try {
    // console.time('getRoomIdForAlias');
    existingRoom = await matrixClient.getRoomIdForAlias(alias);
  } catch (error) {
    // console.log('room not found from alias');
  }
  // console.timeEnd('getRoomIdForAlias');
  // console.log({ existingRoom });
  if (existingRoom?.room_id) {
    return true;
  } else return false;
};

export const getOrCreateSpace = async (matrixClient: MatrixClient, userId: string) => {
  const spaceRoomAlias = buildSpaceRoomAlias(userId);
  const spaceRoomAliasTruncated = truncateRoomAlias(spaceRoomAlias);
  const spaceExists = await checkForExistingRoomAlias(matrixClient, spaceRoomAlias);

  if (spaceExists) {
    return spaceRoomAlias;
  } else {
    try {
      console.log('creating space room');
      const createSpaceRoomRes = await createRoom(
        matrixClient,
        spaceRoomAliasTruncated,
        'My Database',
        'The parent space for all eweser-db rooms',
        false,
        true
      );
      // console.log({ createSpaceRoomRes });
      return spaceRoomAlias;
    } catch (error: any) {
      if (error.message.includes('M_ROOM_IN_USE')) {
        console.log('room already exists');
        await matrixClient.joinRoom(spaceRoomAliasTruncated);
      }
      throw new Error(error);
    }
  }
};

export const getOrCreateRegistry = async (_db: IDatabase) => {
  const matrixClient = _db.matrixClient;
  if (!matrixClient) throw new Error('client not found');
  const userId = matrixClient.getUserId();
  // console.log({ userId });
  if (!userId) throw new Error('userId not found');
  const space = await getOrCreateSpace(matrixClient, userId);
  // console.log({ space });
  const registryRoomAlias = buildRegistryRoomAlias(userId);
  const registryRoomAliasTruncated = truncateRoomAlias(registryRoomAlias);
  const registryExists = await checkForExistingRoomAlias(matrixClient, registryRoomAlias);

  if (registryExists) {
    return registryRoomAlias;
  } else {
    try {
      console.log('creating registry room');
      const createRegistryRes = await createRoom(
        matrixClient,
        registryRoomAliasTruncated,
        'Database Registry',
        'Where the database stores links to all your other rooms -- DO NOT DELETE'
      );
      console.log({ createRegistryRes });
      _db.collections.registry[0].roomAlias = registryRoomAlias;
      return registryRoomAlias;
    } catch (error: any) {
      if (error.message.includes('M_ROOM_IN_USE')) {
        console.log('registry already exists');
        await matrixClient.joinRoom(registryRoomAliasTruncated);
        _db.collections.registry[0].roomAlias = registryRoomAlias;
        return registryRoomAlias;
      }
      // still a problem that it wasn't caught before this

      throw new Error(error);
    }
  }
};

/** logs into matrix. if successful sets login data into localStorage */
export async function createMatrixClient(data: LoginData) {
  // console.log({ data });
  const { password, accessToken, baseUrl, userId } = data;
  const signInOpts = {
    baseUrl,
    userId,
  };
  const matrixClient = accessToken
    ? sdk.createClient({
        ...signInOpts,
        accessToken,
      })
    : sdk.createClient(signInOpts);

  if (accessToken) {
    await matrixClient.loginWithToken(accessToken);
  } else {
    const loginRes: MatrixLoginRes = await matrixClient.login('m.login.password', {
      user: userId,
      password,
    });
    // console.log({ loginRes });
    const loginSaveData: LoginData = {
      baseUrl,
      userId,
      accessToken: loginRes.access_token,
      deviceId: loginRes.device_id,
    };
    localStorage.setItem('loginData', JSON.stringify(loginSaveData));
  }

  // overwrites because we don't call .start();
  (matrixClient as any).canSupportVoip = false;
  (matrixClient as any).clientOpts = {
    lazyLoadMembers: true,
  };
  return matrixClient;
}

export const newMatrixProvider = ({
  matrixClient,
  doc,
  /** full room alias with #name:host */
  roomAlias,
}: {
  matrixClient: MatrixClient;
  doc: any; // Y.Doc;
  roomAlias: string;
}) => {
  // This is the main code that sets up the connection between
  // yjs and Matrix. It creates a new MatrixProvider and
  // registers it to the `doc`.
  const newMatrixProvider = new MatrixProvider(
    doc,
    matrixClient,
    { type: 'alias', alias: roomAlias },
    undefined,
    {
      translator: { updatesAsRegularMessages: true },
      // reader: { snapshotInterval: 100 },
      // writer: { flushInterval: 5000 },
    }
  );
  // console.log({ newMatrixProvider });
  return newMatrixProvider;
};

export const createRoom = async (
  matrixClient: MatrixClient,
  /** note this is the truncated version, including the username but without '#' and ':matrix.org */
  alias?: string,
  name?: string,
  topic?: string,
  encrypt: boolean = false,
  spaceRoom: boolean = false
) => {
  let newRoom: { room_id: string } | null = null;
  const initialState: sdk.ICreateRoomStateEvent[] = [];
  if (encrypt)
    initialState.push({
      type: 'm.room.encryption',
      state_key: '',
      content: {
        algorithm: 'm.megolm.v1.aes-sha2',
      },
    });
  newRoom = await matrixClient.createRoom({
    room_alias_name: alias,
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
    store: { documents: {} },
  };
  return room;
};
