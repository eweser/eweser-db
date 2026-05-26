/**
 * Purpose: TipTap editor bridge for room-backed notes.
 * Exports: Editor default component.
 * Touches: Yjs fragments, provider collaboration, OFM serialization, and saves.
 * Read before editing: packages/ewe-note/src/INDEX.md and notes-room.tsx.
 */
import { useTheme } from '@/components/theme-provider';
import { getDeviceType, useDb } from '@/db';
import type { Note, Room } from '@eweser/db';
import { useNotesRoom } from '@/notes-room';
import { Icons } from '@/lib/icons';
import FrontmatterEditor from '@/components/frontmatter-editor';
import { TiptapEditor } from '@/components/tiptap-editor';
import { useEditorAttachmentContext } from '@/components/editor-attachments';
import type { Editor as TiptapEditorInstance } from '@tiptap/react';

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
  onEditorReady,
  onEditorFocusChange,
  onNavigateWikiLink,
  sourceMode,
  onSourceModeChange,
}: {
  selectedRoom: Room<Note>;
  selectedNoteId: string;
  showFrontmatterEditor?: boolean;
  onEditorReady?: (editor: TiptapEditorInstance | null) => void;
  onEditorFocusChange?: (focused: boolean) => void;
  onNavigateWikiLink?: (href: string) => void;
  sourceMode?: boolean;
  onSourceModeChange?: (sourceMode: boolean) => void;
}) {
  const { loggedIn } = useDb();

  const { notes, updateNoteText, updateNoteFrontmatter, room } = useNotesRoom(
    selectedRoom.id,
    loggedIn
  );
  const provider = room?.syncProvider;
  const doc = room?.ydoc;
  const editorInstanceKey = `${selectedRoom.id}:${selectedNoteId}:${
    provider?.awareness ? 'collab' : 'local'
  }`;

  const note = notes ? notes[selectedNoteId] : null;
  if (!note || !doc) {
    return <Icons.Spinner className="w-24 h-24 animate-spin" />;
  }
  // needs to be in a different component because hooks can't be called conditionally
  return (
    <EditorInternal
      key={editorInstanceKey}
      selectedNoteId={selectedNoteId}
      provider={provider}
      doc={doc}
      updateNoteText={updateNoteText}
      updateNoteFrontmatter={updateNoteFrontmatter}
      note={note}
      noteRoomId={selectedRoom.id}
      showFrontmatterEditor={showFrontmatterEditor}
      onEditorReady={onEditorReady}
      onEditorFocusChange={onEditorFocusChange}
      onNavigateWikiLink={onNavigateWikiLink}
      sourceMode={sourceMode}
      onSourceModeChange={onSourceModeChange}
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
  noteRoomId,
  showFrontmatterEditor,
  onEditorReady,
  onEditorFocusChange,
  onNavigateWikiLink,
  sourceMode,
  onSourceModeChange,
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
  noteRoomId: string;
  showFrontmatterEditor: boolean;
  onEditorReady?: (editor: TiptapEditorInstance | null) => void;
  onEditorFocusChange?: (focused: boolean) => void;
  onNavigateWikiLink?: (href: string) => void;
  sourceMode?: boolean;
  onSourceModeChange?: (sourceMode: boolean) => void;
}) {
  const { db, user } = useDb();
  const { resolvedMode } = useTheme();
  const attachmentContext = useEditorAttachmentContext({
    db,
    note,
    noteRoomId,
  });
  const usedTheme = resolvedMode;
  const cursorColors =
    usedTheme === 'dark' ? darkModeCursorColors : lightModeCursorColors;
  const cursorColor =
    cursorColors[Math.floor(Math.random() * cursorColors.length)] ?? '#e6b45c';

  return (
    <div data-cy="ewe-note-editor" className="editor-wrapper w-full max-w-full">
      <div className="mx-auto w-full max-w-[46rem]">
        {showFrontmatterEditor && (
          <FrontmatterEditor
            note={note}
            onUpdate={(fm) => updateNoteFrontmatter(fm, note)}
          />
        )}
        <TiptapEditor
          note={note}
          doc={doc}
          provider={provider}
          selectedNoteId={selectedNoteId}
          onSaveMarkdown={updateNoteText}
          userName={user.firstName || getDeviceType()}
          userColor={cursorColor}
          onEditorReady={onEditorReady}
          onEditorFocusChange={onEditorFocusChange}
          onNavigateWikiLink={onNavigateWikiLink}
          sourceMode={sourceMode}
          onSourceModeChange={onSourceModeChange}
          attachmentContext={attachmentContext}
        />
      </div>
    </div>
  );
}
