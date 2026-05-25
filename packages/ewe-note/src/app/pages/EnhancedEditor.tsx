import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Star,
  MoreHorizontal,
  Maximize2,
  FolderOpen,
  Link2,
  Minimize2,
  SidebarClose,
  SidebarOpen,
  Copy,
  Download,
  Check,
  FolderInput,
  FileCode,
  Eye,
} from 'lucide-react';
import { RightPanel } from '../components/RightPanel';
import { useNotes } from '../contexts/NotesContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import Editor from '@/components/editor';
import { useDb } from '@/db';
import { slugHeading } from '@/editor/markdown';
import { parseWikiHref, type WikiLinkResolution } from '@/extensions/wiki-link';
import {
  WorkspaceShell,
  useWorkspaceShell,
} from '../components/WorkspaceShell';
import type { Note } from '../contexts/NotesContext';
import { useIsMobile } from '../components/ui/use-mobile';

export function buildEditorWikiLinkPath(
  noteId: string,
  parsed: WikiLinkResolution
) {
  const hashTarget = parsed.blockRef
    ? `^${parsed.blockRef}`
    : parsed.heading
      ? slugHeading(parsed.heading)
      : '';

  return hashTarget
    ? `/editor/${noteId}#${encodeURIComponent(hashTarget)}`
    : `/editor/${noteId}`;
}

export function EnhancedEditor() {
  const [focusMode, setFocusMode] = useState(false);
  const [copyLinkState, setCopyLinkState] = useState<
    'idle' | 'copied' | 'failed'
  >('idle');
  const [sourceMode, setSourceMode] = useState(false);
  const navigate = useNavigate();
  const { noteId } = useParams();
  const {
    notes,
    folders,
    updateNote,
    togglePinNote,
    deleteNote,
    addNote,
    moveNote,
    resolveWikiLink,
  } = useNotes();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLinkState('copied');
      setTimeout(() => setCopyLinkState('idle'), 2000);
    } catch {
      setCopyLinkState('failed');
    }
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
      navigate(buildEditorWikiLinkPath(matched, parsed));
      return;
    }

    const created = addNote({
      title: parsed.noteName,
      folder: note?.folder,
      content: `# ${parsed.noteName}\n\n`,
    });
    navigate(buildEditorWikiLinkPath(created.id, parsed));
  };
  const { allRooms, selectedRoom, setSelectedRoom, setSelectedNoteId } =
    useDb();

  const note = notes.find((n) => n.id === noteId);
  const noteRoom = useMemo(
    () => allRooms.find((room) => room.id === note?.roomId) ?? null,
    [allRooms, note?.roomId]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier || event.altKey || event.shiftKey) {
        return;
      }

      if (event.code !== 'Digit1' && event.key !== '1') {
        return;
      }

      if (!noteId) return;

      event.preventDefault();
      event.stopPropagation();
      setFocusMode(true);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [noteId]);

  useEffect(() => {
    if (!note || !noteRoom) return;
    if (selectedRoom?.id !== noteRoom.id) {
      setSelectedRoom(noteRoom);
    }
    setSelectedNoteId(note.id);
  }, [note, noteRoom, selectedRoom?.id, setSelectedNoteId, setSelectedRoom]);

  if (!note) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
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

  const editorRoom = noteRoom ?? selectedRoom;
  if (focusMode) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <header className="pointer-events-none fixed right-4 top-4 z-30 flex items-center gap-1">
          <button
            type="button"
            aria-label="Exit focus mode"
            onClick={() => setFocusMode(false)}
            className="pointer-events-auto rounded-full border border-border/60 bg-card/92 p-2 text-muted-foreground shadow-lg shadow-black/15 transition-colors hover:bg-accent hover:text-foreground"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </header>

        <div
          data-cy="ewe-note-focus-mode-active"
          className="flex-1 overflow-y-auto bg-background"
        >
          <div className="mx-auto max-w-[46rem] px-7 py-8 md:px-10 md:py-10">
            {editorRoom ? (
              <Editor
                selectedRoom={editorRoom}
                selectedNoteId={note.id}
                showFrontmatterEditor={false}
                sourceMode={sourceMode}
                onSourceModeChange={setSourceMode}
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
      metadataSlot={<EditorMetadataPanel noteId={note.id} />}
    >
      <EditorWorkspace
        note={note}
        onUpdateTitle={(title) => updateNote(note.id, { title })}
        onCopyLink={handleCopyLink}
        copyLinkState={copyLinkState}
        onDuplicate={handleDuplicate}
        onExport={handleExport}
        onDelete={() => {
          if (confirm('Are you sure you want to delete this note?')) {
            deleteNote(note.id);
            navigate('/');
          }
        }}
        folders={folders}
        onMoveNote={(targetFolder) => moveNote(note.id, targetFolder)}
        onTogglePin={() => togglePinNote(note.id)}
        onFocusMode={() => setFocusMode(true)}
        editorRoom={editorRoom}
        onNavigateWikiLink={handleNavigateWikiLink}
        sourceMode={sourceMode}
        onSourceModeChange={setSourceMode}
      />
    </WorkspaceShell>
  );
}

