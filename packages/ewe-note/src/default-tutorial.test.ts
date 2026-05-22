import { describe, expect, it } from 'vitest';
import { EDITOR_COMMANDS } from './editor/commands';
import {
  DEFAULT_NOTE_AFTER_TUTORIAL_DISMISS_TEXT,
  DEFAULT_TUTORIAL_DISMISS_LABEL,
  DEFAULT_TUTORIAL_DISMISS_STORAGE_KEY,
  DEFAULT_TUTORIAL_NOTE_TEXT,
  getDefaultNoteText,
  hasDismissedDefaultTutorial,
  isDefaultTutorialDismissalChecked,
  markDefaultTutorialDismissed,
} from './default-tutorial';

function createStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('default tutorial note', () => {
  it('starts with a dismissible tutorial checkbox', () => {
    expect(DEFAULT_TUTORIAL_NOTE_TEXT).toContain('# EweNote Tutorial');
    expect(DEFAULT_TUTORIAL_NOTE_TEXT).toContain(
      `- [ ] ${DEFAULT_TUTORIAL_DISMISS_LABEL}`
    );
  });

  it('covers every registered editor command label and shortcut', () => {
    for (const command of EDITOR_COMMANDS) {
      expect(DEFAULT_TUTORIAL_NOTE_TEXT).toContain(command.label);
      if (command.shortcut) {
        expect(DEFAULT_TUTORIAL_NOTE_TEXT).toContain(command.shortcut);
      }
    }
  });

  it('detects only the checked tutorial dismissal task', () => {
    expect(
      isDefaultTutorialDismissalChecked(
        `- [ ] ${DEFAULT_TUTORIAL_DISMISS_LABEL}`
      )
    ).toBe(false);
    expect(
      isDefaultTutorialDismissalChecked(
        `- [x] ${DEFAULT_TUTORIAL_DISMISS_LABEL}`
      )
    ).toBe(true);
  });

  it('returns a blank default note after tutorial dismissal', () => {
    const storage = createStorage();

    expect(hasDismissedDefaultTutorial(storage)).toBe(false);
    expect(getDefaultNoteText(storage)).toBe(DEFAULT_TUTORIAL_NOTE_TEXT);

    markDefaultTutorialDismissed(storage);

    expect(storage.getItem(DEFAULT_TUTORIAL_DISMISS_STORAGE_KEY)).toBe('true');
    expect(hasDismissedDefaultTutorial(storage)).toBe(true);
    expect(getDefaultNoteText(storage)).toBe(
      DEFAULT_NOTE_AFTER_TUTORIAL_DISMISS_TEXT
    );
  });
});
