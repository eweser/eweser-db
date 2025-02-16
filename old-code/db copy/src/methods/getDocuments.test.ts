import { describe, it, expect, beforeAll } from 'vitest';
import type { Flashcard } from '..';
import { randomString, wait } from '../utils';
import { CollectionKey, Database } from '..';
import 'fake-indexeddb';
import { baseUrl, userLoginInfo } from '../test-utils';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

const loginInfo = userLoginInfo();

describe('getDocuments', () => {
  const db = new Database({ baseUrl });
  const roomId = 'test' + randomString(12);
  beforeAll(async () => {
    await ensureMatrixIsRunning();
    await db.signup({
      ...loginInfo,
      initialRoomConnect: {
        roomId,
        collectionKey: 'flashcards',
      },
    });
  });

  it('gets a yjs document from a room and provides setters and getters', async () => {
    const room = await db.connectRoom<Flashcard>({
      roomId,
      collectionKey: 'flashcards',
    });
    if (!room || typeof room === 'string') {
      throw new Error('room failed to connect');
    }
    const Flashcards = db.getDocuments(room);

    expect(Flashcards.get).toBeDefined();
    expect(Flashcards.set).toBeDefined();
    expect(Flashcards.new).toBeDefined();
    expect(Flashcards.delete).toBeDefined();
    expect(Flashcards.getAll).toBeDefined();
    expect(Flashcards.documents).toBeDefined();

    Flashcards.new({ backText: 'test', frontText: 'front' });
    Flashcards.new({ backText: 'test2', frontText: 'front2' });
    Flashcards.new({ backText: 'test3', frontText: 'front3' });
    const allCards = Flashcards.getAll();
    const cards = Object.values(allCards);
    expect(cards.length).toBe(3);
    const card1 = cards.find((c) => c?.backText === 'test');
    expect(card1).toBeDefined();
    expect(card1?.frontText).toBe('front');
  });
  it('documents.new builds a document with metadata', async () => {
    const room = await db.connectRoom<Flashcard>({
      roomId,
      collectionKey: 'flashcards',
    });
    if (!room || typeof room === 'string') {
      throw new Error('room failed to connect');
    }
    const Flashcards = db.getDocuments(room);
    const newCard = Flashcards.new({ backText: 'test', frontText: 'front' });
    expect(newCard._id).toBeDefined();
    expect(newCard._ref).toBeDefined();
    expect(newCard._created).toBeDefined();
    expect(newCard._updated).toBeDefined();
    expect(newCard._deleted).toBe(false);
    expect(newCard._ttl).toBeUndefined();
  });
  it('.delete marks cards as deleted, and getUndeleted filters out deleted cards', async () => {
    const room = await db.createAndConnectRoom<Flashcard>({
      roomId: roomId + 'new-room',
      collectionKey: 'flashcards',
    });
    if (!room || typeof room === 'string') {
      throw new Error('room failed to connect');
    }
    const Flashcards = db.getDocuments(room);
    Flashcards.new({ backText: 'test', frontText: 'front' });
    Flashcards.new({ backText: 'test', frontText: 'front' });
    const toDelete = Flashcards.new({ backText: 'test', frontText: 'front' });
    Flashcards.delete(toDelete._id);
    const allCards = Flashcards.getAll();
    const cards = Object.values(allCards);
    expect(cards.length).toBe(3);

    const unDeleted = Flashcards.getUndeleted();
    const unDeletedCards = Object.values(unDeleted);
    expect(unDeletedCards.length).toBe(2);
  });
  it('it updates _updated date when setting a doc', async () => {
    const room = await db.connectRoom<Flashcard>({
      roomId,
      collectionKey: 'flashcards',
    });
    if (!room || typeof room === 'string') {
      throw new Error('room failed to connect');
    }
    const Flashcards = db.getDocuments(room);
    const newCard = Flashcards.new({ backText: 'test', frontText: 'front' });
    const originalEditedDate = new Date(newCard._updated);
    await wait(1000);
    Flashcards.set({ ...newCard, backText: 'edited' });
    const editedCard = Flashcards.get(newCard._id);
    if (!editedCard) throw new Error('card not found');
    const editedDate = new Date(editedCard._updated);
    expect(editedDate.getTime()).toBeGreaterThan(originalEditedDate.getTime());
  });
});
