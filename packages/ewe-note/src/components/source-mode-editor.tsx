import { Eye } from 'lucide-react';

interface SourceModeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExit: () => void;
}

export function SourceModeEditor({
  value,
  onChange,
  onExit,
}: SourceModeEditorProps) {
  return (
    <div className="source-mode-editor relative rounded-2xl border border-border/70 bg-card/35">
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex justify-end">
        <span className="sr-only">Source mode, raw Obsidian Markdown</span>
        <button
          type="button"
          aria-label="Return to rich editor"
          title="Return to rich editor"
          className="pointer-events-auto rounded-full border border-border/70 bg-background/70 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onExit}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
      <textarea
        data-cy="ewe-note-source-editor"
        aria-label="Raw Markdown source"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[55vh] w-full resize-y bg-transparent px-4 py-4 pr-16 font-mono text-sm leading-6 text-foreground outline-none"
      />
    </div>
  );
}
