import { describe, it, expect } from 'vitest';
import { CollectionKey } from '../../types';
import { parseRef } from './parseRef';
import { buildRef } from './buildRef';

describe('parseRef', () => {
  const collectionKey = CollectionKey.flashcards;
  const aliasSeed = 'seed';
  const documentId = 'doc-id';
  const ref = buildRef({ collectionKey, aliasSeed, documentId });
  it('builds a valid ref', () => {
    const expected = { collectionKey, aliasSeed, documentId };
    const actual = parseRef(ref);
    expect(actual).toEqual(expected);
  });
  it('throws if ref is missing a part', () => {
    expect(() => parseRef(`${collectionKey}.${aliasSeed}`)).toThrow(
      'ref must have 3 parts'
    );
  });
  it('runs aliasSeed validation', () => {
    expect(() =>
      parseRef(`${collectionKey}.#badAliasSeed.${documentId}`)
    ).toThrow();
  });
  it('validates collectionKey is a valid collectionKey', () => {
    expect(() => parseRef(`${'not-key'}.${aliasSeed}.${documentId}`)).toThrow(
      'collectionKey is not a valid collectionKey'
    );
  });
});
