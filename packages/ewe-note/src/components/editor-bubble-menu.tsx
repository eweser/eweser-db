import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  getCommandById,
  type EditorCommandContext,
  type EditorCommandId,
} from '@/editor/commands';

interface BubbleMenuPosition {
  x: number;
  y: number;
}

interface EditorBubbleMenuProps {
  editor: Editor;
  children?: ReactNode;
  commandContext?: EditorCommandContext;
}

const FORMAT_COMMAND_IDS: EditorCommandId[] = [
  'bold',
  'italic',
  'strikethrough',
  'highlight',
  'code',
];

const positionForSelection = (editor: Editor): BubbleMenuPosition => {
  const selection = editor.state.selection;
  const isEmpty = selection.empty;
  if (!isEmpty) {
    const start = editor.view.coordsAtPos(selection.from);
    const end = editor.view.coordsAtPos(selection.to);
    const left = (start.left + end.left) / 2;
    const top = Math.min(start.top, end.top) - 44;
    return { x: left, y: Math.max(top, 40) };
  }

  const caret = editor.view.coordsAtPos(selection.from);
  return { x: caret.left, y: Math.max(caret.top - 44, 40) };
};

export function EditorBubbleMenu({
  editor,
  children,
  commandContext,
}: EditorBubbleMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<BubbleMenuPosition>({ x: 0, y: 0 });

  const formatCommands = useMemo(
    () =>
      FORMAT_COMMAND_IDS.map((id) => getCommandById(id))
        .filter(Boolean)
        .filter((command) => command?.isEnabled(editor)),
    [editor]
  );

  const updateMenu = useCallback(() => {
    const hasSelection = !editor.state.selection.empty;
    const isTextSelection = editor.state.selection.content().size > 0;
    const shouldShow = hasSelection && isTextSelection;
    if (!shouldShow) {
      setVisible(false);
      return;
    }

    setPosition(positionForSelection(editor));
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    const onSelection = () => {
      window.requestAnimationFrame(updateMenu);
    };
    const onBlur = () => setVisible(false);

    editor.on('selectionUpdate', onSelection);
    editor.on('blur', onBlur);

    return () => {
      editor.off('selectionUpdate', onSelection);
      editor.off('blur', onBlur);
    };
  }, [editor, updateMenu]);

  return (
    <>
      {children}
      {visible ? (
        <div
          className="editor-bubble-menu pointer-events-none fixed z-20 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 shadow-lg shadow-black/10"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {formatCommands.map(
            (command) =>
              command && (
                <button
                  type="button"
                  key={command.id}
                  aria-label={command.label}
                  className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground"
                  onClick={() => command.execute(editor, commandContext)}
                  data-active={command.isActive(editor)}
                  disabled={!command.isEnabled(editor)}
                >
                  <command.icon className="h-4 w-4" />
                </button>
              )
          )}
        </div>
      ) : null}
    </>
  );
}
