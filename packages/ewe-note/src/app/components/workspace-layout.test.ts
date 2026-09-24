// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKSPACE_MODE,
  getFocusModeHotkeyAction,
  type WorkspaceHotkeyEvent,
  getDefaultMobilePane,
  getMobilePaneForMode,
  getModeForMobilePane,
  resolveWorkspaceModeHotkeySelection,
  WORKSPACE_MODE_STORAGE_KEY,
  clampWorkspaceMode,
  getWorkspaceModeHotkey,
  getWorkspacePaneVisibility,
  parseWorkspaceMode,
  readStoredWorkspaceMode,
  shouldIgnoreWorkspaceHotkeyTarget,
} from './workspace-layout';

describe('workspace layout', () => {
  it('maps mod+1..4 to workspace modes', () => {
    expect(
      getWorkspaceModeHotkey({
        altKey: false,
        code: 'Digit1',
        ctrlKey: true,
        key: '1',
        metaKey: false,
        shiftKey: false,
      })
    ).toBe(1);

    expect(
      getWorkspaceModeHotkey({
        altKey: false,
        code: 'Digit4',
        ctrlKey: false,
        key: '4',
        metaKey: true,
        shiftKey: false,
      })
    ).toBe(4);
  });

  it('ignores unrelated or conflicting modifiers', () => {
    expect(
      getWorkspaceModeHotkey({
        altKey: true,
        code: 'Digit2',
        ctrlKey: true,
        key: '2',
        metaKey: false,
        shiftKey: false,
      })
    ).toBeNull();

    expect(
      getWorkspaceModeHotkey({
        altKey: false,
        code: 'Digit3',
        ctrlKey: false,
        key: '3',
        metaKey: false,
        shiftKey: false,
      })
    ).toBeNull();
  });

  it('parses invalid storage state back to the default mode', () => {
    expect(parseWorkspaceMode('nope')).toBe(DEFAULT_WORKSPACE_MODE);
    expect(parseWorkspaceMode(null)).toBe(DEFAULT_WORKSPACE_MODE);
  });

  it('clamps stored and parsed modes to the supported range', () => {
    expect(clampWorkspaceMode(0)).toBe(1);
    expect(clampWorkspaceMode(2)).toBe(2);
    expect(clampWorkspaceMode(3)).toBe(3);
    expect(clampWorkspaceMode(9)).toBe(4);

    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, '9');
    expect(readStoredWorkspaceMode()).toBe(4);
    expect(parseWorkspaceMode('0')).toBe(1);
  });

  it('returns the expected pane visibility contract for each mode', () => {
    expect(getWorkspacePaneVisibility(1)).toEqual({
      sidebarVisible: false,
      notesListVisible: false,
      metadataVisible: false,
    });

    expect(getWorkspacePaneVisibility(4)).toEqual({
      sidebarVisible: true,
      notesListVisible: true,
      metadataVisible: true,
    });
  });

  it('maps mobile panes to reachable workspace states', () => {
    expect(getDefaultMobilePane(null)).toBe('notes');
    expect(getDefaultMobilePane('note-1')).toBe('editor');
    expect(getMobilePaneForMode(1)).toBe('editor');
    expect(getMobilePaneForMode(2)).toBe('notes');
    expect(getMobilePaneForMode(3)).toBe('navigation');
    expect(getMobilePaneForMode(4)).toBe('metadata');
    expect(getModeForMobilePane('metadata', 1)).toBe(4);
    expect(getModeForMobilePane('navigation', 1)).toBe(3);
    expect(getModeForMobilePane('notes', 1)).toBe(2);
    expect(getModeForMobilePane('editor', 4)).toBe(1);
    expect(getModeForMobilePane('editor', 2)).toBe(2);
  });

  it('restores panes 1-3 when mod+1 is pressed again from mode 1', () => {
    expect(resolveWorkspaceModeHotkeySelection(1, 1)).toBe(3);
    expect(resolveWorkspaceModeHotkeySelection(4, 1)).toBe(1);
    expect(resolveWorkspaceModeHotkeySelection(1, 2)).toBe(2);
  });

  it('still allows pane shortcuts inside the TipTap editing surface', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');

    expect(shouldIgnoreWorkspaceHotkeyTarget(editor)).toBe(false);
  });

  it('ignores shortcuts inside explicit form controls', () => {
    const input = document.createElement('input');
    const select = document.createElement('select');
    const ignored = document.createElement('div');
    ignored.setAttribute('data-workspace-hotkeys', 'ignore');

    expect(shouldIgnoreWorkspaceHotkeyTarget(input)).toBe(true);
    expect(shouldIgnoreWorkspaceHotkeyTarget(select)).toBe(true);
    expect(shouldIgnoreWorkspaceHotkeyTarget(ignored)).toBe(true);
    expect(shouldIgnoreWorkspaceHotkeyTarget(document.body)).toBe(false);
  });
});

describe('getFocusModeHotkeyAction', () => {
  const key = (
    code: string,
    extra: Partial<WorkspaceHotkeyEvent> = {}
  ): WorkspaceHotkeyEvent => ({
    altKey: false,
    code,
    ctrlKey: true,
    key: code.replace('Digit', ''),
    metaKey: false,
    shiftKey: false,
    ...extra,
  });

  it('toggles focus mode with Ctrl+1 in both directions', () => {
    expect(
      getFocusModeHotkeyAction(key('Digit1'), { focusMode: false })
    ).toEqual({ type: 'toggle-focus' });
    expect(
      getFocusModeHotkeyAction(key('Digit1'), { focusMode: true })
    ).toEqual({ type: 'toggle-focus' });
  });

  it('restores the requested workspace mode from focus mode', () => {
    expect(
      getFocusModeHotkeyAction(key('Digit2'), { focusMode: true })
    ).toEqual({ type: 'restore-mode', mode: 2 });
    expect(
      getFocusModeHotkeyAction(key('Digit3'), { focusMode: true })
    ).toEqual({ type: 'restore-mode', mode: 3 });
    expect(
      getFocusModeHotkeyAction(key('Digit4'), { focusMode: true })
    ).toEqual({ type: 'restore-mode', mode: 4 });
  });

  it('leaves modes 2-4 to the workspace shell when focus mode is closed', () => {
    expect(
      getFocusModeHotkeyAction(key('Digit3'), { focusMode: false })
    ).toBeNull();
  });

  it('exits focus mode on Escape only when no overlay is open', () => {
    const escape = key('Escape', { ctrlKey: false, key: 'Escape' });
    expect(getFocusModeHotkeyAction(escape, { focusMode: true })).toEqual({
      type: 'exit-focus',
    });
    expect(
      getFocusModeHotkeyAction(escape, { focusMode: true, hasOverlay: true })
    ).toBeNull();
    expect(getFocusModeHotkeyAction(escape, { focusMode: false })).toBeNull();
  });
});
