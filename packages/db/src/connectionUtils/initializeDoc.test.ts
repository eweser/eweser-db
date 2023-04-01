import { describe, it, expect } from 'vitest';
import { initializeDocAndLocalProvider } from './initializeDoc';
import 'fake-indexeddb/auto';
import { buildRef, newDocument } from '../utils';
import { CollectionKey } from '../types';
import { testRoomAlias } from '../test-utils';
type TestDocument = {
  testDocKey: string;
};

describe('initializeDoc', () => {
  it('Can initialize a yjs doc', async () => {
    const { doc, localProvider } = await initializeDocAndLocalProvider('test');
    expect(doc?.store).toBeDefined();
    expect(localProvider?.name).toBe('test');
  });
  it('can set data to the doc', async () => {
    const { doc } = await initializeDocAndLocalProvider<TestDocument>('test');
    const roomAlias = testRoomAlias;
    const ref = buildRef({
      collection: CollectionKey.notes,
      roomAlias,
      documentID: 'testDocumentId',
    });
    const testDocument = newDocument<TestDocument>(ref, {
      testDocKey: 'testDocValue',
    });
    const ymap = doc.getMap('documents');
    ymap.set('testDocumentId', testDocument);
    expect(ymap.get('testDocumentId')).toEqual(testDocument);
  });
});
