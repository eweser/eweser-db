import { useNavigate } from 'react-router';
import { FileText, Hash, Plus, Star, CheckSquare, X } from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';
import type { WorkspaceMode } from './workspace-layout';

type WorkspaceView = 'all' | 'recent' | 'pinned' | 'tasks' | `folder:${string}`;

export function NotesListPane({
  activeView,
  selectedNoteId,
  onViewChange,
}: {
  activeView: WorkspaceView;
  onSearchClick: () => void;
  selectedNoteId: string | null;
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onViewChange: (view: WorkspaceView) => void;
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

  let displayNotes = notes;

  if (activeView === 'recent') {
    displayNotes = getRecentNotes(12);
  } else if (activeView === 'pinned') {
    displayNotes = getPinnedNotes();
  } else if (activeView === 'tasks') {
    displayNotes = [];
  } else if (activeView.startsWith('folder:')) {
    const folderId = activeView.replace('folder:', '');
    displayNotes = getNotesInFolder(folderId);
  }

  const incompleteTasks = tasks.filter((task) => !task.completed);
  const filterLabel = getFilterLabel(activeView, folders);
  const filterSubLabel = getFilterSubLabel(activeView);

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-r border-border bg-card/80 md:h-screen">
      {filterLabel ? (
        <div className="border-b border-border/70 px-3 py-2">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-accent/60 px-3 py-2">
            <div className="min-w-0 text-sm text-foreground">
              <span className="font-medium">{filterLabel}</span>
              {filterSubLabel ? (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {filterSubLabel}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onViewChange('recent')}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Clear current filter"
              title="Show recent notes"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end px-3 py-3">
        <button
          type="button"
          data-cy="ewe-note-new-note"
          onClick={handleNewNote}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="New note"
          aria-label="New note"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {activeView === 'tasks' && incompleteTasks.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground">
            <CheckSquare className="mx-auto h-4 w-4" />
          </div>
        ) : activeView !== 'tasks' && displayNotes.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground">
            <FileText className="mx-auto h-4 w-4" />
          </div>
        ) : activeView === 'tasks' ? (
          <div className="space-y-1">
            {incompleteTasks.map((task) => {
              const taskNote = notes.find((note) => note.id === task.noteId);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => navigate(`/editor/${task.noteId}`)}
                  className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent/70"
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
                folders.find((folder) => folder.id === note.folder)?.name ?? '';
              const sourceLabel = note.sourcePath ?? '';
              const tagPreview = note.tags[0] ? note.tags[0] : null;

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => navigate(`/editor/${note.id}`)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/70'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {note.pinned ? (
                      <Star className="mt-1 h-3.5 w-3.5 shrink-0 fill-current text-primary" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {formatNoteTitle(note.title)}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {formatNoteDate(note.updatedAt)}
                        </div>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                        {stripMarkdown(note.content)}
                      </div>
                      {sourceLabel || folderName || tagPreview ? (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {sourceLabel ? (
                            <span className="truncate">{sourceLabel}</span>
                          ) : null}
                          {sourceLabel && (folderName || tagPreview) ? (
                            <span>•</span>
                          ) : null}
                          {folderName ? (
                            <span className="truncate">{folderName}</span>
                          ) : null}
                          {folderName && tagPreview ? <span>•</span> : null}
                          {tagPreview ? (
                            <>
                              <span className="inline-flex items-center gap-1 truncate">
                                <Hash className="h-3 w-3" />
                                {tagPreview}
                              </span>
                            </>
                          ) : null}
                        </div>
                      ) : null}
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
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*\[![^\]]+\][+-]?\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alt) =>
      (alt || target || '').trim()
    )
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+\[( |x|X)\]\s+/gm, (_match, checked: string) =>
      checked.toLowerCase() === 'x' ? '✓ ' : '○ '
    )
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/%%[\s\S]*?%%/g, ' ')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/[*_~>#]/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatNoteTitle(title: string) {
  return (
    title
      .replace(/^#{1,6}\s+/g, '')
      .replace(/^\s*[-*+]\s+\[( |x|X)\]\s+/g, '')
      .replace(/[*_~`[\]]/g, '')
      .trim() || 'Untitled'
  );
}

function getFilterLabel(
  activeView: WorkspaceView,
  folders: Array<{ id: string; name: string }>
) {
  if (activeView === 'recent') return null;
  if (activeView === 'all') return 'All notes';
  if (activeView === 'pinned') return 'Pinned notes';
  if (activeView === 'tasks') return 'Open tasks';
  if (activeView.startsWith('folder:')) {
    const folderId = activeView.replace('folder:', '');
    return folders.find((folder) => folder.id === folderId)?.name ?? 'Folder';
  }
  return null;
}

function getFilterSubLabel(activeView: WorkspaceView) {
  if (activeView.startsWith('folder:')) return 'Including subfolders';
  return null;
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
