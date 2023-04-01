import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { CollectionKey } from '../types';
import {
  buildAliasFromSeed,
  buildRegistryRoomAlias,
  buildSpaceRoomAlias,
  getAliasNameFromAlias,
  getAliasSeedFromAlias,
} from './aliasHelpers';

describe('aliasHelpers', () => {
  it('buildAliasFromSeed', () => {
    const actual = buildAliasFromSeed(
      'roomName',
      CollectionKey.flashcards,
      '@username:matrix.org'
    );

    const expected = '#roomName~flashcards~@username:matrix.org';

    expect(actual).toEqual(expected);
  });
  it('doesnt allow aliasSeed to be longer than 52 characters', () => {
    expect(() =>
      buildAliasFromSeed(
        'roomName123456789012345678901234123456789012345678901234123456789012345678901234',
        CollectionKey.flashcards,
        '@username:matrix.org'
      )
    ).toThrowError('aliasSeed must be less than 52 characters');
  });
  it('doesnt allow aliasSeed to contain ~', () => {
    expect(() =>
      buildAliasFromSeed(
        'roomName~',
        CollectionKey.flashcards,
        '@username:matrix.org'
      )
    ).toThrowError('aliasSeed cannot contain a ~');

    expect(() =>
      buildAliasFromSeed(
        'roo@mName',
        CollectionKey.flashcards,
        '@username:matrix.org'
      )
    ).toThrowError('aliasSeed cannot contain a @');
    expect(() =>
      buildAliasFromSeed(
        'roo:mName',
        CollectionKey.flashcards,
        '@username:matrix.org'
      )
    ).toThrowError('aliasSeed cannot contain a :');
  });

  it('getAliasNameFromAlias', () => {
    const actual = getAliasNameFromAlias(
      '#roomName~flashcards~@username:matrix.org'
    );
    const expected = 'roomName~flashcards~@username';
    expect(actual).toEqual(expected);
  });
  it('getAliasSeedFromAlias', () => {
    const actual = getAliasSeedFromAlias(
      '#roomName~flashcards~@username:matrix.org'
    );
    const expected = 'roomName';
    expect(actual).toEqual(expected);
  });
  it('getAliasSeedFromAlias', () => {
    const actual = buildRegistryRoomAlias('@username:matrix.org');
    const expected = '#eweser-db~registry~@username:matrix.org';
    expect(actual).toEqual(expected);
  });
  it('getAliasSeedFromAlias', () => {
    const actual = buildSpaceRoomAlias('@username:matrix.org');
    const expected = '#eweser-db~space~@username:matrix.org';
    expect(actual).toEqual(expected);
  });
});
