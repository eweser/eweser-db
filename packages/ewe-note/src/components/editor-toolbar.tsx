import type { Editor } from '@tiptap/react';
import { ChevronDown } from 'lucide-react';
import {
  type CommandGroupName,
  getCommandsByGroup,
  type EditorCommand,
  type EditorCommandContext,
} from '@/editor/commands';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EditorToolbarProps {
  editor: Editor;
  onSave: () => void;
  focused?: boolean;
  commandContext?: EditorCommandContext;
}

const buttonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground';

const triggerClass =
  'inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground';

function CommandButton({
  command,
  editor,
  commandContext,
}: {
  command: EditorCommand;
  editor: Editor;
  commandContext?: EditorCommandContext;
}) {
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
      onClick={() => command.execute(editor, commandContext)}
      disabled={!command.isEnabled(editor)}
    >
      <command.icon className="h-4 w-4" />
    </button>
  );
}

function CommandMenu({
  label,
  commands,
  editor,
  commandContext,
}: {
  label: string;
  commands: EditorCommand[];
  editor: Editor;
  commandContext?: EditorCommandContext;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={triggerClass}>
          <span>{label}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {commands.map((command) => (
          <div key={command.id}>
            <DropdownMenuItem
              onSelect={() => command.execute(editor, commandContext)}
              disabled={!command.isEnabled(editor)}
              className="gap-3"
            >
              <command.icon className="h-4 w-4" />
              <span>{command.label}</span>
              {command.shortcut ? (
                <DropdownMenuShortcut>{command.shortcut}</DropdownMenuShortcut>
              ) : null}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EditorToolbar({
  editor,
  onSave,
  focused = false,
  commandContext,
}: EditorToolbarProps) {
  const grouped: Record<CommandGroupName, EditorCommand[]> = {
    paragraph: getCommandsByGroup('paragraph'),
    format: getCommandsByGroup('format'),
    list: getCommandsByGroup('list'),
    insert: getCommandsByGroup('insert'),
    document: getCommandsByGroup('document'),
    utility: getCommandsByGroup('utility'),
  };
  const quickFormat = grouped.format.filter((command) =>
    ['bold', 'italic', 'highlight', 'code'].includes(command.id)
  );
  const quickLists = grouped.list.filter((command) =>
    ['bullet-list', 'task-list'].includes(command.id)
  );
  const quickActions = [...quickFormat, ...quickLists];

  return (
    <div
      className={`tiptap-toolbar sticky top-3 z-10 mb-6 flex flex-wrap items-center justify-start gap-2 rounded-2xl border border-border/40 bg-background/55 px-2.5 py-1.5 shadow-none backdrop-blur transition-all hover:bg-background/90 sm:justify-between ${
        focused ? 'opacity-95' : 'opacity-60 hover:opacity-95'
      }`}
    >
      <span className="sr-only">Editor toolbar</span>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <CommandMenu
          label="Text"
          commands={grouped.paragraph}
          editor={editor}
          commandContext={commandContext}
        />
        <CommandMenu
          label="Insert"
          commands={grouped.insert}
          editor={editor}
          commandContext={commandContext}
        />
        <CommandMenu
          label="Lists"
          commands={grouped.list}
          editor={editor}
          commandContext={commandContext}
        />
        <div className="ml-1 hidden items-center gap-1 sm:flex">
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          {quickActions.map((command) => (
            <CommandButton
              key={command.id}
              command={command}
              editor={editor}
              commandContext={commandContext}
            />
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {grouped.utility.map((command, index) => (
          <div key={command.id} className="flex items-center gap-1">
            {index === 0 ? (
              <span className="mr-1 h-4 w-px bg-border" aria-hidden="true" />
            ) : null}
            <CommandButton
              command={command}
              editor={editor}
              commandContext={commandContext}
            />
          </div>
        ))}
      </div>

      <button type="button" className="sr-only" onClick={onSave}>
        Save
      </button>
    </div>
  );
}
