// create 2-3 users each with a room or two.'

import type { Flashcard } from '@eweser/db';
import {
  CollectionKey,
  newDocument,
  buildRef,
  Database,
  randomString,
} from '@eweser/db';
import type { FlashcardBase } from '@eweser/db/types/collections';
import { getAllRooms, upsertDocument } from './mongo-helpers.js';
import { beforeAll, describe, it } from 'vitest';
import {
  baseUrl,
  localAggregatorURL,
  localAggregatorUserId,
  pingTestServer,
  userLoginInfo,
} from './test-utils';
import { startApp } from './start.js';

export const populateDatabase = async () => {
  const initialCards: FlashcardBase[] = [
    { frontText: 'hello1', backText: 'world1' },
    { frontText: 'hello2', backText: 'world2' },
    { frontText: 'hello3', backText: 'world3' },
    { frontText: 'hello4', backText: 'world4' },
    { frontText: 'hello5', backText: 'world5' },
  ];
  initialCards.forEach((card, index) => {
    // add a few collections of flashcards to the database
    const roomId = 'roomId' + index;
    const userId = 'userId' + index;
    const documentId = 'documentId' + index;
    const aliasSeed = 'aliasSeed' + index;

    upsertDocument(
      CollectionKey.flashcards,
      roomId,
      userId,
      newDocument<Flashcard>(
        buildRef({
          collectionKey: CollectionKey.flashcards,
          documentId,
          aliasSeed,
        }),
        card
      )
    );
  });
};
const aliasSeed = 'aliasSeed' + randomString(8);

const users = [userLoginInfo(), userLoginInfo(), userLoginInfo()];

const initialCards: (user: string) => FlashcardBase[] = (user) => [
  { frontText: 'hello1' + user, backText: 'world1' + user },
  { frontText: 'hello2' + user, backText: 'world2' + user },
  { frontText: 'hello3' + user, backText: 'world3' + user },
  { frontText: 'hello4' + user, backText: 'world4' + user },
  { frontText: 'hello5' + user, backText: 'world5' + user },
];

const populateInitialRooms = async () => {
  for (const user of users) {
    console.log({ user });
    const db = new Database({
      baseUrl,
      publicAggregators: [
        { userId: localAggregatorUserId, url: localAggregatorURL },
      ],
    });
    await db.signup(user);

    const room = await db.createAndConnectRoom<Flashcard>({
      aliasSeed,
      collectionKey: CollectionKey.flashcards,
      isPublic: true,
    });
    await db.addPublicAggregatorsToRoom(room);
    const Flashcards = await db.getDocuments(room);
    const cards = initialCards(user.userId);
    cards.forEach((card) => Flashcards.new(card));
  }

  // add some entries to the database so we can practice searching
};

const testAdmin = userLoginInfo();

describe('populates the server with initial users, rooms, and data', () => {
  beforeAll(async () => {
    const db = new Database({ baseUrl });
    await db.signup(testAdmin);
    await startApp(testAdmin);
    await pingTestServer();
    await populateInitialRooms();
  });
  it('database should be populated', async () => {
    const rooms = await getAllRooms();
    console.log({ rooms });
    // check that the database is populated.
    // As a user, query the webhooks server for the flashcards in the default rooms.
  });
});
