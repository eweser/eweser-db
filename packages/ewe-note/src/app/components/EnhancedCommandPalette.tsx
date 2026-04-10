import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import {
  Search,
  FileText,
  Clock,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';

interface EnhancedCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedCommandPalette({ open, onOpenChange }: EnhancedCommandPaletteProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const {
    notes,
    folders,
    addNote,
    searchNotes,
    getRecentNotes,
  } = useNotes();

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
  }, [open, onOpenChange]);

  // Reset search when opening
  useEffect(() => {
    if (open) {
      setSearch('');
    }
  }, [open]);

  const handleNewNote = (customTitle?: string) => {
    const newNote = addNote({
      title: customTitle || 'Untitled',
      content: customTitle ? `# ${customTitle}\n\n` : '',
      folder: 'personal',
    });
    if (newNote) {
      navigate(`/editor/${newNote.id}`);
      onOpenChange(false);
      setSearch('');
    }
  };

  const handleSelectNote = (noteId: string) => {
    navigate(`/editor/${noteId}`);
    onOpenChange(false);
    setSearch('');
  };

  const recentNotes = getRecentNotes(5);
  const searchResults = search ? searchNotes(search) : [];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-2xl px-4">
        <Command
          className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/50">
            <Search className="w-5 h-5 text-primary" />
            <Command.Input
              value={search}
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
            {/* Create new note - always show when searching */}
            {search && (
              <div className="mb-3">
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
                      Press Enter to create new note
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                </Command.Item>
              </div>
            )}

            {/* Search Results */}
            {search && searchResults.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>{searchResults.length} {searchResults.length === 1 ? 'Result' : 'Results'}</span>
                </div>
                <div className="space-y-1">
                  {searchResults.map((note) => (
                    <Command.Item
                      key={note.id}
                      onSelect={() => handleSelectNote(note.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] truncate font-medium">{note.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {folders.find((f) => f.id === note.folder)?.name}
                          </span>
                          {note.tags.length > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <div className="flex gap-1">
                                {note.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs text-primary/70"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Command.Item>
                  ))}
                </div>
              </>
            )}

            {/* No search - show quick actions and recent */}
            {!search && (
              <>
                {/* Quick Actions */}
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Quick Actions</span>
                </div>
                <div className="space-y-1 mb-4">
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
                </div>

                {/* Recent Notes */}
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-3">
                  <span>Recent</span>
                </div>
                <div className="space-y-1">
                  {recentNotes.map((note) => (
                    <Command.Item
                      key={note.id}
                      onSelect={() => handleSelectNote(note.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/70 data-[selected=true]:bg-accent transition-colors"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] truncate font-medium">{note.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {folders.find((f) => f.id === note.folder)?.name}
                        </div>
                      </div>
                    </Command.Item>
                  ))}
                </div>
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
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">↵</kbd>
              <span>Open</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}