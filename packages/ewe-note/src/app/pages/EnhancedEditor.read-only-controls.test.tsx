// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditorWorkspace } from './EnhancedEditor';

vi.mock('@/db', () => ({
  useDb: () => ({ selectedRoom: null }),
}));

vi.mock('../contexts/NotesContext', () => ({
  useNotes: () => ({}),
}));

vi.mock('../components/WorkspaceShell', () => ({
  WorkspaceShell: ({ children }: { children: React.ReactNode }) => children,
  useWorkspaceShell: () => ({
    metadataVisible: false,
    setMetadataVisible: vi.fn(),
  }),
}));

vi.mock('../components/ui/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/components/editor', () => ({
  default: () => <div>Editor</div>,
}));

const note = {
  id: 'note-reader',
  roomId: 'room-reader',
  title: 'Reader note',
  content: '# Reader note',
  folder: 'room:room-reader',
  tags: [],
  properties: {},
  aliases: [],
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
  pinned: false,
  links: [],
  outgoingLinks: [],
  backlinks: [],
  unlinkedMentions: [],
};

const callbacks = {
  onUpdateTitle: vi.fn(),
  onCopyLink: vi.fn(),
  copyLinkState: 'idle' as const,
  onDuplicate: vi.fn(),
  onExport: vi.fn(),
  onDelete: vi.fn(),
  folders: [],
  onMoveNote: vi.fn(),
  onTogglePin: vi.fn(),
  onFocusMode: vi.fn(),
  editorRoom: null,
  onNavigateWikiLink: vi.fn(),
  sourceMode: false,
  onSourceModeChange: vi.fn(),
};

describe('EditorWorkspace read-only controls', () => {
  afterEach(cleanup);

  it('hides mutation controls while keeping read-only actions available', () => {
    render(<EditorWorkspace {...callbacks} note={note} readOnly />);

    expect(screen.queryByRole('button', { name: 'Pin note' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete note' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Enter focus mode' })
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Open note info' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Open note actions' })
    ).not.toBeNull();
  });

  it('keeps mutation controls for a writable note', () => {
    render(<EditorWorkspace {...callbacks} note={note} readOnly={false} />);

    expect(screen.getByRole('button', { name: 'Pin note' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Delete note' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Enter focus mode' })
    ).not.toBeNull();
  });
});
