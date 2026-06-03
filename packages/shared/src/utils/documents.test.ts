import { describe, it, expect } from 'vitest';
import { parseRef, buildRef, type ParsedRef } from './documents.js';

const validRef = 'https://www.eweser.com|notes|room-abc-123|doc-xyz-789';

describe('parseRef', () => {
  it('parses a valid ref string into its components', () => {
    const result = parseRef(validRef);
    expect(result).toEqual<ParsedRef>({
      authServer: 'https://www.eweser.com',
      collectionKey: 'notes',
      roomId: 'room-abc-123',
      documentId: 'doc-xyz-789',
    });
  });

  it('round-trips with buildRef', () => {
    const params = {
      authServer: 'https://selfhosted.example.com',
      collectionKey: 'flashcards' as const,
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      documentId: 'doc-42',
    };
    const ref = buildRef(params);
    const parsed = parseRef(ref);
    expect(parsed).toEqual(params);
  });

  it('throws for empty string', () => {
    expect(() => parseRef('')).toThrow('ref must be a non-empty string');
  });

  it('throws for non-string input', () => {
    expect(() => parseRef(null as unknown as string)).toThrow(
      'ref must be a non-empty string'
    );
    expect(() => parseRef(undefined as unknown as string)).toThrow(
      'ref must be a non-empty string'
    );
  });

  it('throws for too few parts with descriptive message', () => {
    expect(() => parseRef('server|notes|room1')).toThrow(
      /Invalid ref format.*3 parts/
    );
  });

  it('throws for too many parts with descriptive message', () => {
    expect(() => parseRef('server|notes|room1|doc1|extra')).toThrow(
      /Invalid ref format.*5 parts/
    );
  });

  it('throws when authServer is empty', () => {
    expect(() => parseRef('|notes|room1|doc1')).toThrow(
      'authServer is empty in ref'
    );
  });

  it('throws when collectionKey is empty', () => {
    expect(() => parseRef('server||room1|doc1')).toThrow(
      'collectionKey is empty in ref'
    );
  });

  it('throws when roomId is empty', () => {
    expect(() => parseRef('server|notes||doc1')).toThrow(
      'roomId is empty in ref'
    );
  });

  it('throws when documentId is empty', () => {
    expect(() => parseRef('server|notes|room1|')).toThrow(
      'documentId is empty in ref'
    );
  });

  it('parses refs with hyphens and special characters in documentId', () => {
    const ref = 'https://eweser.com|profiles|room-x|user_john-doe+test';
    const result = parseRef(ref);
    expect(result.documentId).toBe('user_john-doe+test');
    expect(result.collectionKey).toBe('profiles');
  });

  it('parses https:// auth server URLs correctly', () => {
    const ref = 'https://auth.myserver.com:8080|notes|room-1|doc-1';
    const result = parseRef(ref);
    expect(result.authServer).toBe('https://auth.myserver.com:8080');
  });
});
