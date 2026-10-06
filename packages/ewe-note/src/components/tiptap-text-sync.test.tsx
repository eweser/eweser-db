// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useCallback, useSyncExternalStore } from 'react';
import type { Editor } from '@tiptap/react';
import { Editor as HeadlessEditor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import type { Note } from '@eweser/db';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TiptapEditor } from './tiptap-editor';
import {
  currentNoteText,
  readEditorTextState,
  readPreservedEditorDraft,
} from '../editor/text-sync';

vi.mock('./editor-toolbar', () => ({ EditorToolbar: () => null }));
vi.mock('./editor-bubble-menu', () => ({
  EditorBubbleMenu: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('./editor-context-menu', () => ({
  EditorContextMenu: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('./editor-slash-menu', () => ({ EditorSlashMenu: () => null }));
vi.mock('./source-mode-editor', () => ({
  SourceModeEditor: ({
    value,
    onChange,
    onExit,
  }: {
    value: string;
    onChange: (s: string) => void;
    onExit: () => void;
  }) => (
    <>
      <textarea
        aria-label="Source"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button onClick={onExit}>Exit source</button>
    </>
  ),
}));

function requireValue<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error('Expected test value');
  return value;
}

const id = 'note';
function makeDoc(text = '# Plan\n\nToday\n') {
  const doc = new Y.Doc();
  doc.getMap('documents').set(id, {
    _id: id,
    _created: 1,
    _updated: 1,
    _ref: 'test|notes|room|note',
    _deleted: false,
    text,
    frontmatter: { title: 'Keep' },
    tags: ['keep'],
    relatedDocIds: [],
  });
  return doc;
}
function Harness({
  doc,
  awareness,
  onReady,
  onSave,
  sourceMode = false,
  readOnly = false,
}: {
  doc: Y.Doc;
  awareness: Awareness;
  onReady: (e: Editor | null) => void;
  onSave: (s: string) => void;
  sourceMode?: boolean;
  readOnly?: boolean;
}) {
  const notes = doc.getMap<Note>('documents');
  const subscribe = useCallback(
    (cb: () => void) => {
      notes.observe(cb);
      return () => notes.unobserve(cb);
    },
    [notes]
  );
  const note = useSyncExternalStore(
    subscribe,
    () => requireValue(notes.get(id)),
    () => requireValue(notes.get(id))
  );
  const save = (text: string, expected: Note) => {
    const current = requireValue(notes.get(id));
    if (current.text !== expected.text) return;
    onSave(text);
    notes.set(id, { ...current, text, _updated: current._updated + 1 });
  };
  return (
    <TiptapEditor
      note={note}
      doc={doc as never}
      provider={{ awareness } as never}
      selectedNoteId={id}
      onSaveMarkdown={save}
      userName="Test"
      userColor="#123456"
      onEditorReady={onReady}
      sourceMode={sourceMode}
      onSourceModeChange={() => {}}
      readOnly={readOnly}
    />
  );
}
async function settle(ms = 20) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  await act(async () => {
    vi.advanceTimersByTime(20);
  });
}
const resources: Array<{ doc: Y.Doc; awareness: Awareness }> = [];
function setup(text?: string) {
  const doc = makeDoc(text);
  const awareness = new Awareness(doc);
  resources.push({ doc, awareness });
  return { doc, awareness };
}
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  for (const { doc, awareness } of resources.splice(0)) {
    awareness.destroy();
    doc.destroy();
  }
  vi.useRealTimers();
});

describe('mounted editor external text lifecycle', () => {
  it('opening and remote hydration preserve exact source bytes without an autosave', async () => {
    const { doc, awareness } = setup('# Plan\n\nToday\n\n');
    const save = vi.fn();
    let editor: Editor | null = null;
    render(
      <Harness
        doc={doc}
        awareness={awareness}
        onSave={save}
        onReady={(e) => {
          editor = e;
        }}
      />
    );
    await settle(1000);
    expect(editor).not.toBeNull();
    expect(requireValue<Editor>(editor).getText()).toBe('Plan\n\nToday');
    expect(currentNoteText(doc, id)).toBe('# Plan\n\nToday\n\n');
    expect(save).not.toHaveBeenCalled();
  });
  it('a focused editor accepts external disk-style replacement instead of saving stale text', async () => {
    const { doc, awareness } = setup();
    const save = vi.fn();
    let editor: Editor | null = null;
    render(
      <Harness
        doc={doc}
        awareness={awareness}
        onSave={save}
        onReady={(e) => {
          editor = e;
        }}
      />
    );
    await settle();
    act(() => {
      requireValue<Editor>(editor).commands.focus();
    });
    const note = requireValue(doc.getMap<Note>('documents').get(id));
    act(() => {
      doc
        .getMap('documents')
        .set(id, { ...note, text: '# New plan\n\nTomorrow\n' });
    });
    await settle(1000);
    expect(requireValue<Editor>(editor).getText()).toBe('New plan\n\nTomorrow');
    expect(currentNoteText(doc, id)).toBe('# New plan\n\nTomorrow\n');
    expect(save).not.toHaveBeenCalled();
  });
  it('a pending human edit survives in a preserved draft and cannot overwrite an external replacement', async () => {
    const { doc, awareness } = setup();
    const save = vi.fn();
    let editor: Editor | null = null;
    render(
      <Harness
        doc={doc}
        awareness={awareness}
        onSave={save}
        onReady={(e) => {
          editor = e;
        }}
      />
    );
    await settle();
    act(() => {
      requireValue<Editor>(editor).commands.insertContentAt(
        requireValue<Editor>(editor).state.doc.content.size - 1,
        ' Human draft'
      );
    });
    const note = requireValue(doc.getMap<Note>('documents').get(id));
    act(() => {
      doc.getMap('documents').set(id, { ...note, text: '# External plan' });
    });
    await settle(1000);
    expect(currentNoteText(doc, id)).toBe('# External plan');
    expect(save).not.toHaveBeenCalled();
    expect(
      (screen.getByLabelText('Preserved unsaved text') as HTMLTextAreaElement)
        .value
    ).toContain('Human draft');
  });
  it('normal human input writes once after debounce and keeps metadata', async () => {
    const { doc, awareness } = setup();
    const save = vi.fn();
    let editor: Editor | null = null;
    render(
      <Harness
        doc={doc}
        awareness={awareness}
        onSave={save}
        onReady={(e) => {
          editor = e;
        }}
      />
    );
    await settle();
    act(() => {
      requireValue<Editor>(editor).commands.insertContentAt(
        requireValue<Editor>(editor).state.doc.content.size - 1,
        ' Human'
      );
    });
    await settle(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(currentNoteText(doc, id)).toContain('Human');
    expect(
      requireValue(doc.getMap<Note>('documents').get(id)).frontmatter
    ).toEqual({
      title: 'Keep',
    });
  });
  it('source-mode edits publish text and a fresh fragment together without recursive writeback', async () => {
    const { doc, awareness } = setup();
    const save = vi.fn();
    let editor: Editor | null = null;
    render(
      <Harness
        doc={doc}
        awareness={awareness}
        onSave={save}
        onReady={(e) => {
          editor = e;
        }}
        sourceMode
      />
    );
    await settle();
    fireEvent.change(screen.getByLabelText('Source'), {
      target: { value: '# Source plan\n\nUpdated\n' },
    });
    await settle(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(currentNoteText(doc, id)).toBe('# Source plan\n\nUpdated\n');
    expect(requireValue(readEditorTextState(doc, id)).markdown).toBe(
      currentNoteText(doc, id)
    );
    expect(requireValue<Editor>(editor).getText()).toBe(
      'Source plan\n\nUpdated'
    );
  });
  it('read-only hydration does not create a shared fragment replacement or write source', async () => {
    const { doc, awareness } = setup();
    const save = vi.fn();
    let updates = 0;
    doc.on('update', () => updates++);
    render(
      <Harness
        doc={doc}
        awareness={awareness}
        onSave={save}
        onReady={() => {}}
        readOnly
      />
    );
    await settle(1000);
    expect(readEditorTextState(doc, id)).toBeNull();
    expect(updates).toBe(0);
    expect(save).not.toHaveBeenCalled();
  });
  it('unmount flushes a valid pending human edit once', async () => {
    const { doc, awareness } = setup();
    const save = vi.fn();
    let editor: Editor | null = null;
    const view = render(
      <Harness
        doc={doc}
        awareness={awareness}
        onSave={save}
        onReady={(e) => {
          editor = e;
        }}
      />
    );
    await settle();
    act(() => {
      requireValue<Editor>(editor).commands.insertContentAt(
        requireValue<Editor>(editor).state.doc.content.size - 1,
        ' Final human edit'
      );
    });
    view.unmount();
    await settle(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(currentNoteText(doc, id)).toContain('Final human edit');
  });
});

function mount(resource: { doc: Y.Doc; awareness: Awareness }) {
  const save = vi.fn();
  const state: { editor: Editor | null } = { editor: null };
  const view = render(
    <Harness
      {...resource}
      onSave={save}
      onReady={(e) => {
        state.editor = e;
      }}
    />
  );
  return { save, state, view };
}
function cloneResource(doc: Y.Doc) {
  const replica = new Y.Doc();
  Y.applyUpdate(replica, Y.encodeStateAsUpdate(doc));
  const awareness = new Awareness(replica);
  const resource = { doc: replica, awareness };
  resources.push(resource);
  return resource;
}
function mergeDocs(a: Y.Doc, b: Y.Doc) {
  const ua = Y.encodeStateAsUpdate(a),
    ub = Y.encodeStateAsUpdate(b);
  Y.applyUpdate(a, ub);
  Y.applyUpdate(b, ua);
}
function externalText(doc: Y.Doc, text: string) {
  const notes = doc.getMap<Note>('documents');
  notes.set(id, { ...requireValue(notes.get(id)), text });
}
function headless(doc: Y.Doc, fragmentName: string) {
  return new HeadlessEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ fragment: doc.getXmlFragment(fragmentName) }),
    ],
  });
}

