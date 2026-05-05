// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotesListPane } from './NotesListPane';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/NotesContext', () => ({
  useNotes: () => ({
    notes: [
      {
        id: 'note-1',
        title: 'Folder note',
        content: 'Folder note body',
        folder: 'folder-1',
        tags: [],
        pinned: false,
        updatedAt: '2026-05-04T00:00:00.000Z',
      },
    ],
    folders: [{ id: 'folder-1', name: 'Projects' }],
    tasks: [],
    addNote: vi.fn(() => ({ id: 'note-created' })),
    getPinnedNotes: vi.fn(() => []),
    getRecentNotes: vi.fn(() => []),
    getNotesInFolder: vi.fn(() => [
      {
        id: 'note-1',
        title: 'Folder note',
        content: 'Folder note body',
        folder: 'folder-1',
        tags: [],
        pinned: false,
        updatedAt: '2026-05-04T00:00:00.000Z',
      },
    ]),
  }),
}));

describe('NotesListPane', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the active folder filter and can clear back to recent', () => {
    const onViewChange = vi.fn();

    render(
      <NotesListPane
        activeView="folder:folder-1"
        onSearchClick={vi.fn()}
        selectedNoteId={null}
        mode={3}
        onModeChange={vi.fn()}
        onViewChange={onViewChange}
      />
    );

    const filterBanner = screen.getByRole('button', {
      name: 'Clear current filter',
    }).parentElement;
    expect(filterBanner).not.toBeNull();
    expect(
      within(filterBanner as HTMLElement).getByText('Projects')
    ).not.toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Clear current filter' })
    );

    expect(onViewChange).toHaveBeenCalledWith('recent');
  });
});
