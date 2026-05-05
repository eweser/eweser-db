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
