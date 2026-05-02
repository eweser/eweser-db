import { type Editor } from '@tiptap/react';

function currentLineInfo(editor: Editor) {
  const selection = editor.state.selection;
  const isEmpty = selection.empty;
  if (!isEmpty) return null;

  const from = selection.from;
  const resolved = editor.state.doc.resolve(from);
  const start = resolved.start(resolved.depth);
  const end = resolved.end(resolved.depth);
  const text = editor.state.doc.textBetween(start, end, '\n');
  return {
    from: start,
    to: from,
    end,
    text,
  };
}

function runRule(
  editor: Editor,
  matcher: RegExp,
  command: (match: RegExpExecArray | null) => void
) {
  const line = currentLineInfo(editor);
  if (!line) return false;

  const lineText = line.text;
  const trimmed = lineText.trimEnd();
  const match = matcher.exec(trimmed);
  if (!match) return false;

  command(match);
  return true;
}

function deleteMarkerAndReset(
  editor: Editor,
  markerLength: number,
  from: number
) {
  editor
    .chain()
    .focus()
    .deleteRange({ from, to: from + markerLength })
    .run();
}

export function applyMarkdownInputRules(editor: Editor) {
  const line = currentLineInfo(editor);
  if (!line) return false;

  // Heading
  if (
    runRule(editor, /^#{1,6}\s+$/, (match) => {
      const level = Math.max(1, Math.min(6, match?.[0]?.trim().length ?? 1)) as
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6;
      const markerLength = match?.[0]?.length ?? 0;
      deleteMarkerAndReset(editor, markerLength, line.from);
      editor.chain().focus().toggleHeading({ level }).run();
    })
  ) {
    return true;
  }

  // Blockquote starter
  if (
    runRule(editor, /^>\s+$/, () => {
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().toggleBlockquote().run();
    })
  ) {
    return true;
  }

  // Completed task list
  if (
    runRule(editor, /^-\s\[x\]\s+$/i, () => {
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor
        .chain()
        .focus()
        .toggleTaskList()
        .updateAttributes('taskItem', { checked: true })
        .run();
    })
  ) {
    return true;
  }

  // Task list
  if (
    runRule(editor, /^-\s\[\s?\]\s+$/, () => {
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().toggleTaskList().run();
    })
  ) {
    return true;
  }

  // Obsidian callout starter
  if (
    runRule(editor, /^>\s\[!([a-zA-Z][\w-]*)\]\s*$/, (match) => {
      const type = match?.[1] ?? 'note';
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().insertContent(`> [!${type}]\n> `).run();
    })
  ) {
    return true;
  }

  // Ordered list
  if (
    runRule(editor, /^\d+\.\s+$/, () => {
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().toggleOrderedList().run();
    })
  ) {
    return true;
  }

  // Bullet list
  if (
    runRule(editor, /^[-*+]\s+$/, () => {
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().toggleBulletList().run();
    })
  ) {
    return true;
  }

  // Markdown code block
  if (
    runRule(editor, /^```$/, () => {
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().toggleCodeBlock().run();
    })
  ) {
    return true;
  }

  // Horizontal rule
  if (
    runRule(editor, /^---$/, () => {
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().setHorizontalRule().run();
    })
  ) {
    return true;
  }

  // Markdown table scaffold
  if (
    runRule(editor, /^\|\s*$/, () => {
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor
        .chain()
        .focus()
        .insertContent('| Column 1 | Column 2 |\n| --- | --- |\n|  |  |')
        .run();
    })
  ) {
    return true;
  }

  // Inline highlight scaffold on a line by itself.
  if (
    runRule(editor, /^==([^=\n]+)==$/, (match) => {
      const text = match?.[1] ?? '';
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().insertContent(`<mark>${text}</mark>`).run();
    })
  ) {
    return true;
  }

  // Wiki-link scaffold on a line by itself.
  if (
    runRule(editor, /^\[\[([^\]]+)\]\]$/, (match) => {
      const raw = match?.[1] ?? '';
      const [targetPart, aliasPart] = raw.split('|');
      const target = targetPart?.trim() ?? '';
      const alias = aliasPart?.trim() || target;
      if (!target) return;
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="wiki://${encodeURIComponent(target)}">${alias}</a>`
        )
        .run();
    })
  ) {
    return true;
  }

  // Embed scaffold on a line by itself. Preserve as source-visible OFM.
  if (
    runRule(editor, /^!\[\[([^\]]+)\]\]$/, (match) => {
      const raw = match?.[1]?.trim() ?? '';
      if (!raw) return;
      deleteMarkerAndReset(editor, line.text.length, line.from);
      editor.chain().focus().insertContent(`![[${raw}]]`).run();
    })
  ) {
    return true;
  }

  return false;
}
