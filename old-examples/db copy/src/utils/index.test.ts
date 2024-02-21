import { describe, it, expect } from 'vitest';
import { buildFullUserId, extractUserIdLocalPart } from '.';

describe('buildFullUserId', () => {
  it('adds homeserver to user local part', () => {
    const homserver = 'https://matrix.org';
    const username = 'jacob';
    const fullUserId = buildFullUserId(username, homserver);
    expect(fullUserId).toBe('@jacob:matrix.org');
  });
  it('can handle http, or homeserver without protocol', () => {
    const homserver = 'matrix.org';
    const username = 'jacob';
    const fullUserId = buildFullUserId(username, homserver);
    expect(fullUserId).toBe('@jacob:matrix.org');

    const homserver2 = 'http://matrix.org';
    const fullUserId2 = buildFullUserId(username, homserver2);
    expect(fullUserId2).toBe('@jacob:matrix.org');
  });
});

describe('extractUserIdLocalPart', () => {
  it('extracts local part from full user id', () => {
    const userId = '@jacob:matrix.org';
    const localPart = extractUserIdLocalPart(userId);
    expect(localPart).toBe('jacob');
  });
});
