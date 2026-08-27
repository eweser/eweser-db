import { memo, type ReactNode } from 'react';
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
  // body out of the typing path. Radix only renders the content's children
  // while the menu is open, so putting the items in their own component means
  // their `isEnabled` checks and elements are built on open rather than on
  // every keystroke.
  //
  // The content itself must stay mounted: conditionally mounting it makes the
  // menu miss the gesture that opened it and never appear.
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-72">
        <EditorContextMenuItems
          editor={editor}
          commandContext={commandContext}
        />
      </ContextMenuContent>
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
    <>
      <ContextMenuLabel>Format</ContextMenuLabel>
      {getCommandsByGroup('format').map((command) => (
        <ContextMenuItem
          key={command.id}
          onSelect={() => command.execute(editor, commandContext)}
          disabled={!command.isEnabled(editor)}
        >
          <command.icon className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{command.label}</span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted-foreground">
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
          <command.icon className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{command.label}</span>
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
          <command.icon className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{command.label}</span>
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
          <command.icon className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{command.label}</span>
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
          <command.icon className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{command.label}</span>
        </ContextMenuItem>
      ))}
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => editor.commands.undo()}>
        Undo
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.commands.redo()}>
        Redo
      </ContextMenuItem>
    </>
  );
});
