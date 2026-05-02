import { useNavigate } from 'react-router';
import { FileText, Hash, Plus, Search, Star, CheckSquare } from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';
import type { WorkspaceMode } from './workspace-layout';

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

  return (
    <aside className="flex h-screen w-[22rem] shrink-0 flex-col border-r border-white/6 bg-[oklch(0.175_0.01_95)]/96">
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

        <div className="mt-3 flex items-center gap-1 rounded-full bg-black/10 p-1">
          {[1, 2, 3, 4].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value as WorkspaceMode)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs transition-colors ${
                mode === value
                  ? 'bg-white/12 text-foreground'
                  : 'text-muted-foreground hover:bg-white/6 hover:text-foreground'
              }`}
              title={`Workspace mode ${value}`}
              aria-label={`Workspace mode ${value}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {activeView === 'tasks' ? (
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
