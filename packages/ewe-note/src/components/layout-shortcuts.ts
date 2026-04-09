export type LayoutChromeSnapshot = {
  sidebarVisible: boolean;
  topbarVisible: boolean;
};

export type LayoutHotkeyAction =
  | 'toggle-sidebar'
  | 'toggle-topbar'
  | 'toggle-pure-focus'
  | 'exit-pure-focus'
  | null;

export type LayoutHotkeyEvent = Pick<
  KeyboardEvent,
  'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'
>;

export const DEFAULT_LAYOUT_CHROME: LayoutChromeSnapshot = {
  sidebarVisible: true,
  topbarVisible: true,
};

export const LAYOUT_SHORTCUT_LABELS = {
  sidebar: 'Ctrl+\\ / Cmd+\\',
  topbar: 'Ctrl+Shift+\\ / Cmd+Shift+\\',
  pureFocus: 'Ctrl+Shift+F / Cmd+Shift+F',
  exitFocus: 'Escape',
} as const;

export function isPureFocusLayout({
  sidebarVisible,
  topbarVisible,
}: LayoutChromeSnapshot) {
  return !sidebarVisible && !topbarVisible;
}

export function getLayoutHotkeyAction(
  event: LayoutHotkeyEvent,
  isPureFocus: boolean
): LayoutHotkeyAction {
  const hasMod = event.metaKey || event.ctrlKey;

  if ((event.key === 'Escape' || event.code === 'Escape') && isPureFocus) {
    return 'exit-pure-focus';
  }

  if (!hasMod || event.altKey) {
    return null;
  }

  if (event.code === 'Backslash') {
    return event.shiftKey ? 'toggle-topbar' : 'toggle-sidebar';
  }

  if (event.code === 'KeyF' && event.shiftKey) {
    return 'toggle-pure-focus';
  }

  return null;
}

export function getNextLayoutChromeState({
  action,
  current,
  lastNonFocus = DEFAULT_LAYOUT_CHROME,
}: {
  action: Exclude<LayoutHotkeyAction, null>;
  current: LayoutChromeSnapshot;
  lastNonFocus?: LayoutChromeSnapshot;
}) {
  const isPureFocus = isPureFocusLayout(current);

  if (action === 'toggle-pure-focus') {
    if (isPureFocus) {
      return {
        current: lastNonFocus,
        lastNonFocus,
      };
    }

    return {
      current: { sidebarVisible: false, topbarVisible: false },
      lastNonFocus: current,
    };
  }

  if (action === 'exit-pure-focus') {
    return {
      current: isPureFocus ? lastNonFocus : current,
      lastNonFocus,
    };
  }

  const nextCurrent =
    action === 'toggle-sidebar'
      ? { ...current, sidebarVisible: !current.sidebarVisible }
      : { ...current, topbarVisible: !current.topbarVisible };

  return {
    current: nextCurrent,
    lastNonFocus: isPureFocusLayout(nextCurrent) ? lastNonFocus : nextCurrent,
  };
}
