import { describe, it, expect } from 'vitest';
import { CollectionKey } from '../../types';
import { buildRef } from './buildRef';

describe('buildRef', () => {
  const collectionKey = 'flashcards';
  const roomId = 'seed';
  const documentId = 'doc-id';
  it('builds a valid ref', () => {
    const expected = `${collectionKey}.${roomId}.${documentId}`;
    const actual = buildRef({ collectionKey, roomId, documentId });
    expect(actual).toEqual(expected);
  });
  it('throws if documentId includes .', () => {
    expect(() =>
      buildRef({ collectionKey, roomId, documentId: 'doc.id' })
    ).toThrow();
  });
});
