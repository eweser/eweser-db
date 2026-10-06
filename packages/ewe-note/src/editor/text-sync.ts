/**
 * Purpose: Keep full Markdown replacements separate from collaborative edits.
 * Exports: EditorTextState and the room-backed text/fragment reconciliation helpers.
 * Touches: A Yjs map of fragment pointers and existing note documents.
 * Read before editing: packages/ewe-note/src/INDEX.md and editor/yjs.ts.
 */
import type { Doc, XmlFragment } from 'yjs';

export interface EditorTextState {
  fragmentName: string;
  markdown: string;
}

const STATE_MAP = 'tiptap:text-state';

export function editorTextStates(doc: Doc) {
  return doc.getMap<string>(STATE_MAP);
}

export function readEditorTextState(
  doc: Doc,
  noteId: string
): EditorTextState | null {
  return parseEditorTextState(editorTextStates(doc).get(noteId));
}

export function parseEditorTextState(
  value: string | undefined
): EditorTextState | null {
  if (!value) return null;
  let state: unknown;
  try {
    state = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof state !== 'object' || state === null) return null;
  const fields = state as Record<string, unknown>;
  return typeof fields.fragmentName === 'string' &&
    typeof fields.markdown === 'string'
    ? { fragmentName: fields.fragmentName, markdown: fields.markdown }
    : null;
}

export function currentNoteText(doc: Doc, noteId: string): string | undefined {
  const note = doc.getMap<unknown>('documents').get(noteId);
  return typeof note === 'object' &&
    note !== null &&
    'text' in note &&
    typeof note.text === 'string'
    ? note.text
    : undefined;
}

/** Conflicting human drafts remain in the same private room across pane closes.
 * They do not replace the canonical note or another client's independent draft.
 */
export function preserveEditorDraft(
  doc: Doc,
  noteId: string,
  markdown: string
): void {
  doc
    .getMap<string>('tiptap:recovered-drafts')
    .set(
      `${noteId}:${doc.clientID}`,
      JSON.stringify({ noteId, markdown, time: Date.now() })
    );
}

export function readPreservedEditorDraft(
  doc: Doc,
  noteId: string
): string | null {
  let latest: { markdown: string; time: number } | null = null;
  for (const value of doc.getMap<string>('tiptap:recovered-drafts').values()) {
    let draft: unknown;
    try {
      draft = JSON.parse(value);
    } catch {
      continue;
    }
    if (typeof draft !== 'object' || draft === null) continue;
    const fields = draft as Record<string, unknown>;
    if (
      fields.noteId !== noteId ||
      typeof fields.markdown !== 'string' ||
      typeof fields.time !== 'number'
    )
      continue;
    if (!latest || latest.time <= fields.time)
      latest = { markdown: fields.markdown, time: fields.time };
  }
  return latest?.markdown ?? null;
}

/** Publish a fully seeded new fragment. Concurrent replacements choose one
 * pointer through Y.Map conflict resolution instead of concatenating inserts.
 * Prior fragments are retained; this never clears a human's existing fragment.
 */
export function replaceEditorText(
  doc: Doc,
  noteId: string,
  markdown: string,
  populate: (fragment: XmlFragment) => void
): EditorTextState {
  const state = {
    fragmentName: `tiptap:${noteId}:${crypto.randomUUID()}`,
    markdown,
  };
  doc.transact(() => {
    populate(doc.getXmlFragment(state.fragmentName));
    editorTextStates(doc).set(noteId, JSON.stringify(state));
  });
  return state;
}

/** A delayed save only acknowledges the currently selected fragment. Pair the
 * Markdown mirror with its pointer in one Yjs update, retaining fresh metadata.
 */
export function persistEditorText(
  doc: Doc,
  noteId: string,
  fragment: XmlFragment,
  markdown: string,
  save: () => void
): boolean {
  let saved = false;
  doc.transact(() => {
    const state = readEditorTextState(doc, noteId);
    if (
      !state ||
      doc.getXmlFragment(state.fragmentName) !== fragment ||
      currentNoteText(doc, noteId) !== state.markdown
    ) {
      if (markdown !== currentNoteText(doc, noteId))
        preserveEditorDraft(doc, noteId, markdown);
      return;
    }
    save();
    if (currentNoteText(doc, noteId) !== markdown) {
      preserveEditorDraft(doc, noteId, markdown);
      return;
    }
    editorTextStates(doc).set(noteId, JSON.stringify({ ...state, markdown }));
    saved = true;
  });
  return saved;
}
