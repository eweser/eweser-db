import { describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/core';
import {
  EDITOR_COMMANDS,
  getCommandById,
  getCommandsByGroup,
  getCommandsForPlacement,
} from './commands';

describe('editor command registry', () => {
  it('contains paragraph commands', () => {
    const paragraph = getCommandsByGroup('paragraph');

    expect(paragraph.length).toBeGreaterThan(0);
    expect(paragraph.map((c) => c.id)).toContain('heading-1');
  });

  it('keeps command IDs unique', () => {
    const ids = EDITOR_COMMANDS.map((command) => command.id);
    const unique = Array.from(new Set(ids));
    expect(unique).toHaveLength(ids.length);
  });

  it('marks command groups intentionally', () => {
    const listCommands = getCommandsByGroup('list');
    expect(listCommands.length).toBeGreaterThanOrEqual(3);
  });

  it('declares menu placements for every command surface', () => {
    expect(
      EDITOR_COMMANDS.every((command) => command.menuPlacement.length > 0)
    ).toBe(true);
    expect(
      getCommandsForPlacement('palette').map((command) => command.id)
    ).toContain('source-mode');
    expect(
      getCommandsForPlacement('context').map((command) => command.id)
    ).toContain('insert-table');
  });

  it('sources slash commands from the same registry', () => {
    const slashCommands = getCommandsForPlacement('slash');
    expect(slashCommands.map((command) => command.id)).toEqual(
      expect.arrayContaining(['heading-2', 'task-list', 'insert-callout'])
    );
  });

  it('creates an editable table node instead of inserting table markdown text', () => {
    const calls: string[] = [];
    const chain = {
      focus: () => {
        calls.push('focus');
        return chain;
      },
      insertTable: (options: {
        rows: number;
        cols: number;
        withHeaderRow: boolean;
      }) => {
        calls.push(JSON.stringify(options));
        return chain;
      },
      run: () => {
        calls.push('run');
        return true;
      },
    };
    const editor = {
      chain: () => chain,
    } as unknown as Editor;

    getCommandById('insert-table')?.execute(editor);

    expect(calls).toEqual([
      'focus',
      JSON.stringify({ rows: 3, cols: 2, withHeaderRow: true }),
      'run',
    ]);
  });

  it('routes link commands through the editor context when available', () => {
    const requestLink = vi.fn();
    const editor = {
      getAttributes: () => ({ href: 'wiki://Existing Note' }),
    } as unknown as Editor;

    getCommandById('link')?.execute(editor, { requestLink });
    getCommandById('external-link')?.execute(editor, { requestLink });

    expect(requestLink).toHaveBeenNthCalledWith(1, {
      kind: 'link',
      href: 'wiki://Existing Note',
    });
    expect(requestLink).toHaveBeenNthCalledWith(2, {
      kind: 'external-link',
      href: 'wiki://Existing Note',
    });
  });
});
