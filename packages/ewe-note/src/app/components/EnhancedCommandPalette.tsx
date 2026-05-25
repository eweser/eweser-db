import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import {
  Search,
  FileText,
  Clock,
  Plus,
  ArrowRight,
  FileCode,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useNotes } from '../contexts/NotesContext';
import { TemplatesDialog } from './TemplatesDialog';
import {
  getCommandsForPlacement,
  type EditorCommandContext,
} from '@/editor/commands';

interface EnhancedCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedCommandPalette({
  open,
  onOpenChange,
}: EnhancedCommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [activeEditor, setActiveEditor] = useState<{
    editor: Editor;
    commandContext?: EditorCommandContext;
  } | null>(null);
  const navigate = useNavigate();
  const { folders, addNote, searchNotes, getRecentNotes } = useNotes();

  const handleNewNote = useCallback(
    (customTitle?: string) => {
      const newNote = addNote({
        title: customTitle || 'Untitled',
        content: customTitle ? `# ${customTitle}\n\n` : '',
      });
      if (newNote) {
        navigate(`/editor/${newNote.id}`);
        onOpenChange(false);
        setSearch('');
      }
    },
    [addNote, navigate, onOpenChange]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !open) {
        e.preventDefault();
        handleNewNote();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange, handleNewNote]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      return;
    }

    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
      setSearch('');
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, onOpenChange]);

  useEffect(() => {
    const onEditorFocus = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          editor: Editor;
          commandContext?: EditorCommandContext;
        }>
      ).detail;
      if (!detail?.editor) return;
      setActiveEditor(detail);
    };

    window.addEventListener('ewe-note-editor-focus', onEditorFocus);
    return () => {
      window.removeEventListener('ewe-note-editor-focus', onEditorFocus);
    };
  }, []);

  const handleSelectNote = (noteId: string) => {
    navigate(`/editor/${noteId}`);
    onOpenChange(false);
    setSearch('');
  };

  const recentNotes = getRecentNotes(5);
  const searchResults = search ? searchNotes(search) : [];
  const normalizedSearch = search.toLowerCase().trim();
  const commandSearch =
    normalizedSearch.startsWith('/') || normalizedSearch.startsWith('>');
  const commandQuery = commandSearch
    ? normalizedSearch.replace(/^[/>\s]+/, '')
    : normalizedSearch;
  const editorCommands =
    activeEditor && commandSearch
      ? getCommandsForPlacement('palette').filter((command) =>
          [command.label, command.description, ...command.slashTrigger]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(commandQuery)
        )
      : [];

  if (!open && !templatesOpen) return null;

  return (
    <>
      {open ? (
        <div
          data-cy="ewe-note-command-palette"
          className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <div className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-2xl px-4">
            <Command
              shouldFilter={false}
              className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/50">
                <Search className="w-5 h-5 text-primary" />
                <Command.Input
                  data-cy="ewe-note-command-input"
                  onValueChange={setSearch}
                  placeholder="Search or create note..."
                  className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded-md border border-border bg-muted px-2 font-mono text-[11px] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-3">
                {/* Search Results */}
                {search && searchResults.length > 0 && (
                  <Command.Group
                    heading={`${searchResults.length} ${searchResults.length === 1 ? 'Result' : 'Results'}`}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                  >
                    {searchResults.map((note) => (
                      <Command.Item
                        key={note.id}
                        value={`note:${note.id}:${note.title}`}
                        onSelect={() => handleSelectNote(note.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] truncate font-medium">
                            {note.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {getNoteLocationLabel(note, folders)}
                            </span>
                            {note.tags.length > 0 && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                {note.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs text-primary/70"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {activeEditor && commandSearch && editorCommands.length > 0 && (
                  <Command.Group
                    heading="Editor Commands"
                    className="mb-4 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                  >
                    {editorCommands.slice(0, 12).map((command) => (
                      <Command.Item
                        key={command.id}
                        value={`editor-command:${command.id}`}
                        onSelect={() => {
                          command.execute(
                            activeEditor.editor,
                            activeEditor.commandContext
                          );
                          onOpenChange(false);
                          setSearch('');
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                      >
                        <command.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] truncate font-medium">
                            {command.label}
                          </div>
                          {command.description ? (
                            <div className="text-xs text-muted-foreground truncate">
                              {command.description}
                            </div>
                          ) : null}
                        </div>
                        {command.shortcut ? (
                          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            {command.shortcut}
                          </kbd>
                        ) : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {activeEditor &&
                  commandSearch &&
                  editorCommands.length === 0 && (
                    <div className="px-3 py-6 text-sm text-muted-foreground">
                      No editor command matches "{commandQuery}".
                    </div>
                  )}

                {/* Create new note - show after matches so search retrieval wins by default */}
                {search && (
                  <Command.Group className="mt-3">
                    <Command.Item
                      value={`create-note:${normalizedSearch}`}
                      onSelect={() => handleNewNote(search)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-lg cursor-pointer bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all data-[selected=true]:bg-primary/10 data-[selected=true]:border-primary/30"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <Plus className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[15px] truncate">
                          Create "{search}"
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Press Enter to create a new note
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                    </Command.Item>
                  </Command.Group>
                )}

                {/* No search - show quick actions and recent */}
                {!search && (
                  <>
                    <Command.Group
                      heading="Quick Actions"
                      className="mb-4 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                    >
                      <Command.Item
                        value="action:new-note"
                        onSelect={handleNewNote}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                      >
                        <Plus className="w-4 h-4 text-primary" />
                        <div className="flex-1">
                          <div className="text-[15px] font-medium">
                            New Note
                          </div>
                        </div>
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                          ⌘N
                        </kbd>
                      </Command.Item>
                      <Command.Item
                        data-cy="ewe-note-browse-templates"
                        value="action:browse-templates"
                        onSelect={() => {
                          setTemplatesOpen(true);
                          onOpenChange(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                      >
                        <FileCode className="w-4 h-4 text-primary" />
                        <div className="flex-1">
                          <div className="text-[15px] font-medium">
                            Browse Templates
                          </div>
                        </div>
                      </Command.Item>
                    </Command.Group>

                    <Command.Group
                      heading="Recent"
                      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                    >
                      {recentNotes.map((note) => (
                        <Command.Item
                          key={note.id}
                          value={`recent-note:${note.id}:${note.title}`}
                          onSelect={() => handleSelectNote(note.id)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                        >
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] truncate font-medium">
                              {note.title}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {getNoteLocationLabel(note, folders)}
                            </div>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  </>
                )}

                <Command.Empty className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Search className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      No notes found
                    </div>
                  </div>
                </Command.Empty>
              </Command.List>

              {/* Footer hint */}
              <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">
                    ↑↓
                  </kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">
                    ↵
                  </kbd>
                  <span>Open</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">
                    Esc
                  </kbd>
                  <span>Close</span>
                </div>
              </div>
            </Command>
          </div>
        </div>
      ) : null}
      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
    </>
  );
}

function getNoteLocationLabel(
  note: { folder: string; sourcePath?: string },
  folders: Array<{ id: string; name: string }>
) {
  return (
    note.sourcePath ?? folders.find((folder) => folder.id === note.folder)?.name
  );
}
