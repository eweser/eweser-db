import '@blocknote/core/fonts/inter.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import { useTheme } from '@/components/theme-provider';
import { getDeviceType, useDb } from '@/db';
import type { Note, Room } from '@eweser/db';
import { useNotesRoom } from '@/notes-room';
import { useEffect } from 'react';
import { Icons } from '@/lib/icons';
import { logger } from '@/utils';
import { blocksToOfm, ofmToBlocks } from '@/extensions/ofm-serializer';
import FrontmatterEditor from '@/components/frontmatter-editor';

const darkModeCursorColors = [
  '#ffe4a1', // Lightened orange
  '#ffc4c4', // Lightened red-pink
  '#ffb3ff', // Lightened magenta
  '#b3e6ff', // Lightened cyan
  '#ffd1a3', // Lightened peach
  '#ffb3b3', // Lightened rose
  '#c4ffc4', // Lightened green
  '#ffd6ff', // Lightened lavender
  '#a1d1ff', // Lightened sky blue
  '#ffb380', // Lightened coral
];

const lightModeCursorColors = [
  '#e63900', // Darker orange-red
  '#d92626', // Darker crimson
  '#26d926', // Darker lime green
  '#2626d9', // Darker royal blue
  '#d926d9', // Darker fuchsia
  '#26d9d9', // Darker teal
  '#d9d926', // Darker yellow-green
  '#e65c26', // Darker vermillion
  '#5c26e6', // Darker purple-blue
  '#2626e6', // Darker navy
];
export default function Editor({
  selectedRoom,
  selectedNoteId,
}: {
  selectedRoom: Room<Note>;
  selectedNoteId: string;
}) {
  const { loggedIn } = useDb();

  const { notes, updateNoteText, updateNoteFrontmatter, room } = useNotesRoom(
    selectedRoom.id,
    loggedIn
  );
  const provider = room?.syncProvider;
  const doc = room?.ydoc;

  const note = notes ? notes[selectedNoteId] : null;
  if (!note || !doc) {
    return <Icons.Spinner className="w-24 h-24 animate-spin" />;
  }
  // needs to be in a different component because hooks can't be called conditionally
  return (
    <EditorInternal
      selectedNoteId={selectedNoteId}
      provider={provider}
      doc={doc}
      updateNoteText={updateNoteText}
      updateNoteFrontmatter={updateNoteFrontmatter}
      note={note}
    />
  );
}

function EditorInternal({
  selectedNoteId,
  provider,
  doc,
  updateNoteText,
  updateNoteFrontmatter,
  note,
}: {
  selectedNoteId: string;
  provider: Room<Note>['syncProvider'];
  doc: NonNullable<Room<Note>['ydoc']>;
  updateNoteText: (text: string, note?: Note) => void;
  updateNoteFrontmatter: (
    frontmatter: Record<string, unknown>,
    note?: Note
  ) => void;
  note: Note;
}) {
  const { user } = useDb();
  const { theme } = useTheme();
  const usedTheme = theme === 'system' ? 'dark' : theme;
  const cursorColors =
    usedTheme === 'dark' ? darkModeCursorColors : lightModeCursorColors;
  /** Really this should be set to the OTHER user's color theme but that is impossible */
  const cursorColor =
    cursorColors[Math.floor(Math.random() * cursorColors.length)] ?? '#e6b45c';
  const editor = useCreateBlockNote({
    ...(provider
      ? {
          collaboration: {
            // The Yjs Provider responsible for transporting updates:
            provider,
            // Where to store BlockNote data in the Y.Doc:
            fragment: doc.getXmlFragment(selectedNoteId),
            // Information (name and color) for this user:
            user: {
              name: user.firstName || getDeviceType(),
              color: cursorColor,
            },
          },
        }
      : {}),
  });

  // Listen for changes and changes to the editor and update eweser-db note text
  // make the updateNoteText debounced so it doesn't update the note text on every keystroke
  const updateNoteTextDebounced = debounce(updateNoteText, 1000);
  editor.onChange(async (editor) => {
    // Use OFM serializer — preserves wiki-links, highlights, and other OFM syntax
    const isVaultNote = !!note.sourcePath;
    const text = isVaultNote
      ? await blocksToOfm(editor)
      : await editor.blocksToMarkdownLossy();
    updateNoteTextDebounced(text, note);
  });

  // Pull the initial note text from eweser-db and set it in the editor
  useEffect(() => {
    (async () => {
      if (!editor || !note.text) return;
      const existing = await editor.blocksToMarkdownLossy();
      if (existing && note.text && existing === note.text) {
        logger('existing === note.text');
      } else {
        // Use OFM-aware parser for vault notes
        const isVaultNote = !!note.sourcePath;
        const blocks = isVaultNote
          ? await ofmToBlocks(editor, note.text)
          : await editor.tryParseMarkdownToBlocks(note.text);
        editor.replaceBlocks(editor.document, blocks);
      }

      // set focus
      setTimeout(() => {
        const lastBlock = editor.document[editor.document.length - 1];
        if (lastBlock) {
          editor.setTextCursorPosition(lastBlock, 'end');
        }
        editor.focus();
      }, 0);
    })();
    // don't want to rerun on note text change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
  // TODO: listen for remote updates, but filter out updates that are from this browser

  return (
    <div data-cy="ewe-note-editor" className="editor-wrapper w-full max-w-full">
      <div className="max-w-5xl mx-auto w-full">
        {note.frontmatter && Object.keys(note.frontmatter).length > 0 && (
          <FrontmatterEditor
            note={note}
            onUpdate={(fm) => updateNoteFrontmatter(fm, note)}
          />
        )}
        <BlockNoteView
          editor={editor}
          theme={usedTheme}
          className="editor-view"
        />
      </div>
    </div>
  );
}

function debounce(func: (text: string, note?: Note) => void, wait: number) {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: [string, Note?]) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}
