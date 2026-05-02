import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { EnhancedSidebar } from './EnhancedSidebar';
import { EnhancedCommandPalette } from './EnhancedCommandPalette';
import { NotesListPane } from './NotesListPane';
import {
  getWorkspaceModeFromHotkey,
  getWorkspacePaneState,
  readStoredWorkspaceMode,
  shouldIgnoreWorkspaceHotkeyTarget,
  WORKSPACE_MODE_STORAGE_KEY,
  type WorkspaceMode,
} from './workspace-layout';

type WorkspaceView = 'all' | 'recent' | 'pinned' | 'tasks' | `folder:${string}`;

type WorkspaceShellContextValue = {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  activeView: WorkspaceView;
  setActiveView: (view: WorkspaceView) => void;
  sidebarVisible: boolean;
  notesVisible: boolean;
  metadataVisible: boolean;
  setMetadataVisible: (visible: boolean) => void;
};

const WORKSPACE_VIEW_STORAGE_KEY = 'ewe-note-workspace-view';

const WorkspaceShellContext = createContext<WorkspaceShellContextValue | null>(
  null
);

function loadWorkspaceView(): WorkspaceView {
  try {
    const raw = localStorage.getItem(WORKSPACE_VIEW_STORAGE_KEY);
    if (
      raw === 'all' ||
      raw === 'recent' ||
      raw === 'pinned' ||
      raw === 'tasks' ||
      raw?.startsWith('folder:')
    ) {
      return raw as WorkspaceView;
    }
  } catch {
    // ignore
  }
  return 'all';
}

export function WorkspaceShell({
  selectedNoteId,
  metadataSlot,
  children,
}: {
  selectedNoteId?: string | null;
  metadataSlot?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mode, setModeState] = useState<WorkspaceMode>(readStoredWorkspaceMode);
  const [activeView, setActiveViewState] =
    useState<WorkspaceView>(loadWorkspaceView);

  const paneState = useMemo(() => getWorkspacePaneState(mode), [mode]);

  useEffect(() => {
    localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, String(mode));
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, activeView);
  }, [activeView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreWorkspaceHotkeyTarget(event.target)) return;

      const nextMode = getWorkspaceModeFromHotkey(event);
      if (!nextMode) return;
      event.preventDefault();
      setModeState(nextMode);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const setMode = (nextMode: WorkspaceMode) => {
    setModeState(nextMode);
  };

  const setActiveView = (view: WorkspaceView) => {
    setActiveViewState(view);
    if (view === 'all') {
      navigate('/');
    }
  };

  const handleViewChange = (view: string) => {
    if (
      view === 'all' ||
      view === 'recent' ||
      view === 'pinned' ||
      view === 'tasks' ||
      view.startsWith('folder:')
    ) {
      setActiveView(view as WorkspaceView);
    }
  };

  const setMetadataVisible = (visible: boolean) => {
    setModeState((current) => {
      if (visible) {
        return 4;
      }
      if (current === 4) {
        return 3;
      }
      return current;
    });
  };

  const contextValue: WorkspaceShellContextValue = {
    mode,
    setMode,
    activeView,
    setActiveView,
    sidebarVisible: paneState.sidebarVisible,
    notesVisible: paneState.notesVisible,
    metadataVisible: paneState.metadataVisible,
    setMetadataVisible,
  };

  return (
    <WorkspaceShellContext.Provider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-[oklch(0.145_0.01_95)] text-foreground">
        {paneState.sidebarVisible ? (
          <EnhancedSidebar
            onSearchClick={() => setCommandOpen(true)}
            activeView={activeView}
            onViewChange={handleViewChange}
          />
        ) : null}

        {paneState.notesVisible ? (
          <NotesListPane
            activeView={activeView}
            onSearchClick={() => setCommandOpen(true)}
            selectedNoteId={selectedNoteId ?? null}
            mode={mode}
            onModeChange={setMode}
          />
        ) : null}

        <div className="min-w-0 flex-1">{children}</div>

        {paneState.metadataVisible ? (metadataSlot ?? null) : null}

        <EnhancedCommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </div>
    </WorkspaceShellContext.Provider>
  );
}

export function useWorkspaceShell() {
  const context = useContext(WorkspaceShellContext);
  if (!context) {
    throw new Error('useWorkspaceShell must be used inside WorkspaceShell');
  }
  return context;
}
