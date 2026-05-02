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
    <div className="source-mode-editor rounded-xl border border-border bg-card/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div>
          <div className="text-sm font-medium text-foreground">Source mode</div>
          <div className="text-xs text-muted-foreground">
            Raw Obsidian Markdown
          </div>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onExit}
        >
          Live preview
        </button>
      </div>
      <textarea
        data-cy="ewe-note-source-editor"
        aria-label="Raw Markdown source"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[55vh] w-full resize-y bg-transparent px-4 py-4 font-mono text-sm leading-6 text-foreground outline-none"
      />
    </div>
  );
}
