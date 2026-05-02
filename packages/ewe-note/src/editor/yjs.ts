import type { XmlFragment } from 'yjs';

export function tiptapFragmentName(noteId: string): string {
  return `tiptap:${noteId}`;
}

export function getTiptapFragment(
  doc: { getXmlFragment: (name: string) => XmlFragment },
  noteId: string
): XmlFragment {
  return doc.getXmlFragment(tiptapFragmentName(noteId));
}

export function isEmptyFragment(fragment: XmlFragment): boolean {
  return fragment.length === 0;
}
