// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import StarterKit from '@tiptap/starter-kit';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';

describe('TipTap collaboration dependency graph', () => {
  it('initializes collaboration and cursor plugins against the same Yjs plugin key', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('tiptap:note');
    const awareness = new Awareness(doc);
    let editor: Editor | undefined;

    try {
      expect(() => {
        editor = new Editor({
          extensions: [
            StarterKit.configure({ history: false }),
            Collaboration.configure({ fragment }),
            CollaborationCursor.configure({
              provider: { awareness },
              user: { name: 'Test user', color: '#123456' },
            }),
          ],
        });
      }).not.toThrow();
    } finally {
      editor?.destroy();
      awareness.destroy();
      doc.destroy();
    }
  });
});
