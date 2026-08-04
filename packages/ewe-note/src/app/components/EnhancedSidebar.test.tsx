// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnhancedSidebar } from './EnhancedSidebar';

const mockNavigate = vi.fn();
const addFolder = vi.fn();
const updateFolder = vi.fn();
const deleteFolder = vi.fn();
const addNote = vi.fn(() => ({ id: 'note-created' }));
const moveNote = vi.fn();
const deleteVault = vi.fn().mockResolvedValue(undefined);
let vaultDeletionEligibility:
  | { canDelete: true; noteCount: 0 }
  | {
      canDelete: false;
      code: 'not-empty';
      reason: string;
      noteCount: number;
    } = { canDelete: true, noteCount: 0 };
const useDrag = vi.fn((_spec: unknown) => [{ isDragging: false }, vi.fn()]);
const useDrop = vi.fn((_spec: unknown) => [{ isOver: false }, vi.fn()]);
const makeNote = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'note-1',
  roomId: 'room-1',
  title: 'Project Plan',
  content: '',
  folder: 'root-folder',
  tags: [],
  properties: {},
  aliases: [],
  createdAt: '2026-05-04T00:00:00.000Z',
  updatedAt: '2026-05-04T00:00:00.000Z',
  pinned: false,
  links: [],
  outgoingLinks: [],
  backlinks: [],
  unlinkedMentions: [],
  ...overrides,
});
const getDirectNotesInFolder = vi.fn((folderId: string) => {
  if (folderId === 'root-folder') {
    return [makeNote({ title: '*Project Plan*', folder: 'root-folder' })];
  }

  if (folderId === 'child-folder') {
    return [
      makeNote({
        id: 'note-2',
        title: '**Child note**',
        folder: 'child-folder',
      }),
    ];
  }

  return [];
});
const getNotesInFolder = vi.fn((folderId: string) =>
  folderId === 'root-folder'
    ? [
        makeNote({ title: '*Project Plan*', folder: 'root-folder' }),
        makeNote({
          id: 'note-2',
          title: '**Child note**',
          folder: 'child-folder',
        }),
      ]
    : folderId === 'child-folder'
      ? [
          makeNote({
            id: 'note-2',
            title: '**Child note**',
            folder: 'child-folder',
          }),
        ]
      : []
);

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/NotesContext', () => ({
  useNotes: () => ({
    currentNoteId: null,
    folders: [
      {
        id: 'root-folder',
        name: 'Projects',
        parentId: null,
        expanded: true,
        kind: 'folder',
      },
      {
        id: 'child-folder',
        name: 'Very long nested folder name that should still render cleanly',
        parentId: 'root-folder',
        expanded: true,
        kind: 'folder',
      },
      {
        id: 'room:secure-room',
        name: '🔒 Secure Notes',
        parentId: null,
        expanded: true,
        kind: 'shared-room',
        roomId: 'secure-room',
      },
    ],
    tasks: [],
    addNote,
    addFolder,
    updateFolder,
    deleteFolder,
    getDirectNotesInFolder,
    getNotesInFolder,
    moveNote,
  }),
}));

vi.mock('../components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('../../db', () => ({
  useDb: () => ({
    deleteVault,
    getVaultDeletionEligibility: () => vaultDeletionEligibility,
    loggedIn: false,
    syncStatus: 'local-only',
    syncStatusLabel: 'Local only',
    syncStatusDescription: 'Stored on this device',
    user: { firstName: 'Guest' },
    selectedRoom: null,
    allRooms: [],
    createSecureRoom: vi.fn(),
    lockCurrentRoom: vi.fn(),
    unlockCurrentRoom: vi.fn(),
    recoveryPhrase: null,
    dismissRecoveryPhrase: vi.fn(),
    showUnlockInput: false,
    setShowUnlockInput: vi.fn(),
    unlockPhraseInput: '',
    setUnlockPhraseInput: vi.fn(),
    showImport: false,
    setShowImport: vi.fn(),
    importKeyInput: '',
    setImportKeyInput: vi.fn(),
    exportRoomKey: vi.fn(),
    importRoomKey: vi.fn(),
    exportedKey: null,
    creatingSecure: false,
    secureRoomMessage: null,
  }),
}));

vi.mock('./ShareFolderDialog', () => ({
  ShareFolderDialog: () => null,
}));

vi.mock('../../components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: () => null,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: ReactNode }) => children,
  useDrag: (spec: unknown) => useDrag(spec),
  useDrop: (spec: unknown) => useDrop(spec),
}));

vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

