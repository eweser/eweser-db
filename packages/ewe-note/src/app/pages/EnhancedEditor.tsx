import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Star,
  MoreHorizontal,
  Maximize2,
  Clock,
  FolderOpen,
  ChevronRight,
  Hash,
  Link2,
  Minimize2,
} from 'lucide-react';
import { EnhancedSidebar } from '../components/EnhancedSidebar';
import { EnhancedCommandPalette } from '../components/EnhancedCommandPalette';
import { useNotes } from '../contexts/NotesContext';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import Editor from '@/components/editor';
import { useDb } from '@/db';

export function EnhancedEditor() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const navigate = useNavigate();
  const { noteId } = useParams();
  const { notes, folders, updateNote, togglePinNote, deleteNote } = useNotes();
  const { allRooms, selectedRoom, setSelectedRoom, setSelectedNoteId } =
    useDb();

  const note = notes.find((n) => n.id === noteId);
  const noteRoom = useMemo(
    () => allRooms.find((room) => room.id === note?.roomId) ?? null,
    [allRooms, note?.roomId]
  );

  useEffect(() => {
    if (!note || !noteRoom) return;
    if (selectedRoom?.id !== noteRoom.id) {
      setSelectedRoom(noteRoom);
    }
    setSelectedNoteId(note.id);
  }, [note, noteRoom, selectedRoom?.id, setSelectedNoteId, setSelectedRoom]);

  if (!note) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-2">Note not found</h2>
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Go back to all notes
          </button>
        </div>
      </div>
    );
  }

  const folder = folders.find((f) => f.id === note.folder);
  const editorRoom = noteRoom ?? selectedRoom;

  if (focusMode) {
    return (
      <div className="h-screen bg-card flex flex-col">
        {/* Minimal focus mode header */}
        <header className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
          <button
            onClick={() => setFocusMode(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Minimize2 className="w-4 h-4" />
            Exit Focus Mode
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Last edited {new Date(note.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </header>

        {/* Focus mode editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-12">
            {editorRoom ? (
              <Editor
                selectedRoom={editorRoom}
                selectedNoteId={note.id}
                showFrontmatterEditor={false}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <EnhancedSidebar onSearchClick={() => setCommandOpen(true)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with breadcrumb */}
        <header
          data-cy="ewe-note-header"
          className="px-8 py-4 border-b border-border bg-card"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="w-4 h-4" />
                <span>{folder?.name || 'Notes'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <input
                  value={note.title}
                  onChange={(e) =>
                    updateNote(note.id, { title: e.target.value })
                  }
                  className="bg-transparent outline-none text-foreground font-medium min-w-[200px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFocusMode(true)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="Focus Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => togglePinNote(note.id)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title={note.pinned ? 'Unpin note' : 'Pin note'}
              >
                <Star
                  className={`w-4 h-4 ${
                    note.pinned ? 'text-primary fill-primary' : ''
                  }`}
                />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Link2 className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (
                        confirm('Are you sure you want to delete this note?')
                      ) {
                        deleteNote(note.id);
                        navigate('/');
                      }
                    }}
                  >
                    Delete Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tags and Properties */}
          <div className="flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Hash className="w-3 h-3 mr-0.5" />
                {tag}
              </Badge>
            ))}
            {Object.entries(note.properties)
              .slice(0, 3)
              .map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {key}: {value}
                </Badge>
              ))}
            {note.tags.length === 0 &&
              Object.keys(note.properties).length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Add tags or properties in the note frontmatter
                </span>
              )}
          </div>
        </header>

        {/* Editor surface */}
        <div className="flex-1 overflow-y-auto bg-card">
          <div className="max-w-4xl mx-auto px-12 py-8">
            {editorRoom ? (
              <Editor
                selectedRoom={editorRoom}
                selectedNoteId={note.id}
                showFrontmatterEditor={false}
              />
            ) : null}
          </div>
        </div>
      </main>

      <EnhancedCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </div>
  );
}
