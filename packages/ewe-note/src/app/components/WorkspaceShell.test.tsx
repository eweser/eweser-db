// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceShell } from './WorkspaceShell';
import { WORKSPACE_MODE_STORAGE_KEY } from './workspace-layout';

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('./EnhancedSidebar', () => ({
  EnhancedSidebar: () => <aside data-cy="mock-sidebar">Sidebar</aside>,
}));

vi.mock('./NotesListPane', () => ({
  NotesListPane: () => <section data-cy="mock-notes-pane">Notes</section>,
}));

vi.mock('./EnhancedCommandPalette', () => ({
  EnhancedCommandPalette: ({ open }: { open: boolean }) =>
    open ? <div data-cy="mock-command-palette">Palette</div> : null,
}));

describe('WorkspaceShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows panes for the saved mode and persists hotkey changes', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    expect(screen.queryByText('Sidebar')).not.toBeNull();
    expect(screen.queryByText('Notes')).not.toBeNull();
    expect(screen.queryByText('Editor')).not.toBeNull();
    expect(screen.queryByText('Palette')).toBeNull();

    fireEvent.keyDown(window, {
      key: '4',
      code: 'Digit4',
      metaKey: true,
      bubbles: true,
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('4');
    });
    expect(screen.queryByText('Metadata')).not.toBeNull();

    fireEvent.keyDown(window, {
      key: '1',
      code: 'Digit1',
      metaKey: true,
      bubbles: true,
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('1');
    });
    expect(screen.queryByText('Sidebar')).toBeNull();
    expect(screen.queryByText('Notes')).toBeNull();
    expect(screen.queryByText('Metadata')).toBeNull();
    expect(screen.queryByText('Editor')).not.toBeNull();
  });

  it('ignores workspace hotkeys from editable targets', () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');

    render(
      <WorkspaceShell>
        <input aria-label="editor input" />
      </WorkspaceShell>
    );

    const input = screen.getByLabelText('editor input');
    fireEvent.keyDown(input, {
      key: '1',
      code: 'Digit1',
      ctrlKey: true,
      bubbles: true,
    });

    expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('3');
    expect(screen.queryByText('Sidebar')).not.toBeNull();
    expect(screen.queryByText('Notes')).not.toBeNull();
  });
});
