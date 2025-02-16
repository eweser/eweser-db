import type { Doc } from 'yjs';
import type { MatrixProvider } from 'matrix-crdt';
import type { Document, YDoc } from '@eweser/db';
import type { MatrixClient } from 'matrix-js-sdk';

import { addRoom, getAllRooms, upsertDocument } from './mongo-helpers.js';
import { connectMatrixProvider } from './matrix.js';
import type { MongoRoomRecord } from './mongo-helpers.js';
import { CollectionKey } from '@eweser/db';

export type AppMemoryRoom = MongoRoomRecord & {
  ydoc: Doc;
  matrixProvider: MatrixProvider;
};

const rooms: { [roomId: string]: AppMemoryRoom } = {};

export const handleJoinRoom = async (
  matrixClient: MatrixClient,
  roomId: string
) => {
  const joined = await matrixClient.joinRoom(roomId);
  if (joined?.roomId === roomId) {
    console.log('joined room', roomId);
    addRoom(roomId); // add to DB
    rooms[roomId] = await connectMatrixProvider(roomId, matrixClient); // connect room
  }
  return joined;
};

export const connectAllJoinedRooms = async (matrixClient: MatrixClient) => {
  const joinedRoomsList = await getAllRooms();
  joinedRoomsList.forEach(async ({ roomId }) => {
    rooms[roomId] = await connectMatrixProvider(roomId, matrixClient);
    const typedDoc: YDoc<Document> = rooms[roomId].ydoc as any;
    const documents = typedDoc.getMap('documents');
    const allDocs = documents.toJSON();
    console.log({ allDocs });
  });
};

/** Listens to changes in the room's ydoc and updates the aggregator database */
export const listenToRoom = async (
  roomId: string,
  userId: string,
  collectionKey: CollectionKey
) => {
  const ydoc = rooms[roomId].ydoc;
  const documentToJson = ydoc.getMap('documents').toJSON();
  // set initial
  await upsertDocument(collectionKey, roomId, userId, documentToJson as any);
  // listen for updates
  const document = ydoc.getMap('documents');
  document.observe(() => {
    const documentToJson = ydoc.getMap('documents').toJSON();
    upsertDocument(collectionKey, roomId, userId, documentToJson as any);
  });
};
