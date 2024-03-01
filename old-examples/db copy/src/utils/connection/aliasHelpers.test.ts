import { describe, it, expect } from 'vitest';
import { CollectionKey } from '../../types';
import {
  buildAliasFromSeed,
  buildRegistryroomId,
  buildSpaceroomId,
  getAliasNameFromAlias,
  getroomIdFromAlias,
} from './aliasHelpers';

describe('aliasHelpers', () => {
  it('buildAliasFromSeed', () => {
    const actual = buildAliasFromSeed(
      'roomName',
      'flashcards',
      '@username:matrix.org'
    );

    const expected = '#roomName~flashcards~@username:matrix.org';

    expect(actual).toEqual(expected);
  });
  it('doesnt allow roomId to be longer than 52 characters', () => {
    expect(() =>
      buildAliasFromSeed(
        'roomName123456789012345678901234123456789012345678901234123456789012345678901234',
        'flashcards',
        '@username:matrix.org'
      )
    ).toThrowError('roomId must be less than 52 characters');
  });
  it('doesnt allow roomId to contain ~', () => {
    expect(() =>
      buildAliasFromSeed('roomName~', 'flashcards', '@username:matrix.org')
    ).toThrowError('roomId cannot contain a ~');

    expect(() =>
      buildAliasFromSeed('roo@mName', 'flashcards', '@username:matrix.org')
    ).toThrowError('roomId cannot contain a @');
    expect(() =>
      buildAliasFromSeed('roo:mName', 'flashcards', '@username:matrix.org')
    ).toThrowError('roomId cannot contain a :');
  });

  it('getAliasNameFromAlias', () => {
    const actual = getAliasNameFromAlias(
      '#roomName~flashcards~@username:matrix.org'
    );
    const expected = 'roomName~flashcards~@username';
    expect(actual).toEqual(expected);
  });
  it('getroomIdFromAlias', () => {
    const actual = getroomIdFromAlias(
      '#roomName~flashcards~@username:matrix.org'
    );
    const expected = 'roomName';
    expect(actual).toEqual(expected);
  });
  it('getroomIdFromAlias', () => {
    const actual = buildRegistryroomId('@username:matrix.org');
    const expected = '#eweser-db~registry~@username:matrix.org';
    expect(actual).toEqual(expected);
  });
  it('getroomIdFromAlias', () => {
    const actual = buildSpaceroomId('@username:matrix.org');
    const expected = '#eweser-db~space~@username:matrix.org';
    expect(actual).toEqual(expected);
  });
});
