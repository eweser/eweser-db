import { type Editor } from '@tiptap/react';

export interface SlashMenuState {
  open: true;
  query: string;
  from: number;
  to: number;
  x: number;
  y: number;
}

export interface SlashMenuPoint {
  x: number;
  y: number;
}

function getLineStart(editor: Editor, offset: number) {
  const resolved = editor.state.doc.resolve(offset);
  return resolved.start(resolved.depth);
}

export function resolveSlashMenuState(editor: Editor): SlashMenuState | null {
  const selection = editor.state.selection;
  if (!selection.empty) return null;

  const from = selection.from;
  const lineStart = getLineStart(editor, from);
  const lineText = editor.state.doc.textBetween(lineStart, from, '\n');

  const slashIndex = lineText.lastIndexOf('/');
  if (slashIndex === -1) return null;

  const beforeSlash = lineText.slice(0, slashIndex).trim();
  if (beforeSlash.length > 0) return null;

  const query = lineText.slice(slashIndex + 1);
  if (query.includes(' ')) return null;
  const slashFrom = lineStart + slashIndex;
  const coords = editor.view.coordsAtPos(from);
  const state: SlashMenuState = {
    open: true,
    query,
    from: slashFrom,
    to: from,
    x: Math.max(coords.left, 12),
    y: Math.max(coords.bottom + 8, 60),
  };

  return state;
}

export function slashRangeToTextRange(state: SlashMenuState) {
  return {
    from: state.from,
    to: state.to,
  };
}
