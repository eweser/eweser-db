import { describe, it, expect, vitest } from 'vitest';
import { getDocumentByRef } from './getDocumentByRef';
import type { Flashcard } from '..';
import {
  CollectionKey,
  Database,
  buildRef,
  getRoomDocuments,
  randomString,
} from '..';
import { baseUrl } from '../test-utils';

describe('getDocumentByRef', () => {
  const db = new Database();
  it('validates the ref is a valid ref', async () => {
    const call = getDocumentByRef(db);
    let errorMessage = '';
    try {
      await call('not-a-valid-ref');
    } catch (error: any) {
      errorMessage = error.message;
    }
    expect(errorMessage).toEqual('ref must have 3 parts');
  });
  it('returns a document quickly if the document is from a loaded room, then connects the room', async () => {
    const roomId = 'test' + randomString(8);
    const userId = randomString(8);
    await db.signup({
      userId,
      password: randomString(8),
      baseUrl,
      initialRoomConnect: {
        roomId,
        collectionKey: 'flashcards',
      },
    });
    const connectRoomMock = vitest.fn();
    db.connectRoom = connectRoomMock;
    db.userId = userId;
    const room = await db.loadRoom<Flashcard>({
      collectionKey: 'flashcards',
      roomId,
    });
    const documents = getRoomDocuments(room);
    const ref = buildRef({
      collectionKey: 'flashcards',
      roomId,
      documentId: 'doc-id',
    });
    documents.set('doc-id', {
      _id: 'doc-id',
      frontText: 'front',
      backText: 'back',
      _ref: ref,
      _created: 0,
      _updated: 0,
    });
    expect(connectRoomMock).not.toHaveBeenCalled();
    const gotDoc = await db.getDocumentByRef<Flashcard>(ref);

    expect(gotDoc._id).toEqual('doc-id');
    expect(gotDoc.frontText).toEqual('front');
    expect(gotDoc.backText).toEqual('back');
    expect(connectRoomMock).toHaveBeenCalled();
  });
});
