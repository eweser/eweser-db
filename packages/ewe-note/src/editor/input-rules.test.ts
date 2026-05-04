// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMarkdownInputRules } from './input-rules';
import { TaskItemWithExit } from './task-item';

const editors: Editor[] = [];

function createEditorWithLine(text: string) {
  const editor = new Editor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItemWithExit.configure({ nested: true }),
    ],
    content: `<p>${text}</p>`,
  });

  editor.commands.setTextSelection(text.length + 1);
  editors.push(editor);
  return editor;
}

function createEditorWithContent(content: string, selection: number) {
  const editor = new Editor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItemWithExit.configure({ nested: true }),
    ],
    content,
  });

  editor.commands.setTextSelection(selection);
  editors.push(editor);
  return editor;
}

describe('markdown input rules', () => {
  afterEach(() => {
    for (const editor of editors.splice(0)) {
      editor.destroy();
    }
  });

  it('converts "-[ ] " into an unchecked task list item', () => {
    const editor = createEditorWithLine('-[ ] ');

    expect(applyMarkdownInputRules(editor)).toBe(true);
    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          type: 'taskList',
          content: [{ type: 'taskItem', attrs: { checked: false } }],
        },
      ],
    });
  });

  it('converts "- [x] " into a checked task list item', () => {
    const editor = createEditorWithLine('- [x] ');

    expect(applyMarkdownInputRules(editor)).toBe(true);
    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          type: 'taskList',
          content: [{ type: 'taskItem', attrs: { checked: true } }],
        },
      ],
    });
  });

  it('converts "[ ]" inside an existing bullet list item into an unchecked task item', () => {
    const editor = createEditorWithContent('<ul><li><p>[ ]</p></li></ul>', 6);

    expect(applyMarkdownInputRules(editor)).toBe(true);
    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          type: 'taskList',
          content: [{ type: 'taskItem', attrs: { checked: false } }],
        },
      ],
    });
  });

  it('converts "[x]" inside an existing bullet list item into a checked task item', () => {
    const editor = createEditorWithContent('<ul><li><p>[x]</p></li></ul>', 6);

    expect(applyMarkdownInputRules(editor)).toBe(true);
    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          type: 'taskList',
          content: [{ type: 'taskItem', attrs: { checked: true } }],
        },
      ],
    });
  });
});
