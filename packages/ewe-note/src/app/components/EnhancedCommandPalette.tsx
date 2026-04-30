import { useState, useEffect, useCallback } from 'react';
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
import { useNotes } from '../contexts/NotesContext';
import { TemplatesDialog } from './TemplatesDialog';

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

  const handleSelectNote = (noteId: string) => {
    navigate(`/editor/${noteId}`);
    onOpenChange(false);
    setSearch('');
  };

  const recentNotes = getRecentNotes(5);
  const searchResults = search ? searchNotes(search) : [];

  if (!open) return null;

  return (
    <>
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
                            {folders.find((f) => f.id === note.folder)?.name}
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

              {/* Create new note - show after matches so search retrieval wins by default */}
              {search && (
                <Command.Group className="mt-3">
                  <Command.Item
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
                      onSelect={handleNewNote}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                      <div className="flex-1">
                        <div className="text-[15px] font-medium">New Note</div>
                      </div>
                      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        ⌘N
                      </kbd>
                    </Command.Item>
                    <Command.Item
                      data-cy="ewe-note-browse-templates"
                      onSelect={() => {
                        onOpenChange(false);
                        setTemplatesOpen(true);
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
                        onSelect={() => handleSelectNote(note.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] truncate font-medium">
                            {note.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {folders.find((f) => f.id === note.folder)?.name}
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
      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
    </>
  );
}
