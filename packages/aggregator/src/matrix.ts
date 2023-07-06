import Matrix, { createClient } from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';

import { MatrixProvider } from 'matrix-crdt';
import request from 'request';
import { Doc } from 'yjs';
import { logger } from './helpers.js';
import type { AppMemoryRoom } from '.';
import { MATRIX_CONFIG } from './constants.js';

const { password, userId, baseUrl } = MATRIX_CONFIG;

type MatrixLoginRes = {
  access_token: string;
  device_id: string;
  home_server: string;
  user_id: string;
  well_known: { 'm.homeserver': { base_url: string } };
};

Matrix.request(request);

const tempClient = createClient({ baseUrl });

const loginRes: MatrixLoginRes = await tempClient.loginWithPassword(
  userId,
  password
);

const matrixClient: MatrixClient = createClient({
  baseUrl,
  userId,
  accessToken: loginRes.access_token,
  deviceId: loginRes.device_id,
});
matrixClient?.setMaxListeners(10000);
(matrixClient as any).canSupportVoip = false;
(matrixClient as any).clientOpts = {
  lazyLoadMembers: true,
};

export const connectMatrixProvider = async (
  roomId: string
): Promise<AppMemoryRoom> => {
  return new Promise((resolve, reject) => {
    const ydoc = new Doc();
    const matrixProvider = new MatrixProvider(
      ydoc,
      matrixClient as any,
      { type: 'id', id: roomId },
      undefined,
      { writer: { flushInterval: 1000 } }
    );
    matrixProvider.initialize();
    matrixProvider.onDocumentAvailable(() => {
      return resolve({ roomId, ydoc, matrixProvider });
    });
    matrixProvider.onDocumentUnavailable(() => {
      logger('onDocumentUnavailable: ' + roomId, 'error');
      reject(false);
    });
  });
};

export { matrixClient };
