import { describe, expect, it } from 'vitest';
import { EDITOR_COMMANDS, getCommandsByGroup } from './commands';

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
});
