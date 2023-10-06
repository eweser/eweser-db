import type { MatrixClient } from 'matrix-js-sdk';
import { MATRIX_CONFIG } from './constants.js';
import { connectMatrixProvider, startMatrixClient } from './matrix.js';
import type { MongoRoomRecord } from './mongo-helpers.js';
import { getAllRooms } from './mongo-helpers.js';
import { startServer } from './server.js';
import type { Doc } from 'yjs';
import type { MatrixProvider } from 'matrix-crdt';
import type { Document, YDoc } from '@eweser/db';

export type AppMemoryRoom = MongoRoomRecord & {
  ydoc: Doc;
  matrixProvider: MatrixProvider;
};

const rooms: { [roomId: string]: AppMemoryRoom } = {};
const connectAllJoinedRooms = async (matrixClient: MatrixClient) => {
  const joinedRoomsList = await getAllRooms();
  joinedRoomsList.forEach(async ({ roomId }) => {
    rooms[roomId] = await connectMatrixProvider(roomId, matrixClient);
    const typedDoc: YDoc<Document> = rooms[roomId].ydoc as any;
    const documents = typedDoc.getMap('documents');
    const allDocs = documents.toJSON();
    console.log({ allDocs });
  });
};

export const startApp = async () => {
  const server = startServer();
  const matrixClient = await startMatrixClient(MATRIX_CONFIG);

  await connectAllJoinedRooms(matrixClient);

  return { server, matrixClient };
};

const app = await startApp();

export default app;
