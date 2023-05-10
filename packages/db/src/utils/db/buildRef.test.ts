import { describe, it, expect } from 'vitest';
import { CollectionKey } from '../../types';
import { buildRef } from './buildRef';

describe('buildRef', () => {
  const collectionKey = CollectionKey.flashcards;
  const aliasSeed = 'seed';
  const documentId = 'doc-id';
  it('builds a valid ref', () => {
    const expected = `${collectionKey}.${aliasSeed}.${documentId}`;
    const actual = buildRef({ collectionKey, aliasSeed, documentId });
    expect(actual).toEqual(expected);
  });
  it('throws if documentId includes .', () => {
    expect(() =>
      buildRef({ collectionKey, aliasSeed, documentId: 'doc.id' })
    ).toThrow();
  });
});
