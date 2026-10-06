// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDocuments, type Note, type FileAttachment } from '@eweser/shared';
import { EweserRoomVaultSyncEngine } from '../cli/vault-sync';
import Collaboration from '@tiptap/extension-collaboration';
import StarterKit from '@tiptap/starter-kit';
import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import {
  currentNoteText,
  persistEditorText,
  readEditorTextState,
  replaceEditorText,
} from './text-sync';

function requireValue<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error('Expected test value');
  return value;
}

const noteId = 'note';
const initialText = '# Old plan\n\nYesterday';
function editorFor(doc: Y.Doc, fragmentName: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ fragment: doc.getXmlFragment(fragmentName) }),
    ],
  });
}
function replace(doc: Y.Doc, text: string, html: string, id = noteId) {
  return replaceEditorText(doc, id, text, (fragment) => {
    const seed = new Editor({
      extensions: [
        StarterKit.configure({ history: false }),
        Collaboration.configure({ fragment }),
      ],
    });
    try {
      seed.commands.setContent(html, false);
    } finally {
      seed.destroy();
    }
  });
}
function seed() {
  const doc = new Y.Doc();
  doc.getMap('documents').set(noteId, {
    _id: noteId,
    text: initialText,
    frontmatter: { title: 'Keep' },
    tags: ['keep'],
    owner: 'owner',
  });
  replace(doc, initialText, '<h1>Old plan</h1><p>Yesterday</p>');
  return doc;
}
function clone(doc: Y.Doc) {
  const next = new Y.Doc();
  Y.applyUpdate(next, Y.encodeStateAsUpdate(doc));
  return next;
}
function merge(a: Y.Doc, b: Y.Doc) {
  const ua = Y.encodeStateAsUpdate(a);
  const ub = Y.encodeStateAsUpdate(b);
  Y.applyUpdate(a, ub);
  Y.applyUpdate(b, ua);
}
function noteSave(doc: Y.Doc, text: string) {
  const notes = doc.getMap<Record<string, unknown>>('documents');
  notes.set(noteId, { ...notes.get(noteId), text });
}

describe('Markdown / collaborative fragment reconciliation', () => {
  it('concurrent identical full replacements select one populated fragment without duplicated headings', () => {
    const original = seed();
    const a = clone(original);
    const b = clone(original);
    try {
      const text = '# Current plan\n\nToday';
      replace(a, text, '<h1>Current plan</h1><p>Today</p>');
      replace(b, text, '<h1>Current plan</h1><p>Today</p>');
      merge(a, b);
      expect(readEditorTextState(a, noteId)).toEqual(
        readEditorTextState(b, noteId)
      );
      const ea = editorFor(
        a,
        requireValue(readEditorTextState(a, noteId)).fragmentName
      );
      const eb = editorFor(
        b,
        requireValue(readEditorTextState(b, noteId)).fragmentName
      );
      try {
        expect(ea.getText()).toBe('Current plan\n\nToday');
        expect(ea.getJSON()).toEqual(eb.getJSON());
      } finally {
        ea.destroy();
        eb.destroy();
      }
    } finally {
      original.destroy();
      a.destroy();
      b.destroy();
    }
  });
  it('concurrent first opens of an empty fragment cannot independently insert duplicate source content', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    try {
      replace(a, 'Plan', '<p>Plan</p>');
      replace(b, 'Plan', '<p>Plan</p>');
      merge(a, b);
      const e = editorFor(
        a,
        requireValue(readEditorTextState(a, noteId)).fragmentName
      );
      try {
        expect(e.getText()).toBe('Plan');
      } finally {
        e.destroy();
      }
    } finally {
      a.destroy();
      b.destroy();
    }
  });
  it('a disk/MCP-style text-only write invalidates a pending old editor save and preserves metadata', () => {
    const doc = seed();
    const state = requireValue(readEditorTextState(doc, noteId));
    const old = doc.getXmlFragment(state.fragmentName);
    try {
      const metadata = requireValue(
        doc.getMap<Record<string, unknown>>('documents').get(noteId)
      );
      noteSave(doc, '# Today from disk');
      let calls = 0;
      expect(
        persistEditorText(doc, noteId, old, '# Yesterday', () => {
          calls++;
          noteSave(doc, '# Yesterday');
        })
      ).toBe(false);
      expect(calls).toBe(0);
      expect(currentNoteText(doc, noteId)).toBe('# Today from disk');
      const fresh = replace(
        doc,
        '# Today from disk',
        '<h1>Today from disk</h1>'
      );
      const e = editorFor(doc, fresh.fragmentName);
      try {
        expect(e.getText()).toBe('Today from disk');
      } finally {
        e.destroy();
      }
      const after = requireValue(
        doc.getMap<Record<string, unknown>>('documents').get(noteId)
      );
      expect({ ...after, text: metadata.text }).toEqual(metadata);
      expect(old.length).toBeGreaterThan(0);
    } finally {
      doc.destroy();
    }
  });
  it('a save from a superseded fragment cannot write even when the source text returns to its previous value', () => {
    const doc = seed();
    const old = doc.getXmlFragment(
      requireValue(readEditorTextState(doc, noteId)).fragmentName
    );
    try {
      replace(doc, initialText, '<h1>Old plan</h1><p>Yesterday</p>');
      expect(
        persistEditorText(doc, noteId, old, 'stale', () =>
          noteSave(doc, 'stale')
        )
      ).toBe(false);
      expect(currentNoteText(doc, noteId)).toBe(initialText);
    } finally {
      doc.destroy();
    }
  });
  it('preserves concurrent normal human edits in the selected collaborative fragment', () => {
    const original = seed();
    const a = clone(original);
    const b = clone(original);
    const name = requireValue(readEditorTextState(a, noteId)).fragmentName;
    const ea = editorFor(a, name);
    const eb = editorFor(b, name);
    try {
      ea.commands.insertContentAt(ea.state.doc.content.size - 1, ' Alice');
      eb.commands.insertContentAt(eb.state.doc.content.size - 1, ' Bob');
      merge(a, b);
      expect(ea.getText()).toContain('Alice');
      expect(ea.getText()).toContain('Bob');
      expect(ea.getJSON()).toEqual(eb.getJSON());
      const text = ea.getText();
      expect(
        persistEditorText(a, noteId, a.getXmlFragment(name), text, () =>
          noteSave(a, text)
        )
      ).toBe(true);
      merge(a, b);
      expect(currentNoteText(b, noteId)).toBe(text);
      expect(requireValue(readEditorTextState(b, noteId)).fragmentName).toBe(
        name
      );
    } finally {
      ea.destroy();
      eb.destroy();
      original.destroy();
      a.destroy();
      b.destroy();
    }
  });
  it('publishes source text and its fragment acknowledgement in one update', () => {
    const doc = seed();
    const replica = clone(doc);
    const state = requireValue(readEditorTextState(doc, noteId));
    let updates = 0;
    doc.on('update', (update) => {
      updates++;
      Y.applyUpdate(replica, update);
      expect(requireValue(readEditorTextState(replica, noteId)).markdown).toBe(
        currentNoteText(replica, noteId)
      );
    });
    try {
      expect(
        persistEditorText(
          doc,
          noteId,
          doc.getXmlFragment(state.fragmentName),
          'Human edit',
          () => noteSave(doc, 'Human edit')
        )
      ).toBe(true);
      expect(updates).toBe(1);
    } finally {
      doc.destroy();
      replica.destroy();
    }
  });
});

