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
  SidebarClose,
  SidebarOpen,
  Copy,
  Download,
  Check,
} from 'lucide-react';
import { EnhancedSidebar } from '../components/EnhancedSidebar';
import { EnhancedCommandPalette } from '../components/EnhancedCommandPalette';
import { RightPanel } from '../components/RightPanel';
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
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [copyLinkDone, setCopyLinkDone] = useState(false);
  const navigate = useNavigate();
  const { noteId } = useParams();
  const { notes, folders, updateNote, togglePinNote, deleteNote, addNote } =
    useNotes();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyLinkDone(true);
    setTimeout(() => setCopyLinkDone(false), 2000);
  };

  const handleDuplicate = () => {
    if (!note) return;
    const copy = addNote({
      title: `Copy of ${note.title}`,
      content: note.content,
      folder: note.folder,
      tags: note.tags,
      properties: note.properties,
    });
    navigate(`/editor/${copy.id}`);
  };

  const handleExport = () => {
    if (!note) return;
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
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
            type="button"
            aria-label="Exit focus mode"
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
        <div
          data-cy="ewe-note-focus-mode-active"
          className="flex-1 overflow-y-auto"
        >
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
                type="button"
                aria-label="Back to all notes"
                onClick={() => navigate('/')}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Breadcrumb */}
              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span
                  className="max-w-[18rem] truncate"
                  title={folder?.name || 'Notes'}
                >
                  {folder?.name || 'Notes'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                <input
                  aria-label="Note title"
                  value={note.title}
                  onChange={(e) =>
                    updateNote(note.id, { title: e.target.value })
                  }
                  className="min-w-[12rem] max-w-[24rem] truncate bg-transparent font-medium text-foreground outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={
                  rightPanelOpen ? 'Close note info' : 'Open note info'
                }
                data-cy="ewe-note-info-panel-toggle"
                onClick={() => setRightPanelOpen((v) => !v)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title={rightPanelOpen ? 'Close note info' : 'Open note info'}
              >
                {rightPanelOpen ? (
                  <SidebarClose className="w-4 h-4" />
                ) : (
                  <SidebarOpen className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="Enter focus mode"
                data-cy="ewe-note-focus-mode"
                onClick={() => setFocusMode(true)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="Focus Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
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
                  <button
                    type="button"
                    aria-label="Open note actions"
                    data-cy="ewe-note-editor-menu-trigger"
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    data-cy="ewe-note-copy-link"
                    onClick={handleCopyLink}
                  >
                    {copyLinkDone ? (
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <Link2 className="w-4 h-4 mr-2" />
                    )}
                    {copyLinkDone ? 'Copied!' : 'Copy Link'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-cy="ewe-note-duplicate"
                    onClick={handleDuplicate}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-cy="ewe-note-export"
                    onClick={handleExport}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    data-cy="ewe-note-delete-note"
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

      {rightPanelOpen && note && (
        <RightPanel noteId={note.id} onClose={() => setRightPanelOpen(false)} />
      )}

      <EnhancedCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </div>
  );
}
