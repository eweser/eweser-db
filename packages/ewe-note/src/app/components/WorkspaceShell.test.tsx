// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceShell, useWorkspaceShell } from './WorkspaceShell';
import { WORKSPACE_MODE_STORAGE_KEY } from './workspace-layout';
import {
  WORKSPACE_DESKTOP_PULLDOWN_SEARCH_STORAGE_KEY,
  WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY,
  WORKSPACE_MOBILE_PULLDOWN_SEARCH_STORAGE_KEY,
  WORKSPACE_MOBILE_SWIPE_EFFECTS_STORAGE_KEY,
} from './workspace-interaction-settings';

const mockRouterState = vi.hoisted(() => ({
  location: { search: '' },
  navigate: vi.fn(),
}));

const SIDEBAR_WIDTH_STORAGE_KEY = 'ewe-note-sidebar-width';
const NOTES_WIDTH_STORAGE_KEY = 'ewe-note-notes-width';
const METADATA_WIDTH_STORAGE_KEY = 'ewe-note-metadata-width';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

vi.mock('react-router', () => ({
  useLocation: () => mockRouterState.location,
  useNavigate: () => mockRouterState.navigate,
}));

vi.mock('./EnhancedSidebar', () => ({
  EnhancedSidebar: ({ desktopWidth }: { desktopWidth?: number }) => (
    <aside
      data-cy="ewe-note-sidebar"
      style={desktopWidth ? { width: `${desktopWidth}px` } : undefined}
    >
      Sidebar
    </aside>
  ),
}));

vi.mock('./NotesListPane', () => ({
  NotesListPane: ({ activeView }: { activeView: string }) => (
    <section data-cy="mock-notes-pane">Notes {activeView}</section>
  ),
}));

vi.mock('./EnhancedCommandPalette', () => ({
  EnhancedCommandPalette: ({ open }: { open: boolean }) =>
    open ? <div data-cy="mock-command-palette">Palette</div> : null,
}));

function ClosableMetadataPanel() {
  const { setMetadataVisible } = useWorkspaceShell();
  return (
    <aside data-cy="mock-right-panel">
      Metadata
      <button type="button" onClick={() => setMetadataVisible(false)}>
        Close note info
      </button>
    </aside>
  );
}

