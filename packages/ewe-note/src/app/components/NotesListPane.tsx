import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  FileText,
  Hash,
  Info,
  Library,
  Plus,
  Search,
  Star,
  CheckSquare,
  type LucideIcon,
} from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';
import {
  WORKSPACE_MODE_DESCRIPTIONS,
  WORKSPACE_MODE_LABELS,
  WORKSPACE_SHORTCUT_LABELS,
  type WorkspaceMode,
} from './workspace-layout';

type WorkspaceView = 'all' | 'recent' | 'pinned' | 'tasks' | `folder:${string}`;

export function NotesListPane({
  activeView,
  onSearchClick,
  selectedNoteId,
  mode,
  onModeChange,
}: {
  activeView: WorkspaceView;
  onSearchClick: () => void;
  selectedNoteId: string | null;
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}) {
  const navigate = useNavigate();
  const {
    notes,
    folders,
    tasks,
    addNote,
    getPinnedNotes,
    getRecentNotes,
    getNotesInFolder,
  } = useNotes();

  const handleNewNote = () => {
    const created = addNote({ title: 'Untitled', content: '' });
    navigate(`/editor/${created.id}`);
  };

  let title = 'All Notes';
  let subtitle = `${notes.length} notes`;
  let displayNotes = notes;

  if (activeView === 'recent') {
    displayNotes = getRecentNotes(40);
    title = 'Recent';
    subtitle = `${displayNotes.length} notes`;
  } else if (activeView === 'pinned') {
    displayNotes = getPinnedNotes();
    title = 'Pinned';
    subtitle = `${displayNotes.length} notes`;
  } else if (activeView === 'tasks') {
    title = 'Tasks';
    subtitle = `${tasks.filter((task) => !task.completed).length} open`;
  } else if (activeView.startsWith('folder:')) {
    const folderId = activeView.replace('folder:', '');
    displayNotes = getNotesInFolder(folderId);
    title = folders.find((folder) => folder.id === folderId)?.name ?? 'Folder';
    subtitle = `${displayNotes.length} notes`;
  }

  const incompleteTasks = tasks.filter((task) => !task.completed);

  const modeIcons = {
    1: FileText,
    2: BookOpen,
    3: Library,
    4: Info,
  } satisfies Record<WorkspaceMode, LucideIcon>;

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-r border-white/6 bg-[oklch(0.175_0.01_95)]/96 md:h-screen md:w-[22rem]">
      <div className="border-b border-white/6 px-4 py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Library
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">
              {title}
            </h2>
            <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={handleNewNote}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            title="New note"
            aria-label="New note"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSearchClick}
            className="flex h-10 flex-1 items-center gap-2 rounded-full bg-white/4 px-3 text-sm text-muted-foreground transition-colors hover:bg-white/7 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search notes</span>
            <kbd className="rounded-full border border-white/8 px-2 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        </div>

        <div
          className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-black/10 p-1 xl:grid-cols-4"
          aria-label="Workspace layout"
        >
          {[1, 2, 3, 4].map((value) => (
            <WorkspaceModeButton
              key={value}
              value={value as WorkspaceMode}
              active={mode === value}
              icon={modeIcons[value as WorkspaceMode]}
              onClick={() => onModeChange(value as WorkspaceMode)}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {activeView === 'tasks' && incompleteTasks.length === 0 ? (
          <EmptyPane
            icon={CheckSquare}
            title="No open tasks"
            body="Task items from your notes appear here when they use markdown checkboxes."
          />
        ) : activeView !== 'tasks' && displayNotes.length === 0 ? (
          <EmptyPane
            icon={FileText}
            title={activeView === 'all' ? 'No notes yet' : 'Nothing here'}
            body={
              activeView === 'all'
                ? 'Create a note and it will stay available locally on this device.'
                : 'Try another view or create a note in this space.'
            }
            action={
              <button
                type="button"
                onClick={handleNewNote}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-sm text-foreground transition-colors hover:bg-white/6"
              >
                <Plus className="h-4 w-4" />
                New note
              </button>
            }
          />
        ) : activeView === 'tasks' ? (
          <div className="space-y-1">
            {incompleteTasks.map((task) => {
              const taskNote = notes.find((note) => note.id === task.noteId);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => navigate(`/editor/${task.noteId}`)}
                  className="w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5"
                >
                  <div className="flex items-start gap-3">
                    <CheckSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">
                        {task.text}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {taskNote?.title ?? 'Unknown note'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {displayNotes.map((note) => {
              const isActive = note.id === selectedNoteId;
              const folderName =
                folders.find((folder) => folder.id === note.folder)?.name ??
                'Notes';

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => navigate(`/editor/${note.id}`)}
                  className={`w-full rounded-2xl px-3 py-3 text-left transition-colors ${
                    isActive ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground">
                      {note.pinned ? (
                        <Star className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="truncate text-sm font-medium text-foreground">
                          {note.title}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {formatNoteDate(note.updatedAt)}
                        </div>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {stripMarkdown(note.content)}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{folderName}</span>
                        {note.tags[0] ? (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 truncate">
                              <Hash className="h-3 w-3" />
                              {note.tags[0]}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function WorkspaceModeButton({
  value,
  active,
  icon: Icon,
  onClick,
}: {
  value: WorkspaceMode;
  active: boolean;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
        active
          ? 'bg-white/12 text-foreground'
          : 'text-muted-foreground hover:bg-white/6 hover:text-foreground'
      }`}
      title={`${WORKSPACE_MODE_LABELS[value]} - ${WORKSPACE_MODE_DESCRIPTIONS[value]} (${WORKSPACE_SHORTCUT_LABELS[value]})`}
      aria-label={`${WORKSPACE_MODE_LABELS[value]} workspace mode`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">
          {WORKSPACE_MODE_LABELS[value]}
        </span>
        <span className="hidden truncate text-[10px] text-muted-foreground xl:block">
          {WORKSPACE_SHORTCUT_LABELS[value].replace('Ctrl/Cmd+', '⌘')}
        </span>
      </span>
    </button>
  );
}

function EmptyPane({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-4 text-sm font-medium text-foreground">{title}</div>
      <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-6 text-muted-foreground">
        {body}
      </p>
      {action}
    </div>
  );
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/^#.*$/gm, '')
    .replace(/\[\[|\]\]/g, '')
    .replace(/[*_`>#-]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function formatNoteDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
