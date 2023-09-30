/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import type { WebSocketMessage } from '@eweser/websockets';
import { parseMessage } from '@eweser/websockets';
import type { Document, YDoc } from '@eweser/db';
import type { MatrixProvider } from 'matrix-crdt';
import type { Doc } from 'yjs';
import type { MongoRoomRecord } from './mongo-helpers.js';
import { addRoom, getAllRooms } from './mongo-helpers.js';
import { initServer, sendMessageToAll } from './server.js';
import type { MatrixConfig } from './matrix.js';
import { connectMatrixProvider, startMatrixClient } from './matrix.js';
import { logger } from './helpers.js';
import type { MatrixClient } from 'matrix-js-sdk';

const handleGetDocuments = async (
  roomId: string,
  baseUrl: string,
  sendMessageToAll: (message: WebSocketMessage) => Promise<void>
) => {
  //
};

export type AppMemoryRoom = MongoRoomRecord & {
  ydoc: Doc;
  matrixProvider: MatrixProvider;
};

const rooms: { [roomId: string]: AppMemoryRoom } = {};

// maybe we don't need any other methods besides search. Instead, just have the aggregator invite the user to that room? But then their matrix will be full of random rooms and the room will be full of random people not just the aggregator.

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
const handleJoinRoom = async (
  matrixClient: MatrixClient,
  roomId: string,
  sendMessageToAll: (message: WebSocketMessage) => Promise<void>
) => {
  const joined = await matrixClient.joinRoom(roomId);
  if (joined?.roomId === roomId) {
    console.log('joined room', roomId);
    sendMessageToAll({ type: 'joinedRoom', roomId });
    addRoom(roomId); // add to DB
    rooms[roomId] = await connectMatrixProvider(roomId, matrixClient); // connect room
  }
};

export const startApp = async (config: MatrixConfig) => {
  const websocketServer = await initServer();
  const matrixClient = await startMatrixClient(config);

  await connectAllJoinedRooms(matrixClient);

  websocketServer.on('connection', (ws) => {
    logger('New client connected: ' + ws.url);

    ws.on('message', async (rawMessage) => {
      const message = parseMessage(rawMessage);
      console.log({ message });
      try {
        switch (message.type) {
          case 'joinRoom':
            handleJoinRoom(
              matrixClient,
              message.roomId,
              (message: WebSocketMessage) =>
                sendMessageToAll(websocketServer, message)
            );
            break;
        }
      } catch (error: any) {
        sendMessageToAll(websocketServer, { type: 'error', error });
        logger(error, 'error');
      }
    });
    ws.onerror = function (error) {
      logger(error, 'error');
    };
    ws.on('close', (code, reason) => {
      // TODO: disconnect from matrix and remove listeners
      logger(`Client disconnected.\n code: ${code} reason: ${reason}`);
    });
  });
};