function EditorMetadataPanel({ noteId }: { noteId: string }) {
  const { setMetadataVisible } = useWorkspaceShell();
  return (
    <RightPanel noteId={noteId} onClose={() => setMetadataVisible(false)} />
  );
}

function EditorWorkspace({
  note,
  onUpdateTitle,
  onCopyLink,
  copyLinkState,
  onDuplicate,
  onExport,
  onDelete,
  folders,
  onMoveNote,
  onTogglePin,
  onFocusMode,
  editorRoom,
  onNavigateWikiLink,
  sourceMode,
  onSourceModeChange,
}: {
  note: Note;
  onUpdateTitle: (title: string) => void;
  onCopyLink: () => void;
  copyLinkState: 'idle' | 'copied' | 'failed';
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  folders: Array<{ id: string; name: string; kind?: string }>;
  onMoveNote: (targetFolder: string) => void;
  onTogglePin: () => void;
  onFocusMode: () => void;
  editorRoom: ReturnType<typeof useDb>['selectedRoom'];
  onNavigateWikiLink: (href: string) => void;
  sourceMode: boolean;
  onSourceModeChange: (sourceMode: boolean) => void;
}) {
  const { metadataVisible, setMetadataVisible } = useWorkspaceShell();
  const isMobile = useIsMobile();
  const moveTargets = folders.filter(
    (folder) => folder.kind === 'folder' && folder.id !== note.folder
  );

  return (
    <main className="relative flex h-full min-w-0 flex-col overflow-hidden bg-background md:h-screen">
      <header
        data-cy="ewe-note-header"
        className={
          isMobile
            ? 'pointer-events-none fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2'
            : 'pointer-events-none fixed right-3 top-3 z-30 flex items-center gap-1 rounded-full border border-border/60 bg-card/88 p-1 shadow-lg shadow-black/10 backdrop-blur md:right-4 md:top-4'
        }
      >
        <input
          aria-label="Note title"
          value={note.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
        <div
          className={`pointer-events-auto flex shrink-0 items-center gap-0.5 ${
            isMobile
              ? 'flex-col rounded-3xl border border-border/60 bg-card/92 p-1.5 shadow-lg shadow-black/10 backdrop-blur'
              : ''
          }`}
        >
          {isMobile ? (
            <button
              type="button"
              aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
              onClick={onTogglePin}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={note.pinned ? 'Unpin note' : 'Pin note'}
            >
              <Star
                className={`w-4 h-4 ${
                  note.pinned ? 'fill-current text-primary' : ''
                }`}
              />
            </button>
          ) : (
            <button
              type="button"
              aria-label={
                metadataVisible ? 'Close note info' : 'Open note info'
              }
              data-cy="ewe-note-info-panel-toggle"
              onClick={() => setMetadataVisible(!metadataVisible)}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={metadataVisible ? 'Close note info' : 'Open note info'}
            >
              {metadataVisible ? (
                <SidebarClose className="w-4 h-4" />
              ) : (
                <SidebarOpen className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            type="button"
            aria-label="Enter focus mode"
            data-cy="ewe-note-focus-mode"
            onClick={onFocusMode}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Focus Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {!isMobile ? (
            <button
              type="button"
              aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
              onClick={onTogglePin}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={note.pinned ? 'Unpin note' : 'Pin note'}
            >
              <Star
                className={`w-4 h-4 ${
                  note.pinned ? 'fill-current text-primary' : ''
                }`}
              />
            </button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open note actions"
                data-cy="ewe-note-editor-menu-trigger"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSourceModeChange(!sourceMode)}>
                {sourceMode ? (
                  <Eye className="mr-2 h-4 w-4" />
                ) : (
                  <FileCode className="mr-2 h-4 w-4" />
                )}
                {sourceMode ? 'Return to rich editor' : 'Edit raw Markdown'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-cy="ewe-note-copy-link"
                onClick={onCopyLink}
              >
                {copyLinkState === 'copied' ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : copyLinkState === 'failed' ? (
                  <Link2 className="mr-2 h-4 w-4 text-destructive" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                {copyLinkState === 'copied'
                  ? 'Copied!'
                  : copyLinkState === 'failed'
                    ? 'Copy failed'
                    : 'Copy Link'}
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
              <DropdownMenuLabel>Move to folder</DropdownMenuLabel>
              <DropdownMenuItem
                data-cy="ewe-note-move-note-all"
                disabled={!note.folder}
                onClick={() => onMoveNote('')}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                All Notes
              </DropdownMenuItem>
              {moveTargets.slice(0, 8).map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  data-cy={`ewe-note-move-note-${folder.id}`}
                  onClick={() => onMoveNote(folder.id)}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  {folder.name}
                </DropdownMenuItem>
              ))}
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
      </header>

      <div className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-[48rem] px-5 py-5 pb-32 md:px-10 md:py-10">
          {editorRoom ? (
            <Editor
              selectedRoom={editorRoom}
              selectedNoteId={note.id}
              showFrontmatterEditor={false}
              onNavigateWikiLink={onNavigateWikiLink}
              sourceMode={sourceMode}
              onSourceModeChange={onSourceModeChange}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
