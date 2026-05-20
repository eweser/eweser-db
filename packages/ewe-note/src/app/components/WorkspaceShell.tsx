import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { EnhancedSidebar } from './EnhancedSidebar';
import { EnhancedCommandPalette } from './EnhancedCommandPalette';
import { NotesListPane } from './NotesListPane';
import {
  FileText,
  Library,
  Menu,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import {
  getWorkspaceModeFromHotkey,
  getDefaultMobilePane,
  getMobilePaneForMode,
  getModeForMobilePane,
  getWorkspacePaneState,
  readStoredWorkspaceMode,
  resolveWorkspaceModeHotkeySelection,
  shouldIgnoreWorkspaceHotkeyTarget,
  WORKSPACE_MODE_STORAGE_KEY,
  WORKSPACE_MODE_ARIA_LABELS,
  type WorkspaceMobilePane,
  type WorkspaceMode,
} from './workspace-layout';
import { readWorkspaceInteractionPreferences } from './workspace-interaction-settings';
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
const SIDEBAR_WIDTH_STORAGE_KEY = 'ewe-note-sidebar-width';
const NOTES_WIDTH_STORAGE_KEY = 'ewe-note-notes-width';
const METADATA_WIDTH_STORAGE_KEY = 'ewe-note-metadata-width';
const HORIZONTAL_GESTURE_THRESHOLD = 72;
const VERTICAL_GESTURE_THRESHOLD = 84;
const DESKTOP_GESTURE_MODE_MIN = 1;

const DESKTOP_PANE_WIDTHS = {
  sidebar: { min: 220, max: 420, default: 280 },
  notes: { min: 260, max: 460, default: 320 },
  metadata: { min: 260, max: 420, default: 320 },
} as const;

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
  return 'recent';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredPaneWidth(
  storageKey: string,
  fallback: number,
  min: number,
  max: number
) {
  try {
    const raw = Number(localStorage.getItem(storageKey));
    if (Number.isFinite(raw)) {
      return clamp(raw, min, max);
    }
  } catch {
    // ignore
  }

  return fallback;
}

function shouldIgnoreWorkspaceGestureTarget(
  target: EventTarget | null,
  options?: { allowContentEditable?: boolean }
) {
  if (!(target instanceof HTMLElement)) return false;

  const editableSelector = options?.allowContentEditable
    ? 'input, textarea, select, [data-workspace-gesture="ignore"]'
    : 'input, textarea, select, [contenteditable="true"], .ProseMirror, [data-workspace-gesture="ignore"]';

  return Boolean(target.closest(editableSelector));
}

function isEditableWorkspaceGestureTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(target.closest('[contenteditable="true"], .ProseMirror'));
}

function hasActiveTextSelection() {
  if (typeof window === 'undefined') return false;

  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString());
}

function canTriggerPullDownSearch(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return true;

  let current: HTMLElement | null = target;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const scrollable =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight;

    if (scrollable && current.scrollTop > 8) {
      return false;
    }

    current = current.parentElement;
  }

  return true;
}

function getAvailableMobilePanes({
  hasSelectedNote,
  hasMetadata,
}: {
  hasSelectedNote: boolean;
  hasMetadata: boolean;
}) {
  const panes: WorkspaceMobilePane[] = ['navigation', 'notes'];
  if (hasSelectedNote) {
    panes.push('editor');
  }
  if (hasMetadata) {
    panes.push('metadata');
  }
  return panes;
}

