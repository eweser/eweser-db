import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  getCommandById,
  getCommandsForPlacement,
  type EditorCommandContext,
  type EditorCommandId,
} from '@/editor/commands';
import { useIsMobile } from '@/app/components/ui/use-mobile';

interface BubbleMenuPosition {
  x: number;
  top: number;
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
  'link',
];

const VIEWPORT_PADDING = 20;
const SELECTION_MENU_GAP = 10;
const MENU_COLLISION_GAP = 12;
const MOBILE_TRAY_BOTTOM_OFFSET = 12;
const MOBILE_SELECTION_CLEARANCE = 16;

const selectionNodeIsInsideEditor = (
  editor: Editor,
  node: Node | null | undefined
) => {
  if (!node) return false;
  return editor.view.dom.contains(node);
};

const hasDomTextSelectionInEditor = (editor: Editor) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) return false;

  return (
    selectionNodeIsInsideEditor(editor, selection.anchorNode) &&
    selectionNodeIsInsideEditor(editor, selection.focusNode)
  );
};

const getSelectionViewportRect = (editor: Editor) => {
  const { from, to, head } = editor.state.selection;
  const headCoords = editor.view.coordsAtPos(head);
  const edgeCoords = editor.view.coordsAtPos(head === to ? from : to);
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const rects = range ? Array.from(range.getClientRects()) : [];
  const nonZeroRects = rects.filter(
    (rect) => rect.width > 0 && rect.height > 0
  );
  const domRect = nonZeroRects.at(-1) ?? range?.getBoundingClientRect();

  if (domRect && domRect.width > 0 && domRect.height > 0) {
    return {
      left: Math.min(headCoords.left, edgeCoords.left, domRect.left),
      right: Math.max(headCoords.right, edgeCoords.right, domRect.right),
      top: Math.min(headCoords.top, edgeCoords.top, domRect.top),
      bottom: Math.max(headCoords.bottom, edgeCoords.bottom, domRect.bottom),
      width: Math.max(
        Math.abs(headCoords.left - edgeCoords.left),
        domRect.width,
        1
      ),
      height: Math.max(
        Math.abs(headCoords.bottom - headCoords.top),
        domRect.height,
        1
      ),
    };
  }

  return {
    left: Math.min(headCoords.left, edgeCoords.left),
    right: Math.max(headCoords.right, edgeCoords.right),
    top: Math.min(headCoords.top, edgeCoords.top),
    bottom: Math.max(headCoords.bottom, edgeCoords.bottom),
    width: Math.max(Math.abs(headCoords.left - edgeCoords.left), 1),
    height: Math.max(Math.abs(headCoords.bottom - headCoords.top), 1),
  };
};

const getViewportCollisionRects = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.tiptap-toolbar'))
    .map((element) => element.getBoundingClientRect())
    .filter(
      (rect) =>
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
    );

const getMenuRect = (
  x: number,
  top: number,
  menuWidth: number,
  menuHeight: number
) => ({
  left: x - menuWidth / 2,
  right: x + menuWidth / 2,
  top,
  bottom: top + menuHeight,
});

const rectsOverlap = (
  first: ReturnType<typeof getMenuRect>,
  second: DOMRect,
  gap = MENU_COLLISION_GAP
) =>
  first.left < second.right + gap &&
  first.right > second.left - gap &&
  first.top < second.bottom + gap &&
  first.bottom > second.top - gap;

const positionForSelection = (
  editor: Editor,
  menuWidth = 0,
  menuHeight = 0
): BubbleMenuPosition => {
  const { head } = editor.state.selection;
  const headCoords = editor.view.coordsAtPos(head);
  const rect = getSelectionViewportRect(editor);

  if (rect && rect.width > 0 && rect.height > 0) {
    const anchorX = headCoords.left + (headCoords.right - headCoords.left) / 2;
    const maxX = Math.max(
      VIEWPORT_PADDING + menuWidth / 2,
      window.innerWidth - VIEWPORT_PADDING - menuWidth / 2
    );
    const clampedX = Math.min(
      Math.max(anchorX, VIEWPORT_PADDING + menuWidth / 2),
      maxX
    );
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const placeBelow = spaceBelow >= menuHeight + SELECTION_MENU_GAP;
    const placeAbove =
      !placeBelow && spaceAbove >= menuHeight + SELECTION_MENU_GAP;
    const placements: Array<'bottom' | 'top'> =
      placeBelow || !placeAbove ? ['bottom', 'top'] : ['top', 'bottom'];
    const collisionRects = getViewportCollisionRects();

    for (const placement of placements) {
      const top =
        placement === 'bottom'
          ? Math.min(
              rect.bottom + SELECTION_MENU_GAP,
              window.innerHeight - VIEWPORT_PADDING - menuHeight
            )
          : Math.max(
              rect.top - SELECTION_MENU_GAP - menuHeight,
              VIEWPORT_PADDING
            );
      const menuRect = getMenuRect(clampedX, top, menuWidth, menuHeight);

      if (
        !collisionRects.some((collisionRect) =>
          rectsOverlap(menuRect, collisionRect)
        )
      ) {
        return {
          x: clampedX,
          top,
        };
      }
    }

    const fallbackPlacement = placements[0] ?? 'bottom';
    return {
      x: clampedX,
      top:
        fallbackPlacement === 'bottom'
          ? Math.min(
              rect.bottom + SELECTION_MENU_GAP,
              window.innerHeight - VIEWPORT_PADDING - menuHeight
            )
          : Math.max(
              rect.top - SELECTION_MENU_GAP - menuHeight,
              VIEWPORT_PADDING
            ),
    };
  }

  const caret = editor.view.coordsAtPos(editor.state.selection.from);
  return {
    x: Math.min(
      Math.max(caret.left, VIEWPORT_PADDING + menuWidth / 2),
      Math.max(
        VIEWPORT_PADDING + menuWidth / 2,
        window.innerWidth - VIEWPORT_PADDING - menuWidth / 2
      )
    ),
    top: Math.min(
      caret.bottom + SELECTION_MENU_GAP,
      window.innerHeight - VIEWPORT_PADDING - menuHeight
    ),
  };
};

