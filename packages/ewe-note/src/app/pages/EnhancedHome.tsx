import { useNavigate } from 'react-router';
import { ArrowRight, Clock3, FolderTree, Keyboard, Plus } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { useNotes } from '../contexts/NotesContext';
import { WORKSPACE_SHORTCUT_LABELS } from '../components/workspace-layout';

export function EnhancedHome() {
  const navigate = useNavigate();
  const { notes, folders, addNote, getRecentNotes } = useNotes();

  const handleNewNote = () => {
    const created = addNote({ title: 'Untitled', content: '' });
    navigate(`/editor/${created.id}`);
  };

  const recentNotes = getRecentNotes(5);

  return (
    <WorkspaceShell>
      <main className="flex h-screen min-w-0 items-center justify-center bg-[oklch(0.145_0.01_95)] px-8">
        <div className="w-full max-w-4xl">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <section className="rounded-[2rem] border border-white/6 bg-[oklch(0.16_0.01_95)] px-8 py-9 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                EweNote
              </div>
              <h1 className="mt-4 max-w-[10ch] text-5xl font-semibold tracking-[-0.05em] text-foreground">
                Quiet space, full note depth.
              </h1>
              <p className="mt-5 max-w-[42rem] text-base leading-7 text-muted-foreground">
                Obsidian-style linking, metadata, and organization, without a
                control-heavy writing surface. Pick a note from the library, or
                start a new one and stay in the text.
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

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Notes"
                  value={String(notes.length)}
                  icon={<Clock3 className="h-4 w-4" />}
                />
                <MetricCard
                  label="Folders"
                  value={String(folders.length)}
                  icon={<FolderTree className="h-4 w-4" />}
                />
                <MetricCard
                  label="Pane modes"
                  value="1 to 4"
                  icon={<Keyboard className="h-4 w-4" />}
                />
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/6 bg-[oklch(0.16_0.01_95)] px-6 py-7">
              <div className="text-sm font-medium text-foreground">
                Workspace shortcuts
              </div>
              <div className="mt-5 space-y-3">
                <ShortcutRow
                  shortcut={WORKSPACE_SHORTCUT_LABELS[1]}
                  label="Editor only"
                />
                <ShortcutRow
                  shortcut={WORKSPACE_SHORTCUT_LABELS[2]}
                  label="Notes list plus editor"
                />
                <ShortcutRow
                  shortcut={WORKSPACE_SHORTCUT_LABELS[3]}
                  label="Folders, notes list, editor"
                />
                <ShortcutRow
                  shortcut={WORKSPACE_SHORTCUT_LABELS[4]}
                  label="Open note metadata"
                />
              </div>

              <div className="mt-8 border-t border-white/6 pt-5">
                <div className="text-sm font-medium text-foreground">
                  Recent notes
                </div>
                <div className="mt-3 space-y-2">
                  {recentNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => navigate(`/editor/${note.id}`)}
                      className="w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <div className="truncate text-sm text-foreground">
                        {note.title}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </WorkspaceShell>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/6 bg-white/4 px-4 py-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
        {value}
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut, label }: { shortcut: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-white/4 px-4 py-3">
      <div className="text-sm text-foreground">{label}</div>
      <kbd className="rounded-full border border-white/8 px-3 py-1 font-mono text-[11px] text-muted-foreground">
        {shortcut}
      </kbd>
    </div>
  );
}
