import { useState } from 'react';
import { useNavigate, NavigateFunction } from 'react-router';
import {
  Clock,
  Star,
  MoreVertical,
  Plus,
  Hash,
  CheckSquare,
  Grid3x3,
  List,
} from 'lucide-react';
import { EnhancedSidebar } from '../components/EnhancedSidebar';
import { EnhancedCommandPalette } from '../components/EnhancedCommandPalette';
import { useNotes, Note, Folder, Task } from '../contexts/NotesContext';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

type ViewMode = 'grid' | 'list';

export function EnhancedHome() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [activeView, setActiveView] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const navigate = useNavigate();
  const {
    notes,
    folders,
    tasks,
    addNote,
    getRecentNotes,
    getPinnedNotes,
    getNotesInFolder,
    togglePinNote,
    deleteNote,
  } = useNotes();

  const handleNewNote = () => {
    const newNote = addNote({
      title: 'Untitled',
      content: '',
    });
    navigate(`/editor/${newNote.id}`);
  };

  // Get notes based on active view
  let displayNotes = notes;
  let viewTitle = 'All Notes';
  let viewCount = notes.length;

  if (activeView === 'recent') {
    displayNotes = getRecentNotes(20);
    viewTitle = 'Recent Notes';
    viewCount = displayNotes.length;
  } else if (activeView === 'pinned') {
    displayNotes = getPinnedNotes();
    viewTitle = 'Pinned Notes';
    viewCount = displayNotes.length;
  } else if (activeView === 'tasks') {
    viewTitle = 'Tasks';
    viewCount = tasks.filter((t) => !t.completed).length;
  } else if (activeView.startsWith('folder:')) {
    const folderId = activeView.replace('folder:', '');
    displayNotes = getNotesInFolder(folderId);
    const folder = folders.find((f) => f.id === folderId);
    viewTitle = folder?.name || 'Folder';
    viewCount = displayNotes.length;
  }

  const incompleteTasks = tasks.filter((t) => !t.completed);

  return (
    <div className="flex h-screen overflow-hidden">
      <EnhancedSidebar
        onSearchClick={() => setCommandOpen(true)}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="px-8 py-5 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl tracking-tight mb-1">{viewTitle}</h1>
              <p className="text-sm text-muted-foreground">
                {activeView === 'tasks'
                  ? `${viewCount} incomplete tasks`
                  : `${viewCount} notes`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              {activeView !== 'tasks' && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1 mr-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-background shadow-sm'
                        : 'hover:bg-background/50'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-background shadow-sm'
                        : 'hover:bg-background/50'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                data-cy="ewe-note-new-note"
                onClick={handleNewNote}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>New Note</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeView === 'tasks' ? (
            <TasksView
              tasks={incompleteTasks}
              notes={notes}
              navigate={navigate}
            />
          ) : viewMode === 'grid' ? (
            <NotesGridView
              notes={displayNotes}
              folders={folders}
              navigate={navigate}
              onTogglePin={togglePinNote}
              onDelete={deleteNote}
            />
          ) : (
            <NotesListView
              notes={displayNotes}
              folders={folders}
              navigate={navigate}
              onTogglePin={togglePinNote}
              onDelete={deleteNote}
            />
          )}
        </div>
      </main>

      <EnhancedCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </div>
  );
}

// Notes Grid View
interface NoteListProps {
  notes: Note[];
  folders: Folder[];
  navigate: NavigateFunction;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotesGridView({
  notes,
  folders,
  navigate,
  onTogglePin,
  onDelete,
}: NoteListProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-[1800px]">
      {notes.map((note) => (
        <div
          key={note.id}
          onClick={() => navigate(`/editor/${note.id}`)}
          className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-foreground/10 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-medium line-clamp-1">{note.title}</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded flex items-center gap-1">
                  {note.pinned && (
                    <Star className="w-3.5 h-3.5 text-muted-foreground/60 fill-muted-foreground/60" />
                  )}
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note.id);
                  }}
                >
                  <Star className="w-4 h-4 mr-2" />
                  {note.pinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this note?')) {
                      onDelete(note.id);
                    }
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {note.content.replace(/[#*\[\]]/g, '').substring(0, 150)}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-1 bg-muted/50 rounded-md text-xs">
              {folders.find((f) => f.id === note.folder)?.name || note.folder}
            </span>
            {note.tags.slice(0, 2).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Hash className="w-2.5 h-2.5 mr-0.5" />
                {tag}
              </Badge>
            ))}
            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Notes List View
function NotesListView({
  notes,
  folders,
  navigate,
  onTogglePin,
  onDelete,
}: NoteListProps) {
  return (
    <div className="max-w-4xl space-y-2">
      {notes.map((note) => (
        <div
          key={note.id}
          onClick={() => navigate(`/editor/${note.id}`)}
          className="w-full bg-card border border-border rounded-lg p-4 hover:shadow-sm hover:border-foreground/10 transition-all cursor-pointer group flex items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-medium mb-1 truncate">{note.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {note.content.replace(/[#*\[\]]/g, '').substring(0, 200)}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-muted/50 rounded text-xs">
                {folders.find((f) => f.id === note.folder)?.name || note.folder}
              </span>
              {note.tags.slice(0, 3).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Hash className="w-2.5 h-2.5 mr-0.5" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-xs text-muted-foreground">
              {new Date(note.updatedAt).toLocaleDateString()}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-accent rounded">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note.id);
                  }}
                >
                  <Star className="w-4 h-4 mr-2" />
                  {note.pinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this note?')) {
                      onDelete(note.id);
                    }
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}

// Tasks View
interface TasksViewProps {
  tasks: Task[];
  notes: Note[];
  navigate: NavigateFunction;
}

function TasksView({ tasks, notes, navigate }: TasksViewProps) {
  const groupedByNote: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    if (!groupedByNote[task.noteId]) {
      groupedByNote[task.noteId] = [];
    }
    groupedByNote[task.noteId].push(task);
  });

  return (
    <div data-cy="ewe-note-tasks-view" className="max-w-4xl space-y-4">
      {Object.entries(groupedByNote).map(([noteId, noteTasks]) => {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return null;

        return (
          <div
            key={noteId}
            className="bg-card border border-border rounded-lg p-5"
          >
            <button
              onClick={() => navigate(`/editor/${noteId}`)}
              className="text-left mb-3 hover:text-primary transition-colors"
            >
              <h3 className="font-medium text-lg">{note.title}</h3>
            </button>
            <div className="space-y-2">
              {noteTasks.map((task: any) => (
                <div
                  key={task.id}
                  data-cy={`ewe-note-task-item-${task.id}`}
                  className="flex items-start gap-3 p-2 rounded hover:bg-accent/50 transition-colors"
                >
                  <CheckSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm flex-1">{task.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">No tasks found</h3>
          <p className="text-sm text-muted-foreground">
            Create tasks in your notes using markdown checkboxes: - [ ] Task
          </p>
        </div>
      )}
    </div>
  );
}
