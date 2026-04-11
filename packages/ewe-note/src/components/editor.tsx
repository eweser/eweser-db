import '@blocknote/core/fonts/inter.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import { useTheme } from '@/components/theme-provider';
import { getDeviceType, useDb } from '@/db';
import type { Note, Room } from '@eweser/db';
import { useNotesRoom } from '@/notes-room';
import { useEffect, useRef } from 'react';
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
  showFrontmatterEditor = true,
}: {
  selectedRoom: Room<Note>;
  selectedNoteId: string;
  showFrontmatterEditor?: boolean;
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
      key={selectedNoteId}
      selectedNoteId={selectedNoteId}
      provider={provider}
      doc={doc}
      updateNoteText={updateNoteText}
      updateNoteFrontmatter={updateNoteFrontmatter}
      note={note}
      showFrontmatterEditor={showFrontmatterEditor}
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
  showFrontmatterEditor,
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
  showFrontmatterEditor: boolean;
}) {
  const { user } = useDb();
  const { resolvedMode } = useTheme();
  const usedTheme = resolvedMode;
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

  // Stable ref so the onChange closure always sees the latest note without re-registering
  const noteRef = useRef(note);
  useEffect(() => {
    noteRef.current = note;
  });

  // Stable debounced save — created once per editor instance
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = debounce(updateNoteText, 1000);
  }

  // Flush any pending debounced save when the note changes (component unmounts)
  useEffect(() => {
    return () => {
      debouncedSaveRef.current?.flush();
    };
  }, []);

  // Register onChange once; use refs so we never need to re-register
  useEffect(() => {
    const unsubscribe = editor.onChange(async (e) => {
      const currentNote = noteRef.current;
      const isVaultNote = !!currentNote.sourcePath;
      const text = isVaultNote
        ? await blocksToOfm(e)
        : await e.blocksToMarkdownLossy();
      debouncedSaveRef.current?.(text, currentNote);
    });
    return () => {
      unsubscribe?.();
    };
  }, [editor]);

  // Pull the initial note text from eweser-db and set it in the editor
  useEffect(() => {
    (async () => {
      if (!editor) return;

      // When collaboration is active, the Yjs XML fragment is the source of
      // truth. Only fall back to note.text if the fragment is empty (first
      // time this note is opened before any Yjs content has been written).
      if (provider) {
        const fragment = doc.getXmlFragment(selectedNoteId);
        const fragmentHasContent = fragment.length > 0;
        if (fragmentHasContent) {
          // Yjs already has content — just focus the editor.
          setTimeout(() => {
            const lastBlock = editor.document[editor.document.length - 1];
            if (lastBlock) {
              editor.setTextCursorPosition(lastBlock, 'end');
            }
            editor.focus();
          }, 0);
          return;
        }
      }

      // Offline / no collaboration, or Yjs fragment is empty — seed from note.text.
      if (!note.text) return;
      const existing = await editor.blocksToMarkdownLossy();
      if (existing && existing === note.text) {
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
        {showFrontmatterEditor &&
          note.frontmatter &&
          Object.keys(note.frontmatter).length > 0 && (
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
  let lastArgs: [string, Note?] | null = null;

  const debounced = function (...args: [string, Note?]) {
    lastArgs = args;
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      lastArgs = null;
      timeout = null;
      func(...args);
    }, wait);
  };

  /** Immediately call the function if there is a pending debounce */
  debounced.flush = function () {
    if (timeout && lastArgs) {
      clearTimeout(timeout);
      timeout = null;
      const args = lastArgs;
      lastArgs = null;
      func(...args);
    }
  };

  return debounced;
}
