import React, { useEffect, useState } from 'react';
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx,
} from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/preset-commonmark';
import { collabServiceCtx, collab } from '@milkdown/plugin-collab';
import type { Doc } from 'yjs';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import type { Database, Note, Room } from '@eweser/db';
import { wait } from '@eweser/db';
export interface EditorProps {
  db: Database;
  onChange: (markdown: string) => void;
  note?: Note;
  room: Room<Note>;
}

const MilkdownEditorInner: React.FC<EditorProps & { doc: Doc }> = ({
  onChange,
  note,
  doc,
}) => {
  const editor = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
      })
      .config(nord)
      .use(commonmark)
      .use(collab)
      .use(listener)
  );
  editor.get()?.action((ctx) => {
    const collabService = ctx.get(collabServiceCtx);
    collabService
      // bind doc and awareness
      .bindDoc(doc)
      .applyTemplate(note?.text || 'start writing', (docNode, template) => {
        const empty = !docNode.textContent;
        const equal = docNode.textContent === template.textContent;
        if (empty) return true;
        return !equal;
      })
      // connect yjs with milkdown
      .connect();

    ctx.get(listenerCtx).markdownUpdated((_, markdown, prevMarkdown) => {
      if (markdown !== prevMarkdown) onChange(markdown);
    });
  });

  return <Milkdown />;
};

export const MilkdownEditor: React.FC<EditorProps> = (props) => {
  const { db, note, room } = props;
  const [doc, setDoc] = useState<Doc>();

  useEffect(() => {
    if (!note?._ref) return;
    const getDoc = async () => {
      const doc = await db.addTempDocToRoom(room, note._ref);
      // dispose of all other temp docs to only have one connected at a time and avoid 'too many listeners' errors from the events library
      Object.entries(room.tempDocs).forEach(([key, { matrixProvider }]) => {
        if (key !== note._ref) {
          matrixProvider?.dispose();
        }
      });
      await wait(500); // wait for the doc to get an update otherwise it will be empty and apply the default template
      if (doc) setDoc(doc);
    };
    getDoc();
  }, [db, note?._ref, room]);

  return (
    <MilkdownProvider>
      <div
        style={{
          minHeight: '3rem',
          width: '90%',
          margin: '3rem',
          padding: '3rem',
          border: '1px solid black',
        }}
      >
        {doc ? <MilkdownEditorInner {...props} doc={doc} /> : <>...</>}
      </div>
    </MilkdownProvider>
  );
};
const editable = () => false;
const MilkdownViewerInner: React.FC<{ markdown: string }> = ({ markdown }) => {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, markdown);
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          editable,
        }));
      })
      .config(nord)
      .use(commonmark)
  );

  return <Milkdown />;
};

export const MilkdownViewer: React.FC<{ markdown: string }> = ({
  markdown,
}) => (
  <MilkdownProvider>
    <MilkdownViewerInner markdown={markdown} />
  </MilkdownProvider>
);
