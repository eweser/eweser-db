import { describe, expect, it } from 'vitest';
import {
  EDITOR_COMMANDS,
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
});