describe('EnhancedSidebar', () => {
  beforeEach(() => {
    addFolder.mockClear();
    updateFolder.mockClear();
    deleteFolder.mockClear();
    addNote.mockClear();
    moveNote.mockClear();
    deleteVault.mockReset();
    deleteVault.mockResolvedValue(undefined);
    vaultDeletionEligibility = { canDelete: true, noteCount: 0 };
    useDrag.mockClear();
    useDrop.mockClear();
    mockNavigate.mockClear();
    getDirectNotesInFolder.mockClear();
    getNotesInFolder.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nested folders from parentId relationships', () => {
    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    expect(screen.getByText('Projects')).not.toBeNull();
    expect(screen.getByText(/Very long nested folder name/)).not.toBeNull();
    expect(
      screen.getByRole('button', {
        name: /(expand|collapse) very long nested folder name that should still render cleanly/i,
      })
    ).not.toBeNull();
  });

  it('creates a subfolder under the selected parent folder', () => {
    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Folder actions for Projects' })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'New subfolder' }));

    fireEvent.change(screen.getByLabelText('Folder name'), {
      target: { value: 'Client Archive' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(addFolder).toHaveBeenCalledWith('Client Archive', 'root-folder');
  });

  it('renders only direct notes inside each expanded folder branch and strips markdown from note titles', () => {
    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    const noteButton = screen.getByRole('button', {
      name: 'Open note Project Plan',
    });
    expect(noteButton).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Open note Child note' })
    ).not.toBeNull();
    expect(
      screen.getAllByRole('button', { name: 'Open note Child note' })
    ).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'Open note **Child note**' })
    ).toBeNull();
    fireEvent.click(noteButton);

    expect(mockNavigate).toHaveBeenCalledWith('/editor/note-1');
  });

  it('makes each direct note a drag source with its current folder', () => {
    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    expect(
      document.querySelector('[data-cy="ewe-note-note-drag-source-note-1"]')
    ).not.toBeNull();
    expect(useDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'note',
        item: { noteId: 'note-1', folderId: 'root-folder' },
      })
    );
  });

  it('moves a dragged note when it is dropped on another folder', () => {
    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    const childFolderDropSpec = useDrop.mock.calls
      .map(
        ([spec]) =>
          spec as {
            drop?: (item: { noteId: string; folderId: string }) => void;
          }
      )
      .find((spec) => {
        const item = { noteId: 'note-1', folderId: 'root-folder' };
        moveNote.mockClear();
        spec.drop?.(item);
        return moveNote.mock.calls.some(
          ([noteId, folderId]) =>
            noteId === item.noteId && folderId === 'child-folder'
        );
      });

    expect(childFolderDropSpec).toBeDefined();
    expect(moveNote).toHaveBeenCalledWith('note-1', 'child-folder');
  });

  it('offers mobile folder actions that can create a subfolder', () => {
    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Folder actions for Projects' })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'New subfolder' }));

    fireEvent.change(screen.getByLabelText('Folder name'), {
      target: { value: 'Mobile Archive' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(addFolder).toHaveBeenCalledWith('Mobile Archive', 'root-folder');
  });

  it('exposes folder deletion without opening the overflow menu', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete folder Projects' })
    );

    expect(confirmSpy).toHaveBeenCalledWith(
      'Delete "Projects" and move 2 notes plus keep 1 subfolder?'
    );
    expect(deleteFolder).toHaveBeenCalledWith('root-folder');
  });

  it('confirms deletion of an eligible empty vault and returns to the library', async () => {
    const onViewChange = vi.fn();
    render(
      <EnhancedSidebar
        onSearchClick={vi.fn()}
        activeView="folder:room:secure-room"
        onViewChange={onViewChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete vault 🔒 Secure Notes' })
    );

    expect(
      screen.getByRole('heading', { name: 'Delete “🔒 Secure Notes”?' })
    ).not.toBeNull();
    expect(
      screen.getByText(/Files in a mounted filesystem vault are not deleted/)
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Delete vault' }));

    await waitFor(() => {
      expect(deleteVault).toHaveBeenCalledWith('secure-room');
      expect(onViewChange).toHaveBeenCalledWith('recent');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('keeps a non-empty vault deletion visible with a specific disabled reason', () => {
    vaultDeletionEligibility = {
      canDelete: false,
      code: 'not-empty',
      reason: 'Move or delete its 2 notes first.',
      noteCount: 2,
    };
    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    expect(
      screen.queryByRole('button', { name: 'Delete vault 🔒 Secure Notes' })
    ).toBeNull();
    fireEvent.pointerDown(
      screen.getByRole('button', {
        name: 'Vault actions for 🔒 Secure Notes',
      })
    );

    const item = screen.getByRole('menuitem', {
      name: 'Delete vault. Move or delete its 2 notes first.',
    });
    expect(item.getAttribute('data-disabled')).not.toBeNull();
    expect(deleteVault).not.toHaveBeenCalled();
  });

  it('exposes a pinned notes filter in the rail', () => {
    const onViewChange = vi.fn();

    render(
      <EnhancedSidebar
        onSearchClick={vi.fn()}
        activeView="recent"
        onViewChange={onViewChange}
      />
    );

    fireEvent.click(
      document.querySelector('[data-cy="ewe-note-pinned-link"]') as HTMLElement
    );

    expect(onViewChange).toHaveBeenCalledWith('pinned');
  });

  it('limits the mobile toolbar to pinned, tasks, new note, and new folder', () => {
    render(<EnhancedSidebar onSearchClick={vi.fn()} activeView="recent" />);

    const toolbar = document.querySelector(
      '[data-cy="ewe-note-sidebar-mobile-toolbar"]'
    ) as HTMLElement | null;
    expect(toolbar).not.toBeNull();

    const labels = within(toolbar as HTMLElement)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));

    expect(labels).toEqual(['Pinned', 'Tasks', 'New note', 'New folder']);
  });

  it('creates a subfolder from the rail when a folder view is active', () => {
    render(
      <EnhancedSidebar
        onSearchClick={vi.fn()}
        activeView="folder:root-folder"
      />
    );

    fireEvent.click(
      document.querySelector(
        '[data-cy="ewe-note-new-folder-trigger"]'
      ) as HTMLElement
    );

    fireEvent.change(screen.getByLabelText('Folder name'), {
      target: { value: 'Nested From Rail' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(addFolder).toHaveBeenCalledWith('Nested From Rail', 'root-folder');
  });

  it('clears an active folder filter when clicking empty tree space', () => {
    const onViewChange = vi.fn();

    render(
      <EnhancedSidebar
        onSearchClick={vi.fn()}
        activeView="folder:root-folder"
        onViewChange={onViewChange}
      />
    );

    fireEvent.click(screen.getByTestId('sidebar-empty-space'));

    expect(onViewChange).toHaveBeenCalledWith('recent');
  });
});
