import { describe, it, expect } from 'vitest';
import { initializeDocAndLocalProvider } from './initializeDoc';

import { buildRef, newDocument } from '../../utils';
import { CollectionKey } from '../../types';
import { testroomId } from '../../test-utils';

describe('initializeDoc', () => {
  it('Can initialize a yjs doc', async () => {
    const { ydoc, localProvider } = await initializeDocAndLocalProvider('test');
    expect(ydoc?.store).toBeDefined();
    expect(localProvider?.name).toBe('test');
  });
  it('can set data to the doc', async () => {
    const { ydoc } = await initializeDocAndLocalProvider<any>('test');
    const ref = buildRef({
      collectionKey: 'notes',
      roomId: testroomId,
      documentId: 'testDocumentId',
    });
    const testDocument = newDocument<any>(ref, {
      testDocKey: 'testDocValue',
    });
    const ymap = ydoc.getMap('documents');
    ymap.set('testDocumentId', testDocument);

    const gotten = ymap.get('testDocumentId')?.testDocKey;
    expect(gotten).toEqual('testDocValue');
  });
});
