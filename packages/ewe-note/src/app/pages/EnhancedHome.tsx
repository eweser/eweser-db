import { useNavigate } from 'react-router';
import { ArrowRight, FileText, Plus } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useNotes } from '../contexts/NotesContext';

export function EnhancedHome() {
  const navigate = useNavigate();
  const { notes, addNote, getRecentNotes } = useNotes();

  const handleNewNote = () => {
    const created = addNote({ title: 'Untitled', content: '' });
    navigate(`/editor/${created.id}`);
  };

  const recentNotes = getRecentNotes(5);

  return (
    <WorkspaceShell>
      <main className="flex h-full min-w-0 items-center justify-center overflow-y-auto bg-[oklch(0.145_0.01_95)] px-4 py-6 md:h-screen md:px-8">
        <div className="w-full max-w-4xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="px-1 py-2 md:px-4 md:py-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Library
              </div>
              <h1 className="mt-4 max-w-[12ch] text-4xl font-semibold tracking-[-0.03em] text-foreground md:text-5xl md:tracking-[-0.05em]">
                Pick up where you left off.
              </h1>
              <p className="mt-5 max-w-[42rem] text-base leading-7 text-muted-foreground">
                Your notes are local-first on this device. Open a recent note or
                start a blank page; links, folders, and metadata stay nearby
                without taking over the writing surface.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-cy="ewe-note-new-note"
                  onClick={handleNewNote}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-medium text-foreground transition-colors hover:bg-white/14"
                >
                  <Plus className="h-4 w-4" />
                  New note
                </button>
                {recentNotes[0] ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/editor/${recentNotes[0].id}`)}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/8 px-5 text-sm text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
                  >
                    Resume recent
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </section>

            <section className="border-l border-white/6 px-1 py-2 md:px-5 md:py-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Recent
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNewNote}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
                  aria-label="New note"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-1">
                {recentNotes.length > 0 ? (
                  recentNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => navigate(`/editor/${note.id}`)}
                      className="group w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground transition-colors group-hover:text-foreground">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">
                            {note.title}
                          </div>
                          <div className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {stripMarkdown(note.content) || 'Blank note'}
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/6 px-4 py-8 text-center">
                    <div className="text-sm font-medium text-foreground">
                      No recent notes
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Create a note and it will appear here first.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </WorkspaceShell>
  );
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/^#.*$/gm, '')
    .replace(/\[\[|\]\]/g, '')
    .replace(/[*_`>#-]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}