function getMaxDesktopGestureMode(hasMetadata: boolean): WorkspaceMode {
  return hasMetadata ? 4 : 3;
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
  const location = useLocation();
  const isMobile = useIsMobile();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mode, setModeState] = useState<WorkspaceMode>(readStoredWorkspaceMode);
  const [mobilePane, setMobilePane] = useState<WorkspaceMobilePane>(() =>
    getDefaultMobilePane(selectedNoteId)
  );
  const [activeView, setActiveViewState] =
    useState<WorkspaceView>(loadWorkspaceView);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredPaneWidth(
      SIDEBAR_WIDTH_STORAGE_KEY,
      DESKTOP_PANE_WIDTHS.sidebar.default,
      DESKTOP_PANE_WIDTHS.sidebar.min,
      DESKTOP_PANE_WIDTHS.sidebar.max
    )
  );
  const [notesWidth, setNotesWidth] = useState(() =>
    readStoredPaneWidth(
      NOTES_WIDTH_STORAGE_KEY,
      DESKTOP_PANE_WIDTHS.notes.default,
      DESKTOP_PANE_WIDTHS.notes.min,
      DESKTOP_PANE_WIDTHS.notes.max
    )
  );
  const [metadataWidth, setMetadataWidth] = useState(() =>
    readStoredPaneWidth(
      METADATA_WIDTH_STORAGE_KEY,
      DESKTOP_PANE_WIDTHS.metadata.default,
      DESKTOP_PANE_WIDTHS.metadata.min,
      DESKTOP_PANE_WIDTHS.metadata.max
    )
  );
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [desktopNotesCollapsed, setDesktopNotesCollapsed] = useState(false);
  const [interactionPreferences] = useState(
    readWorkspaceInteractionPreferences
  );
  const gestureStartRef = useRef<{
    x: number;
    y: number;
    target: EventTarget | null;
  } | null>(null);
  const hasSelectedNote = Boolean(selectedNoteId);
  const hasMetadataPane = Boolean(metadataSlot) && hasSelectedNote;

  const paneState = useMemo(() => getWorkspacePaneState(mode), [mode]);
  const desktopSidebarVisible =
    paneState.sidebarVisible && !desktopSidebarCollapsed;
  const desktopNotesVisible = paneState.notesVisible && !desktopNotesCollapsed;
  const availableMobilePanes = useMemo(
    () =>
      getAvailableMobilePanes({
        hasSelectedNote,
        hasMetadata: hasMetadataPane,
      }),
    [hasMetadataPane, hasSelectedNote]
  );
  const maxDesktopGestureMode = useMemo(
    () => getMaxDesktopGestureMode(hasMetadataPane),
    [hasMetadataPane]
  );

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
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem(NOTES_WIDTH_STORAGE_KEY, String(notesWidth));
  }, [notesWidth]);

  useEffect(() => {
    localStorage.setItem(METADATA_WIDTH_STORAGE_KEY, String(metadataWidth));
  }, [metadataWidth]);

  useEffect(() => {
    const folderId = new URLSearchParams(location.search).get('folder')?.trim();
    if (!folderId) return;

    setActiveViewState(`folder:${folderId}`);
    setMobilePane('notes');
  }, [location.search]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreWorkspaceHotkeyTarget(event.target)) return;

      const requestedMode = getWorkspaceModeFromHotkey(event);
      if (!requestedMode) return;
      event.preventDefault();
      setModeState((currentMode) => {
        const nextMode = resolveWorkspaceModeHotkeySelection(
          currentMode,
          requestedMode
        );

        syncModeChrome(nextMode);

        return nextMode;
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const syncModeChrome = (nextMode: WorkspaceMode) => {
    const nextPaneState = getWorkspacePaneState(nextMode);
    setDesktopSidebarCollapsed(!nextPaneState.sidebarVisible);
    setDesktopNotesCollapsed(!nextPaneState.notesVisible);
    setMobilePane(getMobilePaneForMode(nextMode));
  };

  const setMode = (nextMode: WorkspaceMode) => {
    setModeState(nextMode);
    syncModeChrome(nextMode);
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

  const setMobilePaneAndMode = useCallback((pane: WorkspaceMobilePane) => {
    setMobilePane(pane);
    setModeState((current) => getModeForMobilePane(pane, current));
  }, []);

  const openSearch = useCallback(() => setCommandOpen(true), []);

  const handleSwipeGesture = useCallback(
    ({
      deltaX,
      deltaY,
      target,
      gestureSurface,
    }: {
      deltaX: number;
      deltaY: number;
      target: EventTarget | null;
      gestureSurface: 'mobile' | 'desktop';
    }) => {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      const pullDownSearchEnabled =
        gestureSurface === 'desktop'
          ? interactionPreferences.desktopPullDownSearch
          : interactionPreferences.mobilePullDownSearch;

      if (
        gestureSurface === 'desktop' &&
        isEditableWorkspaceGestureTarget(target) &&
        hasActiveTextSelection()
      ) {
        return;
      }

      if (
        pullDownSearchEnabled &&
        absY > absX &&
        deltaY > VERTICAL_GESTURE_THRESHOLD &&
        canTriggerPullDownSearch(target)
      ) {
        openSearch();
        return;
      }

      if (absX <= absY || absX < HORIZONTAL_GESTURE_THRESHOLD) {
        return;
      }

      if (gestureSurface === 'desktop') {
        if (!interactionPreferences.desktopSwipeEffects) {
          return;
        }

        setModeState((current) => {
          const direction = deltaX < 0 ? 1 : -1;
          const nextMode = Math.min(
            maxDesktopGestureMode,
            Math.max(DESKTOP_GESTURE_MODE_MIN, current + direction)
          ) as WorkspaceMode;

          setDesktopSidebarCollapsed(
            !getWorkspacePaneState(nextMode).sidebarVisible
          );
          setDesktopNotesCollapsed(
            !getWorkspacePaneState(nextMode).notesVisible
          );

          return nextMode;
        });
        return;
      }

      if (!interactionPreferences.mobileSwipeEffects) {
        return;
      }

      const currentIndex = availableMobilePanes.indexOf(mobilePane);
      if (currentIndex === -1) return;

      const nextIndex =
        deltaX < 0
          ? Math.min(currentIndex + 1, availableMobilePanes.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (nextIndex !== currentIndex) {
        setMobilePaneAndMode(availableMobilePanes[nextIndex]);
      }
    },
    [
      availableMobilePanes,
      interactionPreferences.desktopPullDownSearch,
      interactionPreferences.desktopSwipeEffects,
      interactionPreferences.mobilePullDownSearch,
      interactionPreferences.mobileSwipeEffects,
      maxDesktopGestureMode,
      mobilePane,
      openSearch,
      setMobilePaneAndMode,
    ]
  );

  const beginGesture = (
    target: EventTarget | null,
    x: number,
    y: number,
    gestureSurface: 'mobile' | 'desktop'
  ) => {
    if (
      shouldIgnoreWorkspaceGestureTarget(target, {
        allowContentEditable: gestureSurface === 'desktop',
      })
    ) {
      gestureStartRef.current = null;
      return;
    }

    gestureStartRef.current = { x, y, target };
  };

  const endGesture = useCallback(
    (x: number, y: number, gestureSurface: 'mobile' | 'desktop') => {
      const start = gestureStartRef.current;
      gestureStartRef.current = null;
      if (!start) return;

      handleSwipeGesture({
        deltaX: x - start.x,
        deltaY: y - start.y,
        target: start.target,
        gestureSurface,
      });
    },
    [handleSwipeGesture]
  );

  useEffect(() => {
    if (isMobile) return;

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        return;
      }
      endGesture(event.clientX, event.clientY, 'desktop');
    };

    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [endGesture, isMobile]);

  const contextValue: WorkspaceShellContextValue = {
    mode,
    setMode,
    activeView,
    setActiveView,
    sidebarVisible: isMobile
      ? mobilePane === 'navigation'
      : desktopSidebarVisible,
    notesVisible: isMobile ? mobilePane === 'notes' : desktopNotesVisible,
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
      desktopWidth={isMobile ? undefined : sidebarWidth}
    />
  );

  const notesList = (
    <NotesListPane
      activeView={activeView}
      onSearchClick={() => setCommandOpen(true)}
      selectedNoteId={selectedNoteId ?? null}
      mode={mode}
      onModeChange={setMode}
      onViewChange={setActiveView}
    />
  );

  const startResize =
    (pane: keyof typeof DESKTOP_PANE_WIDTHS) =>
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();

      const startX = event.clientX;
      const startWidth =
        pane === 'sidebar'
          ? sidebarWidth
          : pane === 'notes'
            ? notesWidth
            : metadataWidth;

      const { min, max } = DESKTOP_PANE_WIDTHS[pane];
      const direction = pane === 'metadata' ? -1 : 1;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = (moveEvent.clientX - startX) * direction;
        const nextWidth = clamp(startWidth + delta, min, max);

        if (pane === 'sidebar') {
          setSidebarWidth(nextWidth);
          return;
        }

        if (pane === 'notes') {
          setNotesWidth(nextWidth);
          return;
        }

        setMetadataWidth(nextWidth);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
      };

      document.body.style.setProperty('cursor', 'col-resize');
      document.body.style.setProperty('user-select', 'none');
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

  if (isMobile) {
    return (
      <WorkspaceShellContext.Provider value={contextValue}>
        <div
          data-cy="ewe-note-mobile-shell"
          className="flex h-[100dvh] min-w-0 flex-col overflow-hidden bg-background text-foreground"
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            beginGesture(event.target, touch.clientX, touch.clientY, 'mobile');
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            if (!touch) return;
            endGesture(touch.clientX, touch.clientY, 'mobile');
          }}
        >
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

          <MobileWorkspaceBar
            activePane={mobilePane}
            selectedNoteId={selectedNoteId ?? null}
            onPaneChange={setMobilePaneAndMode}
            onSearchClick={openSearch}
            onSettingsClick={() => navigate('/settings')}
          />

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
      <div
        className="flex h-screen overflow-hidden bg-background text-foreground"
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
            return;
          }
          if (event.button !== 0) return;
          beginGesture(event.target, event.clientX, event.clientY, 'desktop');
        }}
      >
        {desktopSidebarVisible ? sidebar : null}
        {paneState.sidebarVisible ? (
          <DesktopResizeHandle
            dataCy="ewe-note-sidebar-resizer"
            label="Resize folders pane"
            onMouseDown={startResize('sidebar')}
            onToggle={() => setDesktopSidebarCollapsed((current) => !current)}
          />
        ) : null}

        {desktopNotesVisible ? (
          <>
            <div
              data-cy="ewe-note-notes-pane"
              className="shrink-0"
              style={{ width: `${notesWidth}px` }}
            >
              {notesList}
            </div>
            <DesktopResizeHandle
              dataCy="ewe-note-notes-resizer"
              label="Resize recent notes pane"
              onMouseDown={startResize('notes')}
              onToggle={() => setDesktopNotesCollapsed((current) => !current)}
            />
          </>
        ) : paneState.notesVisible ? (
          <DesktopResizeHandle
            dataCy="ewe-note-notes-resizer"
            label="Resize recent notes pane"
            onMouseDown={startResize('notes')}
            onToggle={() => setDesktopNotesCollapsed((current) => !current)}
          />
        ) : null}

        <div className="min-w-0 flex-1">{children}</div>

        {paneState.metadataVisible ? (
          <>
            <DesktopResizeHandle
              dataCy="ewe-note-metadata-resizer"
              label="Resize metadata pane"
              onMouseDown={startResize('metadata')}
              onToggle={() => setMetadataVisible(false)}
            />
            <div
              data-cy="ewe-note-metadata-pane"
              className="shrink-0"
              style={{ width: `${metadataWidth}px` }}
            >
              {metadataSlot ?? null}
            </div>
          </>
        ) : null}

        <EnhancedCommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </div>
    </WorkspaceShellContext.Provider>
  );
}

