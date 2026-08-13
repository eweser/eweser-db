// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('../contexts/NotesContext', () => ({
  useNotes: () => ({
    notes: [],
    folders: [],
    updateNote: () => undefined,
    togglePinNote: () => undefined,
    deleteNote: () => undefined,
    addNote: () => ({ id: 'created-note' }),
    moveNote: () => undefined,
    resolveWikiLink: () => null,
  }),
}));

vi.mock('@/db', () => ({
  getDeviceType: () => 'Unknown',
  useDb: () => ({
    allRooms: [],
    selectedRoom: null,
    setSelectedRoom: () => undefined,
    setSelectedNoteId: () => undefined,
  }),
}));

import {
  buildEditorWikiLinkPath,
  shouldWaitForRemoteNote,
} from './EnhancedEditor';

describe('EnhancedEditor wiki navigation helpers', () => {
  it('keeps a missing synced note in hydration state during the grace period', () => {
    expect(
      shouldWaitForRemoteNote({
        hasToken: true,
        noteFound: false,
        syncInProgress: false,
        waitExpired: false,
      })
    ).toBe(true);
    expect(
      shouldWaitForRemoteNote({
        hasToken: true,
        noteFound: false,
        syncInProgress: false,
        waitExpired: true,
      })
    ).toBe(false);
  });

  it('keeps waiting while synced rooms are still connecting', () => {
    expect(
      shouldWaitForRemoteNote({
        hasToken: true,
        noteFound: false,
        syncInProgress: true,
        waitExpired: true,
      })
    ).toBe(true);
  });
  it('preserves heading targets as editor URL hashes', () => {
    expect(
      buildEditorWikiLinkPath('note-target', {
        noteId: null,
        noteName: '05 Link Targets',
        heading: 'Canonical Heading Target',
      })
    ).toBe('/editor/note-target#canonical-heading-target');
  });

  it('preserves block references as editor URL hashes', () => {
    expect(
      buildEditorWikiLinkPath('note-target', {
        noteId: null,
        noteName: '05 Link Targets',
        blockRef: 'addressable-block',
      })
    ).toBe('/editor/note-target#%5Eaddressable-block');
  });
});