describe('mounted multi-client and reopen regression', () => {
  it('two open clients reconcile simultaneous whole-text replacements without duplicate content', async () => {
    const a = setup();
    const ma = mount(a);
    await settle();
    const b = cloneResource(a.doc);
    const mb = mount(b);
    await settle();
    const source = '# Current plan\n\nToday\n\n';
    act(() => {
      externalText(a.doc, source);
      externalText(b.doc, source);
    });
    await settle();
    act(() => mergeDocs(a.doc, b.doc));
    await settle(1000);
    expect(requireValue(ma.state.editor).getText()).toBe(
      'Current plan\n\nToday'
    );
    expect(requireValue(mb.state.editor).getJSON()).toEqual(
      requireValue(ma.state.editor).getJSON()
    );
    expect(currentNoteText(a.doc, id)).toBe(source);
    expect(currentNoteText(b.doc, id)).toBe(source);
    expect(ma.save).not.toHaveBeenCalled();
    expect(mb.save).not.toHaveBeenCalled();
  });
  it('reconnect with a replacement pointer cancels a pending old-fragment save', async () => {
    const a = setup();
    const ma = mount(a);
    await settle();
    const b = cloneResource(a.doc);
    const mb = mount(b);
    await settle();
    act(() =>
      requireValue(ma.state.editor).commands.insertContentAt(
        requireValue(ma.state.editor).state.doc.content.size - 1,
        ' Offline human draft'
      )
    );
    act(() => externalText(b.doc, '# Reconnected plan'));
    await settle();
    act(() => Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc)));
    await settle(1000);
    expect(currentNoteText(a.doc, id)).toBe('# Reconnected plan');
    expect(requireValue(ma.state.editor).getText()).toBe('Reconnected plan');
    expect(readPreservedEditorDraft(a.doc, id)).toContain(
      'Offline human draft'
    );
    expect(ma.save).not.toHaveBeenCalled();
    expect(mb.save).not.toHaveBeenCalled();
  });
  it('immediate close after an external write rejects stale flush and retains the draft on reopen', async () => {
    const a = setup();
    const first = mount(a);
    await settle();
    act(() =>
      requireValue(first.state.editor).commands.insertContentAt(
        requireValue(first.state.editor).state.doc.content.size - 1,
        ' Closing human draft'
      )
    );
    act(() => {
      externalText(a.doc, '# New canonical');
      first.view.unmount();
    });
    await settle(1000);
    expect(first.save).not.toHaveBeenCalled();
    expect(currentNoteText(a.doc, id)).toBe('# New canonical');
    const reopened = mount(a);
    await settle(1000);
    expect(requireValue(reopened.state.editor).getText()).toBe('New canonical');
    expect(
      (screen.getByLabelText('Preserved unsaved text') as HTMLTextAreaElement)
        .value
    ).toContain('Closing human draft');
    expect(reopened.save).not.toHaveBeenCalled();
  });
  it('legacy stale fragments cannot overwrite current Markdown on initialization', async () => {
    const a = setup('# Current');
    const old = headless(a.doc, `tiptap:${id}`);
    old.commands.setContent('<h1>Old October plan</h1>', false);
    old.destroy();
    const mounted = mount(a);
    await settle(1000);
    expect(requireValue(mounted.state.editor).getText()).toBe('Current');
    expect(a.doc.getXmlFragment(`tiptap:${id}`).length).toBeGreaterThan(0);
    expect(mounted.save).not.toHaveBeenCalled();
  });
  it('reopening recovers real human fragment edits that were not mirrored before closing', async () => {
    const a = setup();
    const first = mount(a);
    await settle();
    first.view.unmount();
    const state = requireValue(readEditorTextState(a.doc, id));
    const human = headless(a.doc, state.fragmentName);
    human.commands.insertContentAt(
      human.state.doc.content.size - 1,
      ' Recovered human'
    );
    human.destroy();
    const reopened = mount(a);
    await settle(1000);
    expect(currentNoteText(a.doc, id)).toContain('Recovered human');
    expect(reopened.save).toHaveBeenCalledTimes(1);
  });
});

