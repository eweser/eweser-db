import {
  buildRegistryroomId,
  connectMatrixProvider,
  getOrCreateRegistryRoom,
  initializeDocAndLocalProvider,
  populateRegistry,
  connectWebRtcProvider,
} from '../utils';
import type { LoginData, RegistryData } from '../types';

import { getRegistry } from '../utils';
import type { Database } from '..';
import type { Doc } from 'yjs';

import {
  localStorageGet,
  LocalStorageKey,
} from '../utils/db/localStorageService';

/** initializes the registry's ydoc and matrix provider */
export const connectRegistry = (_db: Database) => async () => {
  const logger = (message: string, data?: any) =>
    _db.emit({
      event: 'connectRegistry',
      message,
      data: { raw: data },
    });
  const { wasNew } = await getOrCreateRegistryRoom(_db);

  if (!_db.userId) throw new Error('userId not found');

  const { ydoc } = await initializeDocAndLocalProvider<RegistryData>(
    'registry'
  );
  logger('ydoc initialized', ydoc);
  const room = _db.collections.registry[0];
  room.ydoc = ydoc;

  const connected = await connectMatrixProvider(_db, room);

  if (_db.useWebRTC && _db.webRtcPeers.length > 0) {
    try {
      if (room.webRtcProvider) {
        room.webRtcProvider.doc = ydoc as any;
        room.webRtcProvider.connect();
      } else {
        const password =
          localStorageGet<LoginData>(LocalStorageKey.loginData)?.password ?? '';
        const { provider, doc } = connectWebRtcProvider(
          _db,
          buildRegistryroomId(_db.userId),
          ydoc as Doc,
          password
        );
        room.ydoc = doc as any;
        room.webRtcProvider = provider;
      }
    } catch (error) {
      logger('error connecting registry to webRtc', error);
    }
  }

  if (wasNew) {
    await populateRegistry(_db);
  }
  if (!connected) throw new Error('could not connect to registry');

  logger('registry connected', getRegistry(_db));
  return getRegistry(_db);
};
