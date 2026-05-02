import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Star,
  MoreHorizontal,
  Maximize2,
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
import { parseWikiHref } from '@/extensions/wiki-link';
import {
  WorkspaceShell,
  useWorkspaceShell,
} from '../components/WorkspaceShell';
import type { Note } from '../contexts/NotesContext';

export function EnhancedEditor() {
  const [focusMode, setFocusMode] = useState(false);
  const [copyLinkDone, setCopyLinkDone] = useState(false);
  const navigate = useNavigate();
  const { noteId } = useParams();
  const {
    notes,
    folders,
    updateNote,
    togglePinNote,
    deleteNote,
    addNote,
    resolveWikiLink,
  } = useNotes();

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

  const handleNavigateWikiLink = (href: string) => {
    const parsed = parseWikiHref(href);
    if (!parsed) return;

    const matched = resolveWikiLink(parsed.noteName);
    if (matched) {
      navigate(`/editor/${matched}`);
      return;
    }

    const created = addNote({
      title: parsed.noteName,
      folder: note?.folder,
      content: `# ${parsed.noteName}\n\n`,
    });
    navigate(`/editor/${created.id}`);
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
  const visibleProperties = Object.entries(note.properties).slice(0, 2);
  const noteMeta = new Date(note.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (focusMode) {
    return (
      <div className="h-screen bg-card flex flex-col">
        {/* Minimal focus mode header */}
        <header className="flex items-center justify-between border-b border-border/50 px-5 py-3">
          <button
            type="button"
            aria-label="Exit focus mode"
            onClick={() => setFocusMode(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Minimize2 className="w-4 h-4" />
            Exit Focus Mode
          </button>
          <div className="text-xs text-muted-foreground">Edited {noteMeta}</div>
        </header>

        {/* Focus mode editor */}
        <div
          data-cy="ewe-note-focus-mode-active"
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto px-6 py-8">
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
    <WorkspaceShell
      selectedNoteId={note.id}
      metadataSlot={<RightPanel noteId={note.id} />}
    >
      <EditorWorkspace
        note={note}
        folderName={folder?.name || 'Notes'}
        noteMeta={noteMeta}
        visibleProperties={visibleProperties}
        onUpdateTitle={(title) => updateNote(note.id, { title })}
        onCopyLink={handleCopyLink}
        copyLinkDone={copyLinkDone}
        onDuplicate={handleDuplicate}
        onExport={handleExport}
        onDelete={() => {
          if (confirm('Are you sure you want to delete this note?')) {
            deleteNote(note.id);
            navigate('/');
          }
        }}
        onTogglePin={() => togglePinNote(note.id)}
        onNavigateHome={() => navigate('/')}
        onFocusMode={() => setFocusMode(true)}
        editorRoom={editorRoom}
        onNavigateWikiLink={handleNavigateWikiLink}
      />
    </WorkspaceShell>
  );
}

function EditorWorkspace({
  note,
  folderName,
  noteMeta,
  visibleProperties,
  onUpdateTitle,
  onCopyLink,
  copyLinkDone,
  onDuplicate,
  onExport,
  onDelete,
  onTogglePin,
  onNavigateHome,
  onFocusMode,
  editorRoom,
  onNavigateWikiLink,
}: {
  note: Note;
  folderName: string;
  noteMeta: string;
  visibleProperties: [string, string][];
  onUpdateTitle: (title: string) => void;
  onCopyLink: () => void;
  copyLinkDone: boolean;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onNavigateHome: () => void;
  onFocusMode: () => void;
  editorRoom: ReturnType<typeof useDb>['selectedRoom'];
  onNavigateWikiLink: (href: string) => void;
}) {
  const { metadataVisible, setMetadataVisible } = useWorkspaceShell();

  return (
    <main className="flex h-screen min-w-0 flex-col overflow-hidden bg-[oklch(0.145_0.01_95)]">
      <header
        data-cy="ewe-note-header"
        className="border-b border-white/6 bg-[oklch(0.155_0.01_95)]/92 px-6 py-5 backdrop-blur"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                aria-label="Back to all notes"
                onClick={onNavigateHome}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="max-w-[18rem] truncate" title={folderName}>
                  {folderName}
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{noteMeta}</span>
              </div>
            </div>

            <input
              aria-label="Note title"
              value={note.title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              className="w-full bg-transparent text-[2rem] font-semibold tracking-[-0.035em] text-foreground outline-none placeholder:text-muted-foreground md:text-[2.4rem]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={
                metadataVisible ? 'Close note info' : 'Open note info'
              }
              data-cy="ewe-note-info-panel-toggle"
              onClick={() => setMetadataVisible(!metadataVisible)}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
              title={metadataVisible ? 'Close note info' : 'Open note info'}
            >
              {metadataVisible ? (
                <SidebarClose className="w-4 h-4" />
              ) : (
                <SidebarOpen className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              aria-label="Enter focus mode"
              data-cy="ewe-note-focus-mode"
              onClick={onFocusMode}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
              title="Focus Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
              onClick={onTogglePin}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
              title={note.pinned ? 'Unpin note' : 'Pin note'}
            >
              <Star
                className={`w-4 h-4 ${
                  note.pinned ? 'fill-current text-primary' : ''
                }`}
              />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open note actions"
                  data-cy="ewe-note-editor-menu-trigger"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  data-cy="ewe-note-copy-link"
                  onClick={onCopyLink}
                >
                  {copyLinkDone ? (
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  {copyLinkDone ? 'Copied!' : 'Copy Link'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="ewe-note-duplicate"
                  onClick={onDuplicate}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem data-cy="ewe-note-export" onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-cy="ewe-note-delete-note"
                  className="text-destructive"
                  onClick={onDelete}
                >
                  Delete Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex min-h-7 flex-wrap items-center gap-2 pl-11">
          {note.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="rounded-full bg-white/6 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              <Hash className="mr-0.5 h-3 w-3" />
              {tag}
            </Badge>
          ))}
          {visibleProperties.map(([key, value]) => (
            <Badge
              key={key}
              variant="outline"
              className="rounded-full border-white/8 bg-transparent px-2.5 py-0.5 text-[11px] font-normal text-muted-foreground"
            >
              {key}: {value}
            </Badge>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[oklch(0.14_0.008_95)]">
        <div className="mx-auto max-w-[52rem] px-6 py-8 md:px-10">
          {editorRoom ? (
            <Editor
              selectedRoom={editorRoom}
              selectedNoteId={note.id}
              showFrontmatterEditor={false}
              onNavigateWikiLink={onNavigateWikiLink}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
