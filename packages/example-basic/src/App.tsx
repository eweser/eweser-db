import { useEffect, useState } from 'react';
import {
  CollectionKey,
  Database,
  LoginData,
  Room,
  buildAliasFromSeed,
  buildRef,
  newDocument,
} from '@eweser/db';
import type { Documents, Note } from '@eweser/db';

import LoginForm from './LoginForm';

import { styles } from './styles';
import { MATRIX_SERVER } from './config';

const aliasSeed = 'notes-default';
const defaultRoomConfig = {
  collectionKey: CollectionKey.notes,
  aliasSeed,
  name: 'Default Notes Collection',
};

const db = new Database({ baseUrl: MATRIX_SERVER, debug: true });

const App = () => {
  const [loginStatus, setLoginStatus] = useState(db.loginStatus);
  const [roomConnectionStatus, setRoomConnectionStatus] = useState('initial');

  // add a db.load() to try to load login from localStorage

  // add an 'initialRoomConnection' to db.login to skip the 'connectRoom' event

  db.on(({ event, data }) => {
    if (data?.loginStatus) {
      setLoginStatus(data.loginStatus);
    }
    // listen for the 'connectRoom' event to know when the collection is ready
    if (event === 'connectRoom') {
      if (data?.connectStatus && data.aliasSeed === aliasSeed) {
        setRoomConnectionStatus(data.connectStatus);
      }
    }
  });

  const defaultNotesRoom = db.collections[CollectionKey.notes][aliasSeed];
  if (loginStatus === 'initial') {
    return (
      <LoginForm
        handleLogin={(loginData: LoginData) =>
          db.login({ initialRoomConnect: defaultRoomConfig, ...loginData })
        }
        loginStatus={loginStatus}
      />
    );
  } else if (loginStatus === 'loading') {
    return <div>Logging in...</div>;
  } else if (loginStatus === 'ok' && roomConnectionStatus !== 'ok') {
    return <div>Connecting collection...</div>;
  } else if (loginStatus === 'ok' && defaultNotesRoom.ydoc) {
    return <NotesInternal notesRoom={defaultNotesRoom} />;
  } else {
    return <div>Something went wrong</div>;
  }
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

  notesDoc?.observe((event) => {
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

  useEffect(() => {
    // makes sure we have a selected note on initial load
    setSelectedNote(nonDeletedNotes[0]);
  }, []);

  return (
    <div>
      <div>
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
      </div>

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
    </div>
  );
};

export default App;
