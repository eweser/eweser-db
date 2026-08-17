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
    id: 'note-source',
    roomId: 'room-notes',
    title: 'Overview',
    content: '# Overview\n\nImported source metadata should stay visible.',
    folder: '',
    tags: ['journal'],
    properties: { status: 'reviewed' },
    aliases: [],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-05T00:00:00.000Z',
    pinned: false,
    links: [],
    outgoingLinks: [],
    backlinks: [],
    unlinkedMentions: [],
    sourcePath: 'Projects/Overview.md',
    sourceVault: 'feature-vault',
    sourceDirectory: 'Projects',
    sourceBreadcrumb: ['Projects', 'Overview.md'],
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

vi.mock('@/hooks/use-unlinked-mentions', () => ({
  useUnlinkedMentions: () => [],
}));

describe('RightPanel source metadata', () => {
  beforeEach(() => {
    mocks.navigate.mockClear();
    mocks.updateNote.mockClear();
    mocks.convertUnlinkedMentionToLink.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows imported source path and vault in the metadata tab', () => {
    render(<RightPanel noteId="note-source" />);

    expect(screen.queryByText('Source path')).toBeNull();

    fireEvent.mouseDown(screen.getByRole('tab', { name: /meta/i }), {
      button: 0,
      ctrlKey: false,
    });

    const metadata = screen.getByText('Metadata').closest('div');
    expect(metadata).not.toBeNull();
    expect(
      within(metadata as HTMLElement).getByText('Source path')
    ).not.toBeNull();
    expect(
      within(metadata as HTMLElement).getByText('Projects/Overview.md')
    ).not.toBeNull();
    expect(
      within(metadata as HTMLElement).getByText('Source vault')
    ).not.toBeNull();
    expect(
      within(metadata as HTMLElement).getByText('feature-vault')
    ).not.toBeNull();
  });

  it('shows metadata but no mutation controls when the room is read only', () => {
    render(<RightPanel noteId="note-source" readOnly />);

    fireEvent.mouseDown(screen.getByRole('tab', { name: /meta/i }), {
      button: 0,
      ctrlKey: false,
    });

    expect(screen.getByText('journal')).not.toBeNull();
    expect(screen.getByText('reviewed')).not.toBeNull();
    expect(screen.queryByLabelText('Remove tag journal')).toBeNull();
    expect(screen.queryByLabelText('Remove property status')).toBeNull();
    expect(screen.queryByPlaceholderText('Add tag...')).toBeNull();
    expect(screen.queryByPlaceholderText('Property name...')).toBeNull();
  });
});
