import { useEffect, useState } from 'react';
import { CollectionKey, Database, buildRef, newDocument } from '@eweser/db';
import type { Documents, Note, LoginData, Room } from '@eweser/db';

import LoginForm from './LoginForm';
import { StatusBar } from './StatusBar';

import { styles } from './styles';

/** basically the code-facing 'name' of a room. This will be used to generate the `roomAlias that matrix uses to identify rooms */
const aliasSeed = 'notes-default';
const roomConfig = {
  collectionKey: CollectionKey.notes,
  aliasSeed,
  name: 'My Notes on Life and Things',
};

const db = new Database({
  // set `debug` to true to see debug messages in the console
  debug: true,
});

const App = () => {
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Set within a useEffect to make sure to only call `db.load()` and `db.on()` once
    db.on(({ event }) => {
      // 'started' or 'startFailed' will be called as the result of either db.load(), db.login(), or db.signup()
      if (event === 'started') {
        // after this message the database is ready to be used, but syncing to remote may still be in progress
        setStarted(true);
      }
      if (event === 'startFailed') {
        setFailed(true);
      }
    });
    // `db.load()` tries to start up the database from an existing localStore. This will only work if the user has previously logged in from this device
    db.load([roomConfig]);
  }, []);

  const handleLogin = (loginData: LoginData) => {
    setFailed(false);
    db.login({ initialRoomConnect: roomConfig, ...loginData });
  };
  const handleSignup = (loginData: LoginData) => {
    setFailed(false);
    db.signup({ initialRoomConnect: roomConfig, ...loginData });
  };

  const defaultNotesRoom = db.getRoom<Note>(CollectionKey.notes, aliasSeed);

  return (
    <div style={styles.appRoot}>
      {started && defaultNotesRoom?.ydoc ? (
        <NotesInternal notesRoom={defaultNotesRoom} />
      ) : (
        <LoginForm
          handleLogin={handleLogin}
          handleSignup={handleSignup}
          failed={failed}
          db={db}
        />
      )}
      <StatusBar db={db} />
    </div>
  );
};

const buildNewNote = (notes: Documents<Note>) => {
  const id = Object.keys(notes).length;
  const ref = buildRef({
    collection: CollectionKey.notes,
    aliasSeed: aliasSeed,
    documentID: id,
  });
  const newNote = newDocument<Note>(ref, {
    text: 'New Note Body',
  });
  return newNote;
};

const NotesInternal = ({ notesRoom }: { notesRoom: Room<Note> }) => {
  const notesDoc = notesRoom.ydoc?.getMap('documents');

  const [notes, setNotes] = useState<Documents<Note>>(notesDoc?.toJSON() ?? {});

  const nonDeletedNotes = Object.keys(notes).filter(
    (id) => !notes[id]?._deleted
  );

  const [selectedNote, setSelectedNote] = useState(nonDeletedNotes[0]);

  notesDoc?.observe((_event) => {
    setNotes(notesDoc?.toJSON());
  });

  const setNote = (note: Note) => {
    notesDoc?.set(note._id, note);
  };

  const createNote = () => {
    const newNote = buildNewNote(notes);
    setNote(newNote);
    setSelectedNote(newNote._id);
  };

  const updateNoteText = (text: string, note?: Note) => {
    if (!note) return;
    note.text = text;
    setNote(note);
  };

  const deleteNote = (note: Note) => {
    // This marks the document safe to delete from the database after 30 days
    const oneMonth = 1000 * 60 * 60 * 24 * 30;
    note._deleted = true;
    note._ttl = new Date().getTime() + oneMonth;
    setNote(note);
  };

  return (
    <>
      <h1>Edit</h1>
      {nonDeletedNotes.length === 0 ? (
        <div>No notes found. Please create one</div>
      ) : (
        <textarea
          style={styles.editor}
          name="main-card-editor"
          value={notes[selectedNote]?.text ?? ''}
          onChange={(e) => {
            updateNoteText(e.target.value, notes[selectedNote]);
          }}
        />
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
                  onClick={() => deleteNote(note)}
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
