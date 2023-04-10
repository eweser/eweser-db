import React from 'react';
import { Editor, rootCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/preset-commonmark';
import { collabServiceCtx, collab } from '@milkdown/plugin-collab';
import { Note, YDoc } from '@eweser/db';
import { Doc } from 'yjs';

const MilkdownEditor: React.FC<{ doc: Doc }> = ({ doc }) => {
  const editor = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
      })
      .config(nord)
      .use(commonmark)
      .use(collab)
  );
  editor.get()?.action((ctx) => {
    const collabService = ctx.get(collabServiceCtx);
    collabService
      // bind doc and awareness
      .bindDoc(doc as any)
      // connect yjs with milkdown
      .connect();
  });

  return <Milkdown />;
};

export const MilkdownEditorWrapper: React.FC<{ doc: Doc }> = ({ doc }) => {
  return (
    <MilkdownProvider>
      <MilkdownEditor doc={doc} />
    </MilkdownProvider>
  );
};
