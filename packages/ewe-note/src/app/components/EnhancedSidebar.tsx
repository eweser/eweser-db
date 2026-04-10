import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  Clock,
  FolderOpen,
  Plus,
  Search,
  CheckSquare,
  ChevronRight,
  ChevronDown,
  Settings,
  Folder,
  Moon,
  Sun,
  Share,
  Pencil,
  Trash2,
  Star,
} from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';
import { useTheme } from '../components/ThemeProvider';
import { ShareFolderDialog } from '../components/ShareFolderDialog';
import { useDb } from '@/db';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from './ui/context-menu';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface EnhancedSidebarProps {
  onSearchClick: () => void;
  activeView?: string;
  onViewChange?: (view: string) => void;
}

const ItemTypes = {
  NOTE: 'note',
};

export function EnhancedSidebar({
  onSearchClick,
  activeView = 'all',
  onViewChange,
}: EnhancedSidebarProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <SidebarContent
        onSearchClick={onSearchClick}
        activeView={activeView}
        onViewChange={onViewChange}
      />
    </DndProvider>
  );
}

function SidebarContent({
  onSearchClick,
  activeView = 'all',
  onViewChange,
}: EnhancedSidebarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const {
    folders,
    notes,
    tasks,
    addNote,
    addFolder,
    getNotesInFolder,
    moveNote,
    getPinnedNotes,
    togglePinNote,
  } = useNotes();
  const { loggedIn, loginUrl, signOut, user } = useDb();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['work', 'personal', 'development', 'daily'])
  );
  const [shareFolderOpen, setShareFolderOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);
  const [pinnedExpanded, setPinnedExpanded] = useState(true);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleShareFolder = (folderId: string, folderName: string) => {
    setSelectedFolder({ id: folderId, name: folderName });
    setShareFolderOpen(true);
  };

  const handleNewNoteInFolder = (folderId: string) => {
    const newNote = addNote({
      title: 'Untitled',
      content: '',
      folder: folderId,
    });
    navigate(`/editor/${newNote.id}`);
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const pinnedNotes = getPinnedNotes();

  return (
    <aside
      data-cy="ewe-note-sidebar"
      className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen"
    >
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={theme === 'light' ? '/eweser-logo.svg' : '/eweser-logo-white.svg'}
              alt="EweNote"
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-lg tracking-tight font-medium">EweNote</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-sidebar-accent rounded-lg transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <button
        onClick={onSearchClick}
        className="mx-4 mt-4 flex items-center gap-2 px-3 py-2 bg-sidebar-accent rounded-lg hover:bg-sidebar-accent/80 transition-colors text-left group"
      >
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1">
          Search notes...
        </span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          ⌘K
        </kbd>
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Pinned Notes Section */}
        {pinnedNotes.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setPinnedExpanded(!pinnedExpanded)}
              className="w-full flex items-center gap-2 px-3 py-1.5 mb-2 hover:bg-sidebar-accent/50 rounded-lg transition-colors"
            >
              {pinnedExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Star className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-1">
                Pinned
              </span>
              <span className="text-xs text-muted-foreground">
                {pinnedNotes.length}
              </span>
            </button>
            {pinnedExpanded && (
              <div className="space-y-0.5 ml-2">
                {pinnedNotes.map((note) => (
                  <PinnedNoteItem
                    key={note.id}
                    note={note}
                    onTogglePin={() => togglePinNote(note.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Navigation */}
        <div className="space-y-1">
          <SidebarLink
            icon={FileText}
            label="All Notes"
            count={notes.length}
            active={activeView === 'all'}
            onClick={() => {
              onViewChange?.('all');
              navigate('/');
            }}
          />
          <SidebarLink
            icon={Clock}
            label="Recent"
            active={activeView === 'recent'}
            onClick={() => onViewChange?.('recent')}
          />
          <SidebarLink
            icon={CheckSquare}
            label="Tasks"
            count={incompleteTasks.length}
            active={activeView === 'tasks'}
            onClick={() => onViewChange?.('tasks')}
          />
        </div>

        {/* Folders */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Folders
            </span>
            <button
              data-cy="ewe-note-new-folder-trigger"
              onClick={() => {
                const name = prompt('Folder name:');
                if (name) {
                  addFolder(name);
                }
              }}
              className="p-1 hover:bg-sidebar-accent rounded transition-colors"
              title="New folder"
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-0.5">
            {folders.map((folder) => {
              const folderNotes = getNotesInFolder(folder.id);
              const isExpanded = expandedFolders.has(folder.id);
              const isHovered = hoveredFolder === folder.id;

              return (
                <div key={folder.id}>
                  <FolderItem
                    folder={folder}
                    folderNotes={folderNotes}
                    isExpanded={isExpanded}
                    isHovered={isHovered}
                    onToggle={() => toggleFolder(folder.id)}
                    onClick={() => onViewChange?.(`folder:${folder.id}`)}
                    onHoverChange={(hovered) =>
                      setHoveredFolder(hovered ? folder.id : null)
                    }
                    onNewNote={() => handleNewNoteInFolder(folder.id)}
                    onMove={moveNote}
                    onShareFolder={() =>
                      handleShareFolder(folder.id, folder.name)
                    }
                  />

                  {/* Folder notes */}
                  {isExpanded && folderNotes.length > 0 && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {folderNotes.slice(0, 10).map((note) => (
                        <NoteItem
                          key={note.id}
                          note={note}
                          folderId={folder.id}
                          onMove={moveNote}
                        />
                      ))}
                      {folderNotes.length > 10 && (
                        <div className="text-xs text-muted-foreground px-2 py-1">
                          +{folderNotes.length - 10} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={() => navigate('/style-guide')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Settings</span>
        </button>

        <button
          data-cy={loggedIn ? 'ewe-note-logout' : 'ewe-note-login'}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
          onClick={() => {
            if (!loggedIn) {
              window.location.href = loginUrl;
              return;
            }
            signOut();
          }}
        >
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-medium">
            {(user.firstName || 'G').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-medium truncate">
              {loggedIn
                ? `${user.firstName} ${user.lastName}`.trim() || 'Signed In'
                : 'Sign In'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {loggedIn ? 'Sign out' : 'Connect your account'}
            </div>
          </div>
        </button>
      </div>

      {/* Share Folder Dialog */}
      {selectedFolder && (
        <ShareFolderDialog
          open={shareFolderOpen}
          onOpenChange={setShareFolderOpen}
          folderName={selectedFolder.name}
          folderId={selectedFolder.id}
        />
      )}
    </aside>
  );
}

interface PinnedNoteItemProps {
  note: any;
  onTogglePin: () => void;
}

function PinnedNoteItem({ note, onTogglePin }: PinnedNoteItemProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-1 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => navigate(`/editor/${note.id}`)}
        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
      >
        <Star className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
        <span className="text-sm truncate">{note.title}</span>
      </button>
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className="p-1 hover:bg-sidebar-accent rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Unpin note"
        >
          <Star className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

interface FolderItemProps {
  folder: any;
  folderNotes: any[];
  isExpanded: boolean;
  isHovered: boolean;
  onToggle: () => void;
  onClick: () => void;
  onHoverChange: (hovered: boolean) => void;
  onNewNote: () => void;
  onMove: (noteId: string, targetFolder: string) => void;
  onShareFolder: () => void;
}

function FolderItem({
  folder,
  folderNotes,
  isExpanded,
  isHovered,
  onToggle,
  onClick,
  onHoverChange,
  onNewNote,
  onMove,
  onShareFolder,
}: FolderItemProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.NOTE,
    drop: (item: { noteId: string; folderId: string }) => {
      if (item.folderId !== folder.id) {
        onMove(item.noteId, folder.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`flex items-center gap-1 rounded-lg transition-colors ${
        isOver ? 'bg-primary/10 border border-primary/30' : ''
      }`}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <button
        onClick={onToggle}
        className="p-1 hover:bg-sidebar-accent rounded transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      <button
        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
        onClick={onClick}
      >
        <FolderOpen className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm flex-1">{folder.name}</span>
        <span className="text-xs text-muted-foreground">
          {folderNotes.length}
        </span>
      </button>
      {isHovered && (
        <button
          onClick={onNewNote}
          className="p-1 hover:bg-sidebar-accent rounded transition-colors"
          title="New note in folder"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
      {isHovered && (
        <button
          onClick={onShareFolder}
          className="p-1 hover:bg-sidebar-accent rounded transition-colors"
          title="Share folder"
          disabled={folder.kind === 'shared-room'}
        >
          <Share className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

interface NoteItemProps {
  note: any;
  folderId: string;
  onMove: (noteId: string, targetFolder: string) => void;
}

function NoteItem({ note, folderId, onMove }: NoteItemProps) {
  const navigate = useNavigate();
  const { togglePinNote } = useNotes();

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.NOTE,
    item: { noteId: note.id, folderId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={drag}
          data-cy={`ewe-note-note-item-${note.id}`}
          onClick={() => navigate(`/editor/${note.id}`)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-left group ${
            isDragging ? 'opacity-50' : ''
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs truncate flex-1">{note.title}</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => navigate(`/editor/${note.id}`)}>
          <FileText className="w-4 h-4 mr-2" />
          <span>Open</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => togglePinNote(note.id)}>
          {note.pinned ? (
            <>
              <Star className="w-4 h-4 mr-2" />
              <span>Unpin</span>
            </>
          ) : (
            <>
              <Star className="w-4 h-4 mr-2" />
              <span>Pin</span>
            </>
          )}
        </ContextMenuItem>
        <ContextMenuItem>
          <Pencil className="w-4 h-4 mr-2" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function SidebarLink({
  icon: Icon,
  label,
  count,
  active = false,
  onClick,
}: {
  icon: any;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'hover:bg-sidebar-accent/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}