it('idle rich Markdown keeps exact source without formatting writeback', async () => {
  const source =
    '# Current plan\n\n- [ ] Human task\n- [x] Done\n\n| Owner | Task |\n| --- | --- |\n| Jacob | [[Project]] |\n\n[Link](https://example.test) and **bold**\n\n';
  const a = setup(source);
  const mounted = mount(a);
  await settle(1000);
  expect(currentNoteText(a.doc, id)).toBe(source);
  expect(mounted.save).not.toHaveBeenCalled();
});

it('concurrent human edits converge in both the selected fragment and Markdown mirror', async () => {
  const a = setup();
  const ma = mount(a);
  await settle();
  const b = cloneResource(a.doc);
  const mb = mount(b);
  await settle();
  act(() => {
    requireValue(ma.state.editor).commands.insertContentAt(
      requireValue(ma.state.editor).state.doc.content.size - 1,
      ' Alice'
    );
    requireValue(mb.state.editor).commands.insertContentAt(
      requireValue(mb.state.editor).state.doc.content.size - 1,
      ' Bob'
    );
  });
  await settle(1000);
  act(() => mergeDocs(a.doc, b.doc));
  await settle(1000);
  act(() => mergeDocs(a.doc, b.doc));
  await settle(1000);
  expect(requireValue(ma.state.editor).getJSON()).toEqual(
    requireValue(mb.state.editor).getJSON()
  );
  expect(currentNoteText(a.doc, id)).toContain('Alice');
  expect(currentNoteText(a.doc, id)).toContain('Bob');
  expect(currentNoteText(b.doc, id)).toBe(currentNoteText(a.doc, id));
});

it('an external replacement cancels source-mode draft autosave and displays fresh source', async () => {
  const a = setup();
  const save = vi.fn();
  render(<Harness {...a} onSave={save} onReady={() => {}} sourceMode />);
  await settle();
  fireEvent.change(screen.getByLabelText('Source'), {
    target: { value: '# Unsaved source draft' },
  });
  act(() => externalText(a.doc, '# Current external source\n'));
  await settle(1000);
  expect(currentNoteText(a.doc, id)).toBe('# Current external source\n');
  expect((screen.getByLabelText('Source') as HTMLTextAreaElement).value).toBe(
    '# Current external source\n'
  );
  expect(readPreservedEditorDraft(a.doc, id)).toBe('# Unsaved source draft');
  expect(save).not.toHaveBeenCalled();
});