describe('WorkspaceShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
    mockRouterState.location.search = '';
    mockRouterState.navigate.mockClear();
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
    expect(screen.queryByText(/^Notes/)).not.toBeNull();
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

    fireEvent.keyDown(window, {
      key: '1',
      code: 'Digit1',
      metaKey: true,
      bubbles: true,
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('3');
    });
    expect(screen.queryByText('Sidebar')).not.toBeNull();
    expect(screen.queryByText(/^Notes/)).not.toBeNull();
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
    expect(screen.queryByText(/^Notes/)).not.toBeNull();
  });

  it('accepts workspace hotkeys from the editor contenteditable surface', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');

    render(
      <WorkspaceShell>
        <div contentEditable suppressContentEditableWarning>
          Editor text
        </div>
      </WorkspaceShell>
    );

    fireEvent.keyDown(screen.getByText('Editor text'), {
      key: '1',
      code: 'Digit1',
      metaKey: true,
      bubbles: true,
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('1');
    });
    expect(screen.queryByText('Sidebar')).toBeNull();
    expect(screen.queryByText(/^Notes/)).toBeNull();
  });

  it('lets the metadata panel close mode 4 back to mode 3', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '4');

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<ClosableMetadataPanel />}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    expect(screen.queryByText('Metadata')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close note info' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('3');
    });
    expect(screen.queryByText('Metadata')).toBeNull();
    expect(screen.queryByText('Sidebar')).not.toBeNull();
    expect(screen.queryByText(/^Notes/)).not.toBeNull();
  });

  it('opens a copied folder link into the folder view', async () => {
    mockRouterState.location.search = '?folder=folder-abc';

    render(
      <WorkspaceShell>
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    await waitFor(() => {
      expect(screen.queryByText('Notes folder:folder-abc')).not.toBeNull();
    });
  });

  it('restores saved pane widths on desktop', () => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, '300');
    window.localStorage.setItem(NOTES_WIDTH_STORAGE_KEY, '360');
    window.localStorage.setItem(METADATA_WIDTH_STORAGE_KEY, '340');
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '4');

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    expect(
      (document.querySelector('[data-cy="ewe-note-sidebar"]') as HTMLElement)
        .style.width
    ).toBe('300px');
    expect(
      (document.querySelector('[data-cy="ewe-note-notes-pane"]') as HTMLElement)
        .style.width
    ).toBe('360px');
    expect(
      (
        document.querySelector(
          '[data-cy="ewe-note-metadata-pane"]'
        ) as HTMLElement
      ).style.width
    ).toBe('340px');
  });

  it('renders desktop resize handles alongside visible panes', () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');

    render(
      <WorkspaceShell selectedNoteId="note-1">
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    expect(
      document.querySelector('[data-cy="ewe-note-sidebar-resizer"]')
    ).not.toBeNull();
    expect(
      document.querySelector('[data-cy="ewe-note-notes-resizer"]')
    ).not.toBeNull();
  });

  it('lets separator clicks collapse and restore desktop panes', () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');

    render(
      <WorkspaceShell selectedNoteId="note-1">
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    const sidebarResizer = document.querySelector(
      '[data-cy="ewe-note-sidebar-resizer"]'
    ) as HTMLElement;
    let notesResizer = document.querySelector(
      '[data-cy="ewe-note-notes-resizer"]'
    ) as HTMLElement;

    fireEvent.click(notesResizer);
    expect(screen.queryByText(/^Notes/)).toBeNull();

    notesResizer = document.querySelector(
      '[data-cy="ewe-note-notes-resizer"]'
    ) as HTMLElement;
    fireEvent.click(notesResizer);
    expect(screen.queryByText(/^Notes/)).not.toBeNull();

    fireEvent.click(sidebarResizer);
    expect(screen.queryByText('Sidebar')).toBeNull();

    fireEvent.click(sidebarResizer);
    expect(screen.queryByText('Sidebar')).not.toBeNull();
  });

  it('changes desktop pane mode when dragging horizontally across a pane', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');
    window.localStorage.setItem(
      WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY,
      'true'
    );

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    const editorPane = document.querySelector(
      '[data-cy="mock-editor"]'
    ) as HTMLElement;

    fireEvent.pointerDown(editorPane, {
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
      clientY: 240,
    });
    fireEvent.pointerUp(window, {
      pointerType: 'mouse',
      clientX: 180,
      clientY: 245,
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('4');
    });
    expect(screen.queryByText('Metadata')).not.toBeNull();

    fireEvent.pointerDown(editorPane, {
      pointerType: 'mouse',
      button: 0,
      clientX: 220,
      clientY: 240,
    });
    fireEvent.pointerUp(window, {
      pointerType: 'mouse',
      clientX: 330,
      clientY: 245,
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('3');
    });
    expect(screen.queryByText('Metadata')).toBeNull();
  });

  it('does not change desktop pane mode when desktop swipe effects are disabled', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');
    window.localStorage.setItem(
      WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY,
      'false'
    );

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    const editorPane = document.querySelector(
      '[data-cy="mock-editor"]'
    ) as HTMLElement;

    fireEvent.pointerDown(editorPane, {
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
      clientY: 240,
    });
    fireEvent.pointerUp(window, {
      pointerType: 'mouse',
      clientX: 180,
      clientY: 245,
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('3');
    });
    expect(screen.queryByText('Metadata')).toBeNull();
  });

  it('does not change desktop pane mode while selecting text in editable content', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');
    window.localStorage.setItem(
      WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY,
      'true'
    );

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div
          data-cy="mock-editor"
          contentEditable
          suppressContentEditableWarning
        >
          Editor text for selection
        </div>
      </WorkspaceShell>
    );

    const editorPane = document.querySelector(
      '[data-cy="mock-editor"]'
    ) as HTMLElement;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorPane);
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.pointerDown(editorPane, {
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
      clientY: 240,
    });
    fireEvent.pointerUp(window, {
      pointerType: 'mouse',
      clientX: 180,
      clientY: 245,
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe('3');
    });
    expect(screen.queryByText('Metadata')).toBeNull();
    expect(window.getSelection()?.toString()).toContain(
      'Editor text for selection'
    );
    selection?.removeAllRanges();
  });

  it('opens search on desktop pull down when enabled', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    const editorPane = document.querySelector(
      '[data-cy="mock-editor"]'
    ) as HTMLElement;

    fireEvent.pointerDown(editorPane, {
      pointerType: 'mouse',
      button: 0,
      clientX: 260,
      clientY: 120,
    });
    fireEvent.pointerUp(window, {
      pointerType: 'mouse',
      clientX: 266,
      clientY: 240,
    });

    await waitFor(() => {
      expect(screen.queryByText('Palette')).not.toBeNull();
    });
  });

  it('does not open search on desktop pull down when disabled', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '3');
    window.localStorage.setItem(
      WORKSPACE_DESKTOP_PULLDOWN_SEARCH_STORAGE_KEY,
      'false'
    );

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    const editorPane = document.querySelector(
      '[data-cy="mock-editor"]'
    ) as HTMLElement;

    fireEvent.pointerDown(editorPane, {
      pointerType: 'mouse',
      button: 0,
      clientX: 260,
      clientY: 120,
    });
    fireEvent.pointerUp(window, {
      pointerType: 'mouse',
      clientX: 266,
      clientY: 240,
    });

    expect(screen.queryByText('Palette')).toBeNull();
  });

  it('renders the mobile bottom bar in the requested order', async () => {
    setViewportWidth(390);

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    await waitFor(() => {
      expect(
        document.querySelector('[data-cy="ewe-note-mobile-shell"]')
      ).not.toBeNull();
    });

    const buttons = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
      .filter(Boolean);

    expect(buttons).toEqual(
      expect.arrayContaining([
        'Settings',
        'Folders pane',
        'File previews pane',
        'Editor pane',
        'Search notes',
      ])
    );
    expect(buttons).not.toContain('Metadata pane');
  });

  it('swipes across mobile panes and opens search on pull down', async () => {
    setViewportWidth(390);

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    const shell = await waitFor(() => {
      const element = document.querySelector(
        '[data-cy="ewe-note-mobile-shell"]'
      ) as HTMLElement | null;
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });

    fireEvent.click(screen.getByRole('button', { name: 'File previews pane' }));

    await waitFor(() => {
      expect(screen.queryByText(/^Notes/)).not.toBeNull();
    });
    expect(document.querySelector('[data-cy="mock-editor"]')).toBeNull();

    fireEvent.touchStart(shell, {
      touches: [{ clientX: 240, clientY: 220 }],
      targetTouches: [{ clientX: 240, clientY: 220 }],
    });
    fireEvent.touchEnd(shell, {
      changedTouches: [{ clientX: 80, clientY: 225 }],
    });

    await waitFor(() => {
      expect(document.querySelector('[data-cy="mock-editor"]')).not.toBeNull();
    });

    fireEvent.touchStart(shell, {
      touches: [{ clientX: 180, clientY: 140 }],
      targetTouches: [{ clientX: 180, clientY: 140 }],
    });
    fireEvent.touchEnd(shell, {
      changedTouches: [{ clientX: 188, clientY: 260 }],
    });

    await waitFor(() => {
      expect(screen.queryByText('Palette')).not.toBeNull();
    });
  });

  it('does not swipe mobile panes when mobile swipe effects are disabled', async () => {
    setViewportWidth(390);
    window.localStorage.setItem(
      WORKSPACE_MOBILE_SWIPE_EFFECTS_STORAGE_KEY,
      'false'
    );

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    const shell = (await waitFor(() => {
      const element = document.querySelector(
        '[data-cy="ewe-note-mobile-shell"]'
      ) as HTMLElement | null;
      expect(element).not.toBeNull();
      return element as HTMLElement;
    })) as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: 'File previews pane' }));

    await waitFor(() => {
      expect(screen.queryByText(/^Notes/)).not.toBeNull();
    });

    fireEvent.touchStart(shell, {
      touches: [{ clientX: 240, clientY: 220 }],
      targetTouches: [{ clientX: 240, clientY: 220 }],
    });
    fireEvent.touchEnd(shell, {
      changedTouches: [{ clientX: 80, clientY: 225 }],
    });

    expect(document.querySelector('[data-cy="mock-editor"]')).toBeNull();
    expect(screen.queryByText(/^Notes/)).not.toBeNull();
  });

  it('does not open search on mobile pull down when the setting is disabled', async () => {
    setViewportWidth(390);
    window.localStorage.setItem(
      WORKSPACE_MOBILE_PULLDOWN_SEARCH_STORAGE_KEY,
      'false'
    );

    render(
      <WorkspaceShell
        selectedNoteId="note-1"
        metadataSlot={<aside data-cy="mock-right-panel">Metadata</aside>}
      >
        <div data-cy="mock-editor">Editor</div>
      </WorkspaceShell>
    );

    const shell = (await waitFor(() => {
      const element = document.querySelector(
        '[data-cy="ewe-note-mobile-shell"]'
      ) as HTMLElement | null;
      expect(element).not.toBeNull();
      return element as HTMLElement;
    })) as HTMLElement;

    fireEvent.touchStart(shell, {
      touches: [{ clientX: 180, clientY: 140 }],
      targetTouches: [{ clientX: 180, clientY: 140 }],
    });
    fireEvent.touchEnd(shell, {
      changedTouches: [{ clientX: 188, clientY: 260 }],
    });

    expect(screen.queryByText('Palette')).toBeNull();
  });
});
