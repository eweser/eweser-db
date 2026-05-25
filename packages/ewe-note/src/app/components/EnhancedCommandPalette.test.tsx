// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnhancedCommandPalette } from './EnhancedCommandPalette';

const mockNavigate = vi.fn();
const mockUseNotes = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/NotesContext', () => ({
  useNotes: () => mockUseNotes(),
}));

vi.mock('./TemplatesDialog', () => ({
  TemplatesDialog: ({
    open,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div>Templates Dialog</div> : null),
}));

vi.mock('@/editor/commands', () => ({
  getCommandsForPlacement: () => [],
}));

function PaletteHarness() {
  const [open, setOpen] = useState(true);
  return <EnhancedCommandPalette open={open} onOpenChange={setOpen} />;
}

describe('EnhancedCommandPalette', () => {
  const importedNote = {
    id: 'note-source',
    title: 'Overview',
    folder: '',
    tags: [],
    sourcePath: 'Areas/Overview.md',
    sourceBreadcrumb: ['Areas', 'Overview.md'],
  };

  beforeEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView = vi.fn();

    mockNavigate.mockClear();
    mockUseNotes.mockReturnValue({
      folders: [],
      addNote: vi.fn(() => ({ id: 'note-created' })),
      searchNotes: vi.fn(() => []),
      getRecentNotes: vi.fn(() => [
        {
          id: 'note-1',
          title: 'Untitled',
          folder: '',
          tags: [],
        },
        {
          id: 'note-2',
          title: 'Untitled',
          folder: '',
          tags: [],
        },
      ]),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the templates dialog open after the palette closes', () => {
    const { container } = render(<PaletteHarness />);

    fireEvent.click(screen.getByText('Browse Templates'));

    expect(
      container.querySelector('[data-cy="ewe-note-command-palette"]')
    ).toBeNull();
    expect(screen.getByText('Templates Dialog')).not.toBeNull();
  });

  it('assigns distinct command values to duplicate untitled recent notes', () => {
    const { container } = render(
      <EnhancedCommandPalette open onOpenChange={vi.fn()} />
    );

    const untitledItems = Array.from(
      container.querySelectorAll('[cmdk-item]')
    ).filter((item) => item.textContent?.includes('Untitled'));

    expect(untitledItems).toHaveLength(2);

    const values = untitledItems.map((item) => item.getAttribute('data-value'));
    expect(new Set(values).size).toBe(2);
    expect(values).toContain('recent-note:note-1:Untitled');
    expect(values).toContain('recent-note:note-2:Untitled');
  });

  it('shows source paths for imported notes in search results', () => {
    mockUseNotes.mockReturnValue({
      folders: [],
      addNote: vi.fn(() => ({ id: 'note-created' })),
      searchNotes: vi.fn(() => [importedNote]),
      getRecentNotes: vi.fn(() => []),
    });

    const { container } = render(
      <EnhancedCommandPalette open onOpenChange={vi.fn()} />
    );

    fireEvent.change(
      container.querySelector(
        '[data-cy="ewe-note-command-input"]'
      ) as HTMLInputElement,
      { target: { value: 'Areas/Overview' } }
    );

    expect(screen.getByText('Areas/Overview.md')).not.toBeNull();
  });
});
