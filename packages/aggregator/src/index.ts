/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import type { WebSocketMessage } from '@eweser/websockets';
import { sendMessage, parseMessage } from '@eweser/websockets';
import type { Document, YDoc } from '@eweser/db';
import type { MatrixProvider } from 'matrix-crdt';
import type { Doc } from 'yjs';
import type { MongoRoomRecord } from './mongo-helpers.js';
import { addRoom, getAllRooms } from './mongo-helpers.js';
import { initServer } from './server.js';
import { connectMatrixProvider, matrixClient } from './matrix.js';
import { logger } from './helpers.js';

const sockServer = await initServer();

const handleJoinRoom = async (
  roomId: string,
  sendMessageToAll: (message: WebSocketMessage) => Promise<void>
) => {
  const joined = await matrixClient.joinRoom(roomId);
  if (joined?.roomId === roomId) {
    console.log('joined room', roomId);
    sendMessageToAll({ type: 'joinedRoom', roomId });
    addRoom(roomId); // add to DB
    rooms[roomId] = await connectMatrixProvider(roomId);
  }
};

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

const joinedRoomsList = await getAllRooms();

joinedRoomsList.forEach(async ({ roomId }) => {
  rooms[roomId] = await connectMatrixProvider(roomId);
  const typedDoc: YDoc<Document> = rooms[roomId].ydoc as any;
  const documents = typedDoc.getMap('documents');
  const allDocs = documents.toJSON();
  // console.log({ allDocs });
});

sockServer.on('connection', (ws) => {
  const sendMessageToAll = async (message: WebSocketMessage) => {
    sockServer.clients.forEach((client) => {
      sendMessage(client, message);
    });
  };
  logger('New client connected: ' + ws.url);

  ws.on('message', async (rawMessage) => {
    const message = parseMessage(rawMessage);
    console.log({ message });
    try {
      switch (message.type) {
        case 'joinRoom':
          handleJoinRoom(message.roomId, sendMessageToAll);
          break;
      }
    } catch (error: any) {
      sendMessageToAll({ type: 'error', error });
      logger(error, 'error');
    }
  });
  ws.onerror = function (error) {
    logger(error, 'error');
  };
  ws.on('close', (code, reason) =>
    logger(`Client disconnected.\n code: ${code} reason: ${reason}`)
  );
});
