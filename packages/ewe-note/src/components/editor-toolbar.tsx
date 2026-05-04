import type { Editor } from '@tiptap/react';
import {
  type EditorCommandContext,
  getCommandsByGroup,
} from '@/editor/commands';

interface EditorToolbarProps {
  editor: Editor;
  onSave: () => void;
  focused?: boolean;
  commandContext?: EditorCommandContext;
}

const buttonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/72 transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45 data-[active=true]:bg-accent data-[active=true]:text-foreground';

function CommandButton({
  command,
  editor,
  commandContext,
}: {
  command: ReturnType<typeof getCommandsByGroup>[number];
  editor: Editor;
  commandContext?: EditorCommandContext;
}) {
  const commandDisabled = !command.isEnabled(editor);

  return (
    <button
      type="button"
      aria-label={command.label}
      title={
        command.shortcut
          ? `${command.label} (${command.shortcut})`
          : command.label
      }
      data-active={
        command.id === 'source-mode'
          ? Boolean(commandContext?.sourceMode)
          : command.isActive(editor)
      }
      className={buttonClass}
      onClick={() => {
        if (commandDisabled) return;
        command.execute(editor, commandContext);
      }}
      disabled={commandDisabled}
    >
      <command.icon className="h-4 w-4" />
    </button>
  );
}

export function EditorToolbar({
  editor,
  onSave,
  focused = false,
  commandContext,
}: EditorToolbarProps) {
  const utilityCommands = getCommandsByGroup('utility').filter(
    (command) => command.id !== 'source-mode'
  );
  const sourceMode = Boolean(commandContext?.sourceMode);
  if (utilityCommands.length === 0) {
    return (
      <button type="button" className="sr-only" onClick={onSave}>
        Save
      </button>
    );
  }
  return (
    <div
      className={`tiptap-toolbar sticky top-3 z-10 mb-4 ml-auto flex w-fit items-center justify-end gap-1 rounded-2xl border border-border/40 bg-background/60 px-2 py-1.5 shadow-none backdrop-blur transition-all hover:bg-background/88 ${
        focused ? 'opacity-100' : 'opacity-82 hover:opacity-100'
      }`}
    >
      {sourceMode ? (
        <span
          data-cy="ewe-note-source-mode-toolbar-message"
          className="sr-only"
        >
          Source mode edits the raw Markdown. Rich-text commands are paused.
        </span>
      ) : null}

      <div className="flex shrink-0 items-center gap-1">
        {utilityCommands.map((command) => (
          <CommandButton
            key={command.id}
            command={command}
            editor={editor}
            commandContext={commandContext}
          />
        ))}
      </div>

      <button type="button" className="sr-only" onClick={onSave}>
        Save
      </button>
    </div>
  );
}
