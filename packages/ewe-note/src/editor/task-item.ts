import type { Editor } from '@tiptap/core';
import TaskItem from '@tiptap/extension-task-item';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { liftListItem as liftProseMirrorListItem } from '@tiptap/pm/schema-list';

export function isSelectionInEmptyTaskItem(state: EditorState): boolean {
  const { selection, schema } = state;
  const { $from, $to } = selection;
  const taskItemType = schema.nodes.taskItem;

  if (!selection.empty || !$from.sameParent($to) || !taskItemType) {
    return false;
  }

  const isEmptyParagraph =
    $from.parent.type.name === 'paragraph' &&
    $from.parent.content.size === 0 &&
    $from.parentOffset === 0;

  if (!isEmptyParagraph) return false;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === taskItemType) return true;
  }

  return false;
}

export function liftEmptyTaskItem(
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean {
  const taskItemType = state.schema.nodes.taskItem;
  if (!taskItemType || !isSelectionInEmptyTaskItem(state)) return false;
  return liftProseMirrorListItem(taskItemType)(state, dispatch);
}

function exitEmptyTaskItem(editor: Editor): boolean {
  if (!isSelectionInEmptyTaskItem(editor.state)) return false;
  return editor.commands.liftListItem('taskItem');
}

export const TaskItemWithExit = TaskItem.extend({
  addKeyboardShortcuts() {
    const shortcuts = {
      Enter: () => {
        if (exitEmptyTaskItem(this.editor)) return true;

        return this.editor.commands.splitListItem(this.name);
      },
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    };

    if (!this.options.nested) return shortcuts;

    return {
      ...shortcuts,
      Tab: () => this.editor.commands.sinkListItem(this.name),
    };
  },
});
