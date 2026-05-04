import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useNotes } from '../contexts/NotesContext';

export function EnhancedHome() {
  const navigate = useNavigate();
  const { addNote } = useNotes();

  const handleNewNote = () => {
    const created = addNote({ title: 'Untitled', content: '' });
    navigate(`/editor/${created.id}`);
  };

  return (
    <WorkspaceShell>
      <main className="relative h-full min-w-0 overflow-hidden bg-background md:h-screen">
        <button
          type="button"
          data-cy="ewe-note-new-note"
          onClick={handleNewNote}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/90 text-foreground shadow-lg shadow-black/10 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="New note"
          title="New note"
        >
          <Plus className="h-4 w-4" />
        </button>
      </main>
    </WorkspaceShell>
  );
}
