import Matrix, { createClient } from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { MatrixProvider } from 'matrix-crdt';
import request from 'request';
import { Doc } from 'yjs';

import { logger } from './helpers.js';
import type { AppMemoryRoom } from './rooms.js';

Matrix.request(request);

type MatrixLoginRes = {
  access_token: string;
  device_id: string;
  home_server: string;
  user_id: string;
  well_known: { 'm.homeserver': { base_url: string } };
};
export type MatrixConfig = {
  baseUrl: string;
  userId: string;
  password: string;
};

export const startMatrixClient = async ({
  baseUrl,
  userId,
  password,
}: MatrixConfig) => {
  const tempClient = createClient({ baseUrl });
  console.log({ userId, password });
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
  return matrixClient;
};

export const connectMatrixProvider = async (
  roomId: string,
  matrixClient: MatrixClient
): Promise<AppMemoryRoom> => {
  return new Promise((resolve, reject) => {
    const ydoc = new Doc();
    const matrixProvider = new MatrixProvider(
      ydoc,
      matrixClient,
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
import type { Document } from '@eweser/db';
// all the tables in the aggregator's mongodb will be some metadata, and then the collection.
export type AggregatorDocument = {
  userId: string;
  roomId: string;
  document: Document;
};
