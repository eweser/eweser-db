import { memo, useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/app/components/ui/context-menu';
import {
  getCommandsByGroup,
  type EditorCommandContext,
} from '@/editor/commands';

interface EditorContextMenuProps {
  editor: Editor;
  children: ReactNode;
  commandContext?: EditorCommandContext;
}

export function EditorContextMenu({
  editor,
  children,
  commandContext,
}: EditorContextMenuProps) {
  // The editor re-renders on every ProseMirror transaction, so keep the menu
  // body out of the typing path. Items are built when the menu opens, which is
  // also the only moment their `isEnabled` state can be seen.
  const [open, setOpen] = useState(false);

  return (
    <ContextMenu onOpenChange={setOpen}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      {open ? (
        <EditorContextMenuItems
          editor={editor}
          commandContext={commandContext}
        />
      ) : null}
    </ContextMenu>
  );
}

const EditorContextMenuItems = memo(function EditorContextMenuItems({
  editor,
  commandContext,
}: {
  editor: Editor;
  commandContext?: EditorCommandContext;
}) {
  return (
    <ContextMenuContent className="w-56">
      <ContextMenuLabel>Format</ContextMenuLabel>
      {getCommandsByGroup('format').map((command) => (
        <ContextMenuItem
          key={command.id}
          onSelect={() => command.execute(editor, commandContext)}
          disabled={!command.isEnabled(editor)}
        >
          <command.icon className="mr-2 h-4 w-4" />
          <span>{command.label}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {command.shortcut ?? ''}
          </span>
        </ContextMenuItem>
      ))}
      <ContextMenuSeparator />
      <ContextMenuLabel>Paragraph</ContextMenuLabel>
      {getCommandsByGroup('paragraph').map((command) => (
        <ContextMenuItem
          key={command.id}
          onSelect={() => command.execute(editor, commandContext)}
          disabled={!command.isEnabled(editor)}
        >
          <command.icon className="mr-2 h-4 w-4" />
          <span>{command.label}</span>
        </ContextMenuItem>
      ))}
      <ContextMenuSeparator />
      <ContextMenuLabel>Lists</ContextMenuLabel>
      {getCommandsByGroup('list').map((command) => (
        <ContextMenuItem
          key={command.id}
          onSelect={() => command.execute(editor, commandContext)}
          disabled={!command.isEnabled(editor)}
        >
          <command.icon className="mr-2 h-4 w-4" />
          <span>{command.label}</span>
        </ContextMenuItem>
      ))}
      <ContextMenuSeparator />
      <ContextMenuLabel>Insert</ContextMenuLabel>
      {getCommandsByGroup('insert').map((command) => (
        <ContextMenuItem
          key={command.id}
          onSelect={() => command.execute(editor, commandContext)}
          disabled={!command.isEnabled(editor)}
        >
          <command.icon className="mr-2 h-4 w-4" />
          <span>{command.label}</span>
        </ContextMenuItem>
      ))}
      <ContextMenuSeparator />
      <ContextMenuLabel>View</ContextMenuLabel>
      {getCommandsByGroup('utility').map((command) => (
        <ContextMenuItem
          key={command.id}
          onSelect={() => command.execute(editor, commandContext)}
          disabled={!command.isEnabled(editor)}
        >
          <command.icon className="mr-2 h-4 w-4" />
          <span>{command.label}</span>
        </ContextMenuItem>
      ))}
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => editor.commands.undo()}>
        Undo
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.commands.redo()}>
        Redo
      </ContextMenuItem>
    </ContextMenuContent>
  );
});
