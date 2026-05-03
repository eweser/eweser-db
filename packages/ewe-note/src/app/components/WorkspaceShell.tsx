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
  BookOpen,
  FileText,
  Info,
  Library,
  Menu,
  Search,
  type LucideIcon,
} from 'lucide-react';
import {
  getWorkspaceModeFromHotkey,
  getDefaultMobilePane,
  getMobilePaneForMode,
  getModeForMobilePane,
  getWorkspacePaneState,
  readStoredWorkspaceMode,
  shouldIgnoreWorkspaceHotkeyTarget,
  WORKSPACE_MODE_STORAGE_KEY,
  WORKSPACE_MODE_LABELS,
  type WorkspaceMobilePane,
  type WorkspaceMode,
} from './workspace-layout';
import { useIsMobile } from './ui/use-mobile';

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
  const isMobile = useIsMobile();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mode, setModeState] = useState<WorkspaceMode>(readStoredWorkspaceMode);
  const [mobilePane, setMobilePane] = useState<WorkspaceMobilePane>(() =>
    getDefaultMobilePane(selectedNoteId)
  );
  const [activeView, setActiveViewState] =
    useState<WorkspaceView>(loadWorkspaceView);

  const paneState = useMemo(() => getWorkspacePaneState(mode), [mode]);

  useEffect(() => {
    if (selectedNoteId) {
      setMobilePane((current) => (current === 'metadata' ? current : 'editor'));
    }
  }, [selectedNoteId]);

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
      setMobilePane(getMobilePaneForMode(nextMode));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const setMode = (nextMode: WorkspaceMode) => {
    setModeState(nextMode);
    setMobilePane(getMobilePaneForMode(nextMode));
  };

  const setActiveView = (view: WorkspaceView) => {
    setActiveViewState(view);
    setMobilePane('notes');
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
    if (visible) {
      setMobilePane('metadata');
    } else if (mobilePane === 'metadata') {
      setMobilePane(selectedNoteId ? 'editor' : 'notes');
    }

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

  const setMobilePaneAndMode = (pane: WorkspaceMobilePane) => {
    setMobilePane(pane);
    setModeState((current) => getModeForMobilePane(pane, current));
  };

  const contextValue: WorkspaceShellContextValue = {
    mode,
    setMode,
    activeView,
    setActiveView,
    sidebarVisible: isMobile
      ? mobilePane === 'navigation'
      : paneState.sidebarVisible,
    notesVisible: isMobile ? mobilePane === 'notes' : paneState.notesVisible,
    metadataVisible: isMobile
      ? mobilePane === 'metadata'
      : paneState.metadataVisible,
    setMetadataVisible,
  };

  const sidebar = (
    <EnhancedSidebar
      onSearchClick={() => setCommandOpen(true)}
      activeView={activeView}
      onViewChange={handleViewChange}
    />
  );

  const notesList = (
    <NotesListPane
      activeView={activeView}
      onSearchClick={() => setCommandOpen(true)}
      selectedNoteId={selectedNoteId ?? null}
      mode={mode}
      onModeChange={setMode}
    />
  );

  if (isMobile) {
    return (
      <WorkspaceShellContext.Provider value={contextValue}>
        <div className="flex h-[100dvh] min-w-0 flex-col overflow-hidden bg-[oklch(0.145_0.01_95)] text-foreground">
          <MobileWorkspaceBar
            activePane={mobilePane}
            selectedNoteId={selectedNoteId ?? null}
            metadataAvailable={Boolean(metadataSlot)}
            onPaneChange={setMobilePaneAndMode}
            onSearchClick={() => setCommandOpen(true)}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            <MobilePane active={mobilePane === 'navigation'}>
              {sidebar}
            </MobilePane>
            <MobilePane active={mobilePane === 'notes'}>{notesList}</MobilePane>
            <MobilePane active={mobilePane === 'editor'}>{children}</MobilePane>
            <MobilePane active={mobilePane === 'metadata'}>
              {metadataSlot ?? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Open a note to inspect links, outline, and properties.
                </div>
              )}
            </MobilePane>
          </div>

          <EnhancedCommandPalette
            open={commandOpen}
            onOpenChange={setCommandOpen}
          />
        </div>
      </WorkspaceShellContext.Provider>
    );
  }

  return (
    <WorkspaceShellContext.Provider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-[oklch(0.145_0.01_95)] text-foreground">
        {paneState.sidebarVisible ? sidebar : null}

        {paneState.notesVisible ? notesList : null}

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

function MobilePane({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  return <div className="h-full min-w-0 overflow-hidden">{children}</div>;
}

function MobileWorkspaceBar({
  activePane,
  selectedNoteId,
  metadataAvailable,
  onPaneChange,
  onSearchClick,
}: {
  activePane: WorkspaceMobilePane;
  selectedNoteId: string | null;
  metadataAvailable: boolean;
  onPaneChange: (pane: WorkspaceMobilePane) => void;
  onSearchClick: () => void;
}) {
  const items: Array<{
    pane: WorkspaceMobilePane;
    label: string;
    icon: LucideIcon;
    disabled?: boolean;
  }> = [
    { pane: 'navigation', label: WORKSPACE_MODE_LABELS[3], icon: Menu },
    { pane: 'notes', label: WORKSPACE_MODE_LABELS[2], icon: Library },
    {
      pane: 'editor',
      label: WORKSPACE_MODE_LABELS[1],
      icon: FileText,
      disabled: !selectedNoteId,
    },
    {
      pane: 'metadata',
      label: WORKSPACE_MODE_LABELS[4],
      icon: Info,
      disabled: !metadataAvailable || !selectedNoteId,
    },
  ];

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-white/6 bg-[oklch(0.155_0.01_95)] px-2">
      <button
        type="button"
        onClick={onSearchClick}
        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
        aria-label="Search notes"
      >
        <Search className="h-4 w-4" />
      </button>
      <nav className="grid min-w-0 flex-1 grid-cols-4 gap-1">
        {items.map(({ pane, label, icon: Icon, disabled }) => (
          <button
            key={pane}
            type="button"
            disabled={disabled}
            onClick={() => onPaneChange(pane)}
            className={`flex h-10 min-w-0 items-center justify-center gap-1 rounded-full px-2 text-xs transition-colors ${
              activePane === pane
                ? 'bg-white/12 text-foreground'
                : 'text-muted-foreground hover:bg-white/6 hover:text-foreground'
            } disabled:cursor-not-allowed disabled:opacity-35`}
            aria-label={`${label} pane`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => onPaneChange('notes')}
        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
        aria-label="Open note list"
      >
        <BookOpen className="h-4 w-4" />
      </button>
    </header>
  );
}

export function useWorkspaceShell() {
  const context = useContext(WorkspaceShellContext);
  if (!context) {
    throw new Error('useWorkspaceShell must be used inside WorkspaceShell');
  }
  return context;
}
