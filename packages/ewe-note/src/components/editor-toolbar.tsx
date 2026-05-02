import type { Editor } from '@tiptap/react';
import { ChevronDown } from 'lucide-react';
import {
  type CommandGroupName,
  getCommandsByGroup,
  type EditorCommand,
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
}

const buttonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground';

const triggerClass =
  'inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

function CommandButton({
  command,
  editor,
}: {
  command: EditorCommand;
  editor: Editor;
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
      data-active={command.isActive(editor)}
      className={buttonClass}
      onClick={() => command.execute(editor)}
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
}: {
  label: string;
  commands: EditorCommand[];
  editor: Editor;
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
              onSelect={() => command.execute(editor)}
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
      className={`tiptap-toolbar sticky top-3 z-10 mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/92 px-3 py-2 shadow-sm backdrop-blur transition-all ${
        focused ? 'opacity-100' : 'opacity-80'
      }`}
    >
      <span className="sr-only">Editor toolbar</span>
      <div className="flex min-w-0 items-center gap-1">
        <CommandMenu
          label="Text"
          commands={grouped.paragraph}
          editor={editor}
        />
        <CommandMenu label="Insert" commands={grouped.insert} editor={editor} />
        <CommandMenu label="Lists" commands={grouped.list} editor={editor} />
        <div className="ml-1 hidden items-center gap-1 sm:flex">
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          {quickActions.map((command) => (
            <CommandButton key={command.id} command={command} editor={editor} />
          ))}
        </div>
      </div>

      <div className="hidden items-center gap-1 md:flex">
        {grouped.utility.map((command, index) => (
          <div key={command.id} className="flex items-center gap-1">
            {index === 0 ? (
              <span className="mr-1 h-4 w-px bg-border" aria-hidden="true" />
            ) : null}
            <CommandButton command={command} editor={editor} />
          </div>
        ))}
      </div>

      <button type="button" className="sr-only" onClick={onSave}>
        Save
      </button>
    </div>
  );
}