function DesktopResizeHandle({
  dataCy,
  label,
  onMouseDown,
  onToggle,
}: {
  dataCy: string;
  label: string;
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onToggle: () => void;
}) {
  const dragMovedRef = useRef(false);

  return (
    <div
      role="separator"
      aria-label={label}
      data-cy={dataCy}
      onMouseDown={(event) => {
        dragMovedRef.current = false;
        const startX = event.clientX;
        const onMove = (moveEvent: MouseEvent) => {
          if (Math.abs(moveEvent.clientX - startX) > 3) {
            dragMovedRef.current = true;
          }
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        onMouseDown(event);
      }}
      onClick={() => {
        if (dragMovedRef.current) {
          dragMovedRef.current = false;
          return;
        }
        onToggle();
      }}
      className="group relative hidden w-3 shrink-0 cursor-col-resize md:block"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/50 transition-colors group-hover:bg-foreground/20" />
    </div>
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
  return (
    <div className="h-full min-w-0 overflow-hidden bg-background">
      {children}
    </div>
  );
}

function MobileWorkspaceBar({
  activePane,
  selectedNoteId,
  onPaneChange,
  onSearchClick,
  onSettingsClick,
}: {
  activePane: WorkspaceMobilePane;
  selectedNoteId: string | null;
  onPaneChange: (pane: WorkspaceMobilePane) => void;
  onSearchClick: () => void;
  onSettingsClick: () => void;
}) {
  const items: Array<{
    pane: WorkspaceMobilePane;
    label: string;
    icon: LucideIcon;
    disabled?: boolean;
  }> = [
    { pane: 'navigation', label: WORKSPACE_MODE_ARIA_LABELS[3], icon: Menu },
    { pane: 'notes', label: 'File previews', icon: Library },
    {
      pane: 'editor',
      label: WORKSPACE_MODE_ARIA_LABELS[1],
      icon: FileText,
      disabled: !selectedNoteId,
    },
  ];

  return (
    <footer className="shrink-0 border-t border-border/70 bg-card/95 px-3 py-2 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <nav className="flex min-w-0 items-center justify-between gap-1">
        <button
          type="button"
          onClick={onSettingsClick}
          data-cy="ewe-note-mobile-settings-link"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        {items.map(({ pane, label, icon: Icon, disabled }) => (
          <button
            key={pane}
            type="button"
            disabled={disabled}
            onClick={() => onPaneChange(pane)}
            className={`flex h-11 w-11 min-w-0 items-center justify-center rounded-full transition-colors ${
              activePane === pane
                ? 'bg-accent text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
            } disabled:cursor-not-allowed disabled:opacity-35`}
            aria-label={`${label} pane`}
            title={label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="sr-only">{label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onSearchClick}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Search notes"
          title="Search notes"
        >
          <Search className="h-4 w-4" />
        </button>
      </nav>
    </footer>
  );
}

export function useWorkspaceShell() {
  const context = useContext(WorkspaceShellContext);
  if (!context) {
    throw new Error('useWorkspaceShell must be used inside WorkspaceShell');
  }
  return context;
}
