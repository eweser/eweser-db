import { useEffect, useState } from 'react';

export type WorkspaceMode = 1 | 2 | 3 | 4;

export type WorkspaceHotkeyEvent = Pick<
  KeyboardEvent,
  'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'
>;

export type WorkspacePaneState = {
  sidebarVisible: boolean;
  notesVisible: boolean;
  metadataVisible: boolean;
};

export type WorkspacePaneVisibility = {
  sidebarVisible: boolean;
  notesListVisible: boolean;
  metadataVisible: boolean;
};

export const WORKSPACE_MODE_STORAGE_KEY = 'ewe-note-workspace-mode';
export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = 3;

export const WORKSPACE_SHORTCUT_LABELS: Record<WorkspaceMode, string> = {
  1: 'Ctrl/Cmd+1',
  2: 'Ctrl/Cmd+2',
  3: 'Ctrl/Cmd+3',
  4: 'Ctrl/Cmd+4',
};

export const WORKSPACE_MODE_LABELS: Record<WorkspaceMode, string> = {
  1: 'Editor',
  2: 'List + Editor',
  3: 'Sidebar + List + Editor',
  4: 'Full Workspace',
};

export function clampWorkspaceMode(value: number): WorkspaceMode {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 4;
}

export function parseWorkspaceMode(value: string | null | undefined) {
  if (!value) return DEFAULT_WORKSPACE_MODE;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return DEFAULT_WORKSPACE_MODE;
  return clampWorkspaceMode(parsed);
}

export function getWorkspaceModeFromHotkey(
  event: WorkspaceHotkeyEvent
): WorkspaceMode | null {
  const hasMod = event.metaKey || event.ctrlKey;
  if (!hasMod || event.altKey || event.shiftKey) {
    return null;
  }

  switch (event.code) {
    case 'Digit1':
      return 1;
    case 'Digit2':
      return 2;
    case 'Digit3':
      return 3;
    case 'Digit4':
      return 4;
    default:
      break;
  }

  if (event.key === '1') return 1;
  if (event.key === '2') return 2;
  if (event.key === '3') return 3;
  if (event.key === '4') return 4;

  return null;
}

export function getWorkspacePaneState(mode: WorkspaceMode): WorkspacePaneState {
  switch (mode) {
    case 1:
      return {
        sidebarVisible: false,
        notesVisible: false,
        metadataVisible: false,
      };
    case 2:
      return {
        sidebarVisible: false,
        notesVisible: true,
        metadataVisible: false,
      };
    case 3:
      return {
        sidebarVisible: true,
        notesVisible: true,
        metadataVisible: false,
      };
    case 4:
      return {
        sidebarVisible: true,
        notesVisible: true,
        metadataVisible: true,
      };
  }
}

export function getWorkspacePaneVisibility(
  mode: WorkspaceMode
): WorkspacePaneVisibility {
  return {
    sidebarVisible: mode >= 3,
    notesListVisible: mode >= 2,
    metadataVisible: mode >= 4,
  };
}

export function getWorkspaceModeHotkey(
  event: WorkspaceHotkeyEvent
): WorkspaceMode | null {
  return getWorkspaceModeFromHotkey(event);
}

export function shouldIgnoreWorkspaceHotkeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;
  if (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  ) {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"], [role="textbox"]'));
}

export function readStoredWorkspaceMode() {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_MODE;
  return parseWorkspaceMode(
    window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)
  );
}

export function useWorkspaceMode() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(
    readStoredWorkspaceMode
  );

  useEffect(() => {
    window.localStorage.setItem(
      WORKSPACE_MODE_STORAGE_KEY,
      String(workspaceMode)
    );
  }, [workspaceMode]);

  return {
    workspaceMode,
    setWorkspaceMode,
    paneVisibility: getWorkspacePaneVisibility(workspaceMode),
  };
}
