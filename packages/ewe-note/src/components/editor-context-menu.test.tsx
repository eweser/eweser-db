// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditorContextMenu } from './editor-context-menu';

function createEditor(isEnabled: () => boolean) {
  return {
    isEnabled,
    commands: { undo: vi.fn(), redo: vi.fn() },
  } as unknown as Editor;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EditorContextMenu', () => {
  it('does not evaluate command state until the menu is opened', () => {
    // The editor re-renders on every ProseMirror transaction. Building the
    // menu body there cost more than the keystroke itself.
    const isEnabled = vi.fn(() => true);
    const editor = createEditor(isEnabled);

    const view = render(
      <EditorContextMenu editor={editor}>
        <div data-testid="editor-surface">editor</div>
      </EditorContextMenu>
    );

    expect(screen.getByTestId('editor-surface')).toBeTruthy();
    expect(isEnabled).not.toHaveBeenCalled();

    view.rerender(
      <EditorContextMenu editor={editor}>
        <div data-testid="editor-surface">editor</div>
      </EditorContextMenu>
    );
    expect(isEnabled).not.toHaveBeenCalled();
  });

  it('builds the full command menu once opened', async () => {
    const editor = createEditor(() => true);

    render(
      <EditorContextMenu editor={editor}>
        <div data-testid="editor-surface">editor</div>
      </EditorContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('editor-surface'));

    expect(await screen.findByText('Format')).toBeTruthy();
    for (const groupLabel of ['Paragraph', 'Lists', 'Insert', 'View']) {
      expect(screen.getAllByText(groupLabel).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('Undo')).toBeTruthy();
    expect(screen.getByText('Redo')).toBeTruthy();
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(10);
  });
});
