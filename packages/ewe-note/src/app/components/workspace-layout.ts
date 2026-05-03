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

export type WorkspaceMobilePane =
  | 'navigation'
  | 'notes'
  | 'editor'
  | 'metadata';

export const WORKSPACE_MODE_STORAGE_KEY = 'ewe-note-workspace-mode';
export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = 3;

export const WORKSPACE_SHORTCUT_LABELS: Record<WorkspaceMode, string> = {
  1: 'Ctrl/Cmd+1',
  2: 'Ctrl/Cmd+2',
  3: 'Ctrl/Cmd+3',
  4: 'Ctrl/Cmd+4',
};

export const WORKSPACE_MODE_LABELS: Record<WorkspaceMode, string> = {
  1: 'Write',
  2: 'Browse',
  3: 'Organize',
  4: 'Inspect',
};

export const WORKSPACE_MODE_DESCRIPTIONS: Record<WorkspaceMode, string> = {
  1: 'Editor only',
  2: 'Notes and editor',
  3: 'Folders, notes, and editor',
  4: 'Open note info',
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

export function getDefaultMobilePane(
  selectedNoteId?: string | null
): WorkspaceMobilePane {
  return selectedNoteId ? 'editor' : 'notes';
}

export function getMobilePaneForMode(mode: WorkspaceMode): WorkspaceMobilePane {
  if (mode === 4) return 'metadata';
  if (mode === 3) return 'navigation';
  if (mode === 2) return 'notes';
  return 'editor';
}

export function getModeForMobilePane(
  pane: WorkspaceMobilePane,
  currentMode: WorkspaceMode
): WorkspaceMode {
  if (pane === 'metadata') return 4;
  if (pane === 'navigation') return 3;
  if (pane === 'notes') return 2;
  if (currentMode === 4) return 1;
  return currentMode;
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
