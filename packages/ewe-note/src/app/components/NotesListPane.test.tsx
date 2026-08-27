// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotesListPane, noteListPreview } from './NotesListPane';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/NotesContext', () => ({
  useNotes: () => ({
    agentWorkspaceEnabled: false,
    canCreateNote: true,
    notes: [
      {
        id: 'note-1',
        title: 'Folder note',
        content: 'Folder note body',
        folder: 'folder-1',
        tags: [],
        pinned: false,
        updatedAt: '2026-05-04T00:00:00.000Z',
        sourcePath: 'Projects/Folder note.md',
        sourceBreadcrumb: ['Projects', 'Folder note.md'],
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
        sourcePath: 'Projects/Folder note.md',
        sourceBreadcrumb: ['Projects', 'Folder note.md'],
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
    expect(
      within(filterBanner as HTMLElement).getByText('Including subfolders')
    ).not.toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Clear current filter' })
    );

    expect(onViewChange).toHaveBeenCalledWith('recent');
  });

  it('shows imported source paths in note list metadata', () => {
    render(
      <NotesListPane
        activeView="folder:folder-1"
        onSearchClick={vi.fn()}
        selectedNoteId={null}
        mode={3}
        onModeChange={vi.fn()}
        onViewChange={vi.fn()}
      />
    );

    expect(screen.getByText('Projects/Folder note.md')).not.toBeNull();
  });

  describe('noteListPreview', () => {
    it('strips Markdown syntax from the preview text', () => {
      const preview = noteListPreview(
        '# Heading\n\n- [ ] Task one\n> [!note] Callout\n\nSee [[Other Note|the other]] and **bold**.'
      );

      expect(preview).toContain('Heading');
      expect(preview).toContain('○ Task one');
      expect(preview).toContain('the other');
      expect(preview).not.toContain('[[');
      expect(preview).not.toContain('**');
      expect(preview).not.toContain('#');
    });

    it('only reads the head of a long note', () => {
      // The row clamps to two lines, so preview cost must not grow with note
      // size. A marker past the limit proves the tail is never scanned.
      const body = `${'lorem ipsum dolor sit amet '.repeat(400)}TAIL_MARKER`;

      expect(body.length).toBeGreaterThan(10_000);
      expect(noteListPreview(body)).not.toContain('TAIL_MARKER');
      expect(noteListPreview(body).length).toBeLessThanOrEqual(600);
    });

    it('keeps short notes intact', () => {
      expect(noteListPreview('A short note body.')).toBe('A short note body.');
    });
  });
});
