// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEweNoteRouter, routes } from './routes';

const addNote = vi.hoisted(() => vi.fn(() => ({ id: 'created-note' })));

vi.mock('./contexts/NotesContext', () => ({
  useNotes: () => ({
    addNote,
  }),
}));

vi.mock('./components/WorkspaceShell', () => ({
  WorkspaceShell: ({ children }: { children: ReactNode }) => (
    <div data-cy="workspace-shell">{children}</div>
  ),
}));

vi.mock('./pages/EnhancedEditor', () => ({
  EnhancedEditor: () => <div data-cy="editor-route">Editor route</div>,
}));

vi.mock('./pages/Settings', () => ({
  Settings: () => <div data-cy="settings-route">Settings route</div>,
}));

describe('Ewe Note routes', () => {
  beforeEach(() => {
    addNote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the editor route when the notes app is mounted under /notes', () => {
    window.history.replaceState(null, '', '/notes/editor/note-123');
    const router = createEweNoteRouter('/notes');

    render(<RouterProvider router={router} />);

    expect(document.querySelector('[data-cy="editor-route"]')).not.toBeNull();
    expect(router.state.matches.at(-1)?.params.noteId).toBe('note-123');
    router.dispose();
  });

  it('keeps new-note navigation under the /notes mount point', async () => {
    const router = createMemoryRouter(routes, {
      basename: '/notes',
      initialEntries: ['/notes/'],
    });

    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole('button', { name: 'New note' }));

    expect(addNote).toHaveBeenCalledWith({ title: 'Untitled', content: '' });
    expect(router.state.location.pathname).toBe('/notes/editor/created-note');
    expect(document.querySelector('[data-cy="editor-route"]')).not.toBeNull();
  });

  it('keeps local root new-note navigation root-based', () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/'],
    });

    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole('button', { name: 'New note' }));

    expect(addNote).toHaveBeenCalledWith({ title: 'Untitled', content: '' });
    expect(router.state.location.pathname).toBe('/editor/created-note');
    expect(document.querySelector('[data-cy="editor-route"]')).not.toBeNull();
  });
});
