import { describe, it, expect } from 'vitest';
import { CollectionKey } from '../../types';
import { parseRef } from './parseRef';
import { buildRef } from './buildRef';

describe('parseRef', () => {
  const collectionKey = 'flashcards';
  const roomId = 'seed';
  const documentId = 'doc-id';
  const ref = buildRef({ collectionKey, roomId, documentId });
  it('builds a valid ref', () => {
    const expected = { collectionKey, roomId, documentId };
    const actual = parseRef(ref);
    expect(actual).toEqual(expected);
  });
  it('throws if ref is missing a part', () => {
    expect(() => parseRef(`${collectionKey}.${roomId}`)).toThrow(
      'ref must have 3 parts'
    );
  });
  it('runs roomId validation', () => {
    expect(() =>
      parseRef(`${collectionKey}.#badroomId.${documentId}`)
    ).toThrow();
  });
  it('validates collectionKey is a valid collectionKey', () => {
    expect(() => parseRef(`${'not-key'}.${roomId}.${documentId}`)).toThrow(
      'collectionKey is not a valid collectionKey'
    );
  });
});
