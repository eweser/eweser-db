// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { isCollaborationReady } from './tiptap-editor';

describe('isCollaborationReady', () => {
  it('returns false when a sync provider exists without awareness', () => {
    const fragment = new Y.Doc().getXmlFragment('tiptap:test');
    const provider = {} as never;

    expect(isCollaborationReady(fragment, provider)).toBe(false);
  });

  it('returns true only when both fragment.doc and provider awareness exist', () => {
    const fragment = new Y.Doc().getXmlFragment('tiptap:test');
    const provider = {
      awareness: {
        setLocalStateField() {},
        states: new Map(),
        on() {},
      },
    } as never;

    expect(isCollaborationReady(fragment, provider)).toBe(true);
  });
});

describe('getMissingLinkDecorations', () => {
  it('marks only links to missing notes and caches by doc', async () => {
    const { Editor } = await import('@tiptap/core');
    const { default: StarterKit } = await import('@tiptap/starter-kit');
    const { default: Link } = await import('@tiptap/extension-link');
    const { getMissingLinkDecorations } = await import('./tiptap-editor');
    const editor = new Editor({
      extensions: [StarterKit, Link.configure({ protocols: ['wiki'] })],
      content:
        '<p><a href="wiki://Existing">here</a> <a href="wiki://Missing">gone</a> <a href="https://x.test">web</a></p>',
    });
    try {
      const cache = { current: null };
      const resolvers = {
        isNoteResolved: (name: string) => name === 'Existing',
      };
      const set = getMissingLinkDecorations(editor.state.doc, resolvers, cache);
      const found = set.find();
      expect(
        found.map((d) => editor.state.doc.textBetween(d.from, d.to))
      ).toEqual(['gone']);
      expect(
        getMissingLinkDecorations(editor.state.doc, resolvers, cache)
      ).toBe(set);
    } finally {
      editor.destroy();
    }
  });
});