export function EditorBubbleMenu({
  editor,
  children,
  commandContext,
}: EditorBubbleMenuProps) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<BubbleMenuPosition>({
    x: 0,
    top: 0,
  });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);

  const quickCommands = useMemo(
    () =>
      FORMAT_COMMAND_IDS.map((id) => getCommandById(id))
        .filter(Boolean)
        .filter((command) => command?.isEnabled(editor)),
    [editor]
  );

  const trayCommands = useMemo(
    () =>
      getCommandsForPlacement('context').filter(
        (command) =>
          command.id !== 'source-mode' &&
          command.id !== 'external-link' &&
          command.isEnabled(editor)
      ),
    [editor]
  );

  const updateMenu = useCallback(() => {
    const hasEditorSelection =
      !editor.state.selection.empty &&
      editor.state.selection.content().size > 0;
    const shouldShow =
      hasEditorSelection || hasDomTextSelectionInEditor(editor);
    if (!shouldShow) {
      setVisible(false);
      return;
    }

    setPosition(
      positionForSelection(
        editor,
        menuRef.current?.offsetWidth ?? 0,
        menuRef.current?.offsetHeight ?? 0
      )
    );
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    if (!visible) return;
    const handleViewportChange = () => {
      setPosition(
        positionForSelection(
          editor,
          menuRef.current?.offsetWidth ?? 0,
          menuRef.current?.offsetHeight ?? 0
        )
      );
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [editor, visible]);

  useEffect(() => {
    if (!visible || !isMobile || !trayRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      const rect = getSelectionViewportRect(editor);
      const trayRect = trayRef.current?.getBoundingClientRect();
      if (!trayRect) return;

      const visibleBottom =
        trayRect.top - MOBILE_SELECTION_CLEARANCE - MOBILE_TRAY_BOTTOM_OFFSET;
      const overlap = rect.bottom - visibleBottom;

      if (overlap > 0) {
        window.scrollBy({
          top: overlap,
          left: 0,
          behavior: 'instant',
        });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [editor, isMobile, quickCommands.length, visible]);

  useEffect(() => {
    if (!visible || !menuRef.current) return;
    setPosition(
      positionForSelection(
        editor,
        menuRef.current.offsetWidth,
        menuRef.current.offsetHeight
      )
    );
  }, [editor, quickCommands.length, visible]);

  useEffect(() => {
    const onSelection = () => {
      window.requestAnimationFrame(updateMenu);
    };
    const onBlur = () => setVisible(false);
    const onMouseUp = () => window.requestAnimationFrame(updateMenu);
    const onSelectionChange = () => window.requestAnimationFrame(updateMenu);
    const onKeyUp = () => window.requestAnimationFrame(updateMenu);

    editor.on('selectionUpdate', onSelection);
    editor.on('blur', onBlur);
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      editor.off('selectionUpdate', onSelection);
      editor.off('blur', onBlur);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [editor, updateMenu]);

  const handleCommandPress = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      commandId: EditorCommandId
    ) => {
      event.preventDefault();
      const command = getCommandById(commandId);
      if (!command || !command.isEnabled(editor)) return;
      editor.chain().focus().run();
      command.execute(editor, commandContext);
      window.requestAnimationFrame(updateMenu);
    },
    [commandContext, editor, updateMenu]
  );

  return (
    <>
      {children}
      {visible ? (
        <>
          <div
            ref={menuRef}
            className="editor-bubble-menu pointer-events-none fixed z-20 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 shadow-lg shadow-black/10"
            style={{
              left: `${position.x}px`,
              top: `${position.top}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {quickCommands.map(
              (command) =>
                command && (
                  <button
                    type="button"
                    key={command.id}
                    aria-label={command.label}
                    className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground"
                    onPointerDown={(event) =>
                      handleCommandPress(event, command.id)
                    }
                    data-active={command.isActive(editor)}
                    disabled={!command.isEnabled(editor)}
                  >
                    <command.icon className="h-4 w-4" />
                  </button>
                )
            )}
          </div>

          <div
            ref={trayRef}
            className={`editor-selection-tray fixed inset-x-3 bottom-3 z-30 rounded-3xl border border-border/70 bg-card/95 shadow-xl shadow-black/10 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))] ${
              isMobile ? 'block' : 'hidden'
            }`}
          >
            <div className="grid max-h-[38vh] grid-cols-2 gap-2 overflow-y-auto px-3 py-3 sm:grid-cols-3">
              {trayCommands.map((command) => (
                <button
                  type="button"
                  key={command.id}
                  aria-label={command.label}
                  title={command.label}
                  className="inline-flex min-h-11 w-full items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-foreground"
                  onPointerDown={(event) =>
                    handleCommandPress(event, command.id)
                  }
                  data-active={command.isActive(editor)}
                  disabled={!command.isEnabled(editor)}
                >
                  <command.icon className="h-4 w-4" />
                  <span>{command.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
