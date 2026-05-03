// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKSPACE_MODE,
  getDefaultMobilePane,
  getMobilePaneForMode,
  getModeForMobilePane,
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

  it('ignores shortcuts inside editable targets', () => {
    const input = document.createElement('input');
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');

    expect(shouldIgnoreWorkspaceHotkeyTarget(input)).toBe(true);
    expect(shouldIgnoreWorkspaceHotkeyTarget(editor)).toBe(true);
    expect(shouldIgnoreWorkspaceHotkeyTarget(document.body)).toBe(false);
  });
});
