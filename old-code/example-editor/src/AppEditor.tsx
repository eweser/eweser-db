import { memo, useCallback, useEffect, useState } from 'react';
import { CollectionKey, Database } from '@eweser/db';
import type { Documents, Note, LoginData, Room } from '@eweser/db';

import * as config from './config';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';

import { MilkdownEditor, MilkdownViewer } from './Editor';
import { WEB_RTC_PEERS } from './config';

// This example shows how to implement a collaborative editor using @eweser/db. It uses the `example-basic` example as a starting point.
// It creates a new ydoc for each note that is being actively edited. This allows for multiple users or a user from multiple devices to edit the same note at the same time and have it sync without conflict.
// each change updates the 'room' level doc that stores a simple text output of the note. This is used to display a list of notes.

const aliasSeed = 'notes-default';
const collectionKey = CollectionKey.notes;

const initialRoomConnect = {
  collectionKey,
  aliasSeed,
  name: 'My Notes on Life and Things',
};

const db = new Database({
  // set `debug` to true to see debug messages in the console
  // debug: true,
  webRTCPeers: WEB_RTC_PEERS,
});

const App = () => {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    db.on('my-listener-name', ({ event }) => {
      if (event === 'started') {
        setStarted(true);
      }
    });
    db.load([initialRoomConnect]);
    return () => {
      db.off('my-listener-name');
      db.disconnectRoom(initialRoomConnect);
    };
  }, []);

  const handleLogin = (loginData: LoginData) =>
    db.login({ initialRoomConnect, ...loginData });

  const handleSignup = (loginData: LoginData) =>
    db.signup({ initialRoomConnect, ...loginData });

  const defaultNotesRoom = db.getRoom<Note>({ collectionKey, aliasSeed });

  return (
    <div style={styles.appRoot}>
      {started && defaultNotesRoom?.ydoc ? (
        <NotesInternal notesRoom={defaultNotesRoom} />
      ) : (
        <LoginForm
          handleLogin={handleLogin}
          handleSignup={handleSignup}
          db={db}
          {...config}
        />
      )}
      <StatusBar db={db} />
    </div>
  );
};

/**
 * We memoize the editor so that it only updates when the note changes.
 * We are doing some important doc connections in this component so please see `./Editor.tsx` for details
 */
const EditorMemoIzed = memo(MilkdownEditor, (prev, next) => {
  const doNotUpdate = prev.note?._id === next.note?._id;
  return doNotUpdate;
});

const NotesInternal = ({ notesRoom }: { notesRoom: Room<Note> }) => {
  const Notes = db.getDocuments(notesRoom);
  const [notes, setNotes] = useState<Documents<Note>>(
    Notes.sortByRecent(Notes.getUndeleted())
  );

  const [selectedNote, setSelectedNote] = useState(notes[0]?._id);

  Notes?.onChange((_event) => {
    const unDeleted = Notes.sortByRecent(Notes.getUndeleted());
    setNotes(unDeleted);
    if (!notes[selectedNote] || notes[selectedNote]._deleted) {
      setSelectedNote(Object.keys(unDeleted)[0]);
    }
  });

  const createNote = () => {
    const newNote = Notes.new({ text: 'My __markdown__ note' });
    setSelectedNote(newNote._id);
  };

  const deleteNote = (note: Note) => {
    Notes.delete(note._id);
    notesRoom.tempDocs[note._ref]?.matrixProvider?.dispose();
  };

  const updateNoteText = useCallback(
    (text: string, note?: Note) => {
      if (!note) return;
      note.text = text;
      Notes.set(note);
    },
    [Notes]
  );

  return (
    <>
      <h1>Edit</h1>
      <EditorMemoIzed
        key={selectedNote}
        {...{
          note: notes[selectedNote],
          db,
          onChange: (text) => updateNoteText(text, notes[selectedNote]),
          // eslint-disable-next-line
          room: notesRoom!,
        }}
      />
      {Object.keys(notes).length === 0 && (
        <div>No notes found. Please create one</div>
      )}

      <h1>Notes</h1>

      <button onClick={() => createNote()}>New note</button>

      <div style={styles.flexWrap}>
        {Object.keys(notes).map((id) => {
          const note = notes[id];
          if (note && !notes[id]?._deleted)
            return (
              <div
                onClick={() => setSelectedNote(note._id)}
                style={styles.card}
                key={note._id}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note);
                  }}
                  style={styles.deleteButton}
                >
                  X
                </button>
                <MilkdownViewer key={note.text} markdown={note.text} />
              </div>
            );
        })}
      </div>
    </>
  );
};

export default App;
