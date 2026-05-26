import { describe, expect, it } from 'vitest';
import {
  buildAppPath,
  normalizeBase,
  resolveAuthServerUrl,
  resolveRouterBase,
  stripTrailingSlash,
} from './config';

describe('config helpers', () => {
  it('normalizes nested base paths for the notes SPA', () => {
    expect(normalizeBase('/notes/')).toBe('/notes');
    expect(normalizeBase('notes')).toBe('/notes');
    expect(normalizeBase('/')).toBe('/');
  });

  it('builds app paths under the /notes mount point', () => {
    expect(buildAppPath('/notes/', '/')).toBe('/notes/');
    expect(buildAppPath('/notes/', 'editor')).toBe('/notes/editor');
  });

  it('uses the /notes router base when the root-built app is loaded there', () => {
    expect(resolveRouterBase('/', '/notes/')).toBe('/notes');
    expect(resolveRouterBase('/', '/notes/editor/note-123')).toBe('/notes');
    expect(resolveRouterBase('/', '/editor/note-123')).toBe('/');
  });

  it('resolves the auth server against the current origin by default', () => {
    expect(resolveAuthServerUrl(undefined, 'http://localhost')).toBe(
      'http://localhost:38101'
    );
    expect(resolveAuthServerUrl('/auth', 'http://localhost')).toBe(
      'http://localhost/auth'
    );
    expect(stripTrailingSlash('http://localhost/')).toBe('http://localhost');
  });
});
