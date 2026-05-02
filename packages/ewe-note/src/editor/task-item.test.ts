// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import { TaskItemWithExit } from './task-item';

function createTaskEditor(content: string): Editor {
  return new Editor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItemWithExit.configure({ nested: true }),
    ],
    content,
  });
}

describe('TaskItemWithExit', () => {
  it('continues a task list after pressing Enter in a non-empty task item', () => {
    const editor = createTaskEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>A</p></li></ul>'
    );

    editor.commands.setTextSelection(editor.state.doc.content.size - 3);

    expect(editor.commands.keyboardShortcut('Enter')).toBe(true);
    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          type: 'taskList',
          content: [
            { type: 'taskItem' },
            { type: 'taskItem', content: [{ type: 'paragraph' }] },
          ],
        },
      ],
    });
  });

  it('exits the task list after pressing Enter in an empty task item', () => {
    const editor = createTaskEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>A</p></li><li data-type="taskItem" data-checked="false"><p></p></li></ul>'
    );

    editor.commands.setTextSelection(editor.state.doc.content.size - 3);

    expect(editor.commands.keyboardShortcut('Enter')).toBe(true);
    expect(editor.getJSON()).toMatchObject({
      content: [{ type: 'taskList' }, { type: 'paragraph' }],
    });
  });

  it('exits when the empty task item has following block content', () => {
    const editor = createTaskEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p><h1>Untitled</h1></li></ul>'
    );

    editor.commands.setTextSelection(3);

    expect(editor.commands.keyboardShortcut('Enter')).toBe(true);
    expect(editor.getJSON()).toMatchObject({
      content: [{ type: 'paragraph' }, { type: 'heading' }],
    });
  });
});
