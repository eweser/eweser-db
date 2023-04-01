import { describe, it, expect } from 'vitest';
import { initializeDocAndLocalProvider } from './initializeDoc';

import { buildRef, newDocument } from '../utils';
import { CollectionKey } from '../types';
import { testRoomAliasSeed } from '../test-utils';
type TestDocument = {
  testDocKey: string;
};

describe('initializeDoc', () => {
  it('Can initialize a yjs doc', async () => {
    const { ydoc, localProvider } = await initializeDocAndLocalProvider('test');
    expect(ydoc?.store).toBeDefined();
    expect(localProvider?.name).toBe('test');
  });
  it('can set data to the doc', async () => {
    const { ydoc } = await initializeDocAndLocalProvider<TestDocument>('test');
    const ref = buildRef({
      collection: CollectionKey.notes,
      roomAliasSeed: testRoomAliasSeed,
      documentID: 'testDocumentId',
    });
    const testDocument = newDocument<TestDocument>(ref, {
      testDocKey: 'testDocValue',
    });
    const ymap = ydoc.getMap('documents');
    ymap.set('testDocumentId', testDocument);

    const gotten = ymap.get('testDocumentId')?.testDocKey;
    expect(gotten).toEqual('testDocValue');
  });
});