it('actual room-backed disk adapter invalidates an old editor save without changing note identity', async () => {
  const vaultPath = await mkdtemp(join(tmpdir(), 'eweser-editor-disk-'));
  const doc = new Y.Doc(),
    attachmentDoc = new Y.Doc();
  const Notes = getDocuments(
    'http://auth.test',
    'notes',
    'test-room'
  )<Note>(doc);
  const Attachments = getDocuments(
    'http://auth.test',
    'fileAttachments',
    'test-attachments'
  )<FileAttachment>(attachmentDoc);
  const engine = new EweserRoomVaultSyncEngine({
    vaultPath,
    vaultName: 'Test Vault',
    roomId: 'test-room',
    attachmentsRoomId: 'test-attachments',
    remoteSync: false,
  });
  engine.attachDocumentsForInMemoryHarness({
    notes: Notes,
    attachments: Attachments,
  });
  try {
    await writeFile(join(vaultPath, 'Plan.md'), '# Old plan\n\nYesterday\n');
    await engine.onFileChange('Plan.md');
    const original = requireValue(engine.getNotes()[0]);
    const state = replace(
      doc,
      original.text,
      '<h1>Old plan</h1><p>Yesterday</p>',
      original._id
    );
    await writeFile(join(vaultPath, 'Plan.md'), '# Current plan\n\nToday\n');
    await engine.onFileChange('Plan.md');
    const current = requireValue(Notes.get(original._id));
    expect(current.text).toBe('# Current plan\n\nToday\n');
    expect(current._id).toBe(original._id);
    expect(current._created).toBe(original._created);
    expect(current._ref).toBe(original._ref);
    expect(
      persistEditorText(
        doc,
        original._id,
        doc.getXmlFragment(state.fragmentName),
        original.text,
        () => Notes.set(original)
      )
    ).toBe(false);
    expect(Notes.get(original._id)?.text).toBe(current.text);
    const fresh = replace(
      doc,
      current.text,
      '<h1>Current plan</h1><p>Today</p>',
      original._id
    );
    const editor = editorFor(doc, fresh.fragmentName);
    try {
      expect(editor.getText()).toBe('Current plan\n\nToday');
    } finally {
      editor.destroy();
    }
  } finally {
    doc.destroy();
    attachmentDoc.destroy();
    await rm(vaultPath, { recursive: true, force: true });
  }
});
