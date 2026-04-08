import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LAYOUT_CHROME,
  getLayoutHotkeyAction,
  getNextLayoutChromeState,
} from './layout-shortcuts';

describe('layout shortcuts', () => {
  it('maps mod+backslash to sidebar toggle', () => {
    expect(
      getLayoutHotkeyAction(
        {
          altKey: false,
          code: 'Backslash',
          ctrlKey: true,
          key: '\\',
          metaKey: false,
          shiftKey: false,
        },
        false
      )
    ).toBe('toggle-sidebar');
  });

  it('maps mod+shift+backslash to topbar toggle', () => {
    expect(
      getLayoutHotkeyAction(
        {
          altKey: false,
          code: 'Backslash',
          ctrlKey: true,
          key: '|',
          metaKey: false,
          shiftKey: true,
        },
        false
      )
    ).toBe('toggle-topbar');
  });

  it('maps mod+shift+f to pure focus toggle', () => {
    expect(
      getLayoutHotkeyAction(
        {
          altKey: false,
          code: 'KeyF',
          ctrlKey: true,
          key: 'F',
          metaKey: false,
          shiftKey: true,
        },
        false
      )
    ).toBe('toggle-pure-focus');
  });

  it('only maps escape while already in pure focus', () => {
    const event = {
      altKey: false,
      code: 'Escape',
      ctrlKey: false,
      key: 'Escape',
      metaKey: false,
      shiftKey: false,
    } as const;

    expect(getLayoutHotkeyAction(event, false)).toBeNull();
    expect(getLayoutHotkeyAction(event, true)).toBe('exit-pure-focus');
  });

  it('restores the previous chrome state when pure focus is toggled off', () => {
    const focused = getNextLayoutChromeState({
      action: 'toggle-pure-focus',
      current: { sidebarVisible: true, topbarVisible: false },
      lastNonFocus: DEFAULT_LAYOUT_CHROME,
    });

    expect(focused.current).toEqual({
      sidebarVisible: false,
      topbarVisible: false,
    });
    expect(focused.lastNonFocus).toEqual({
      sidebarVisible: true,
      topbarVisible: false,
    });

    expect(
      getNextLayoutChromeState({
        action: 'toggle-pure-focus',
        current: focused.current,
        lastNonFocus: focused.lastNonFocus,
      }).current
    ).toEqual({ sidebarVisible: true, topbarVisible: false });
  });
});