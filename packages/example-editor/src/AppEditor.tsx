import { memo, useCallback, useEffect, useState } from 'react';
import { CollectionKey, Database, buildRef, newDocument } from '@eweser/db';
import type { Documents, Note, LoginData, Room, TypedMap } from '@eweser/db';
import { ulid } from 'ulid';

import {
  styles,
  StatusBar,
  LoginForm,
  MilkdownEditorWrapper,
} from '@eweser/examples-components';

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
});

const App = () => {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    db.on('my-listener-name', ({ event, data }) => {
      if (event === 'started') {
        setStarted(true);
      }
      // todo: add this functionality to the db
      if (event === 'onlineChange') {
        if (data?.online) {
          db.load([initialRoomConnect]);
        }
      }
    });
    db.load([initialRoomConnect]);
    return () => {
      db.off('my-listener-name');
    };
  }, []);

  const handleLogin = (loginData: LoginData) =>
    db.login({ initialRoomConnect, ...loginData });

  const handleSignup = (loginData: LoginData) =>
    db.signup({ initialRoomConnect, ...loginData });

  const defaultNotesRoom = db.getRoom<Note>(collectionKey, aliasSeed);
  const notesDoc = defaultNotesRoom?.ydoc?.getMap('documents');

  return (
    <div style={styles.appRoot}>
      {started && notesDoc && defaultNotesRoom?.ydoc ? (
        <NotesInternal
          notesRoom={defaultNotesRoom}
          db={db}
          notesDoc={notesDoc}
        />
      ) : (
        <LoginForm
          handleLogin={handleLogin}
          handleSignup={handleSignup}
          db={db}
        />
      )}
      <StatusBar db={db} />
    </div>
  );
};

const buildNewNote = () => {
  const documentId = ulid();

  // a ref is used to build up links between documents. It is a string that looks like `collectionKey:aliasSeed:documentId`
  const ref = buildRef({
    collectionKey,
    aliasSeed,
    documentId,
  });

  return newDocument<Note>(ref, { text: 'My __markdown__ note' });
};

const EditorMemoIzed = memo(MilkdownEditorWrapper, (prev, next) => {
  const dontUpdate = prev.note?._id === next.note?._id;
  return dontUpdate;
});

const NotesInternal = ({
  notesRoom,
  db,
  notesDoc,
}: {
  notesDoc: TypedMap<Documents<Note>>;
  notesRoom: Room<Note>;
  db: Database;
}) => {
  const [notes, setNotes] = useState<Documents<Note>>(notesDoc?.toJSON() ?? {});

  const nonDeletedNotes = Object.keys(notes).filter(
    (id) => !notes[id]?._deleted
  );

  const [selectedNote, setSelectedNote] = useState(nonDeletedNotes[0]);

  notesDoc?.observe((_event) => {
    setNotes(notesDoc?.toJSON());
  });

  const setNote = useCallback(
    (note: Note) => {
      notesDoc?.set(note._id, note);
    },
    [notesDoc]
  );

  const createNote = () => {
    const newNote = buildNewNote();
    setNote(newNote);
    setSelectedNote(newNote._id);
  };

  const updateNoteText = useCallback(
    (text: string, note?: Note) => {
      if (!note) return;
      note.text = text;
      setNote(note);
    },
    [setNote]
  );

  const deleteNote = (note: Note) => {
    const oneMonth = 1000 * 60 * 60 * 24 * 30;
    note._deleted = true;
    note._ttl = new Date().getTime() + oneMonth;
    const nonDeletedNotes = Object.keys(notes).filter(
      (id) => !notes[id]?._deleted && note._id !== id
    );
    notesRoom.tempDocs[note._ref]?.matrixProvider?.dispose();
    setSelectedNote(nonDeletedNotes[0]);
    setNote(note);
  };

  return (
    <>
      <h1>Edit</h1>
      <EditorMemoIzed
        key={selectedNote}
        {...{
          note: notes[selectedNote],
          db,
          onChange: (text) => updateNoteText(text, notes[selectedNote]),
          room: notesRoom,
        }}
      />
      {nonDeletedNotes.length === 0 && (
        <div>No notes found. Please create one</div>
      )}

      <h1>Notes</h1>

      <button onClick={() => createNote()}>New note</button>

      <div style={styles.flexWrap}>
        {nonDeletedNotes.map((id) => {
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
                {note.text}
              </div>
            );
        })}
      </div>
    </>
  );
};

export default App;
