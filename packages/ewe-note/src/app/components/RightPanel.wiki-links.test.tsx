// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RightPanel } from './RightPanel';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  updateNote: vi.fn(),
  convertUnlinkedMentionToLink: vi.fn(),
  note: {
    id: 'note-linking',
    roomId: 'room-notes',
    title: 'Linking Note',
    content: 'Read [[Missing Feature Note]] before shipping.',
    folder: '',
    tags: [],
    properties: {},
    aliases: [],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-05T00:00:00.000Z',
    pinned: false,
    links: [],
    outgoingLinks: [
      {
        target: 'Missing Feature Note',
        display: 'Missing Feature Note',
        noteId: null,
        raw: '[[Missing Feature Note]]',
      },
    ],
    backlinks: [],
    unlinkedMentions: [],
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../contexts/NotesContext', () => ({
  useNotes: () => ({
    notes: [mocks.note],
    updateNote: mocks.updateNote,
    convertUnlinkedMentionToLink: mocks.convertUnlinkedMentionToLink,
  }),
}));

describe('RightPanel wiki links', () => {
  beforeEach(() => {
    mocks.navigate.mockClear();
    mocks.updateNote.mockClear();
    mocks.convertUnlinkedMentionToLink.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('exposes unresolved wiki links as an accessible broken-link status', () => {
    render(<RightPanel noteId="note-linking" />);

    fireEvent.mouseDown(screen.getByRole('tab', { name: /links/i }), {
      button: 0,
      ctrlKey: false,
    });

    const linksPanel = screen.getByText('Unresolved Links (1)').closest('div');
    expect(linksPanel).not.toBeNull();
    const unresolved = within(linksPanel as HTMLElement).getByRole('status', {
      name: 'Unresolved wiki link: Missing Feature Note',
    });

    expect(unresolved.getAttribute('data-cy')).toBe(
      'ewe-note-unresolved-wiki-link'
    );
    expect(within(unresolved).getByText('Missing Feature Note')).not.toBeNull();
    expect(within(unresolved).getByText('Unresolved wiki link')).not.toBeNull();
  });
});
