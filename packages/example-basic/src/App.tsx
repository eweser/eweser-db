import { useEffect, useState } from 'react';
import { CollectionKey, Database, buildRef, newDocument } from '@eweser/db';
import type { Documents, Note, LoginData, Room, DBEvent } from '@eweser/db';

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

// const DBContext = createContext(db);

// const DBProvider = ({ children }: { children: React.ReactNode }) => {
//   return <DBContext.Provider value={db}>{children}</DBContext.Provider>;
// };

const StatusBar = ({ db }: { db: Database }) => {
  const [statusMessage, setStatusMessage] = useState('initializing');
  // listen to various database events and update the status bar at the bottom of the screen.
  // This could be used to show icons like connected/offline or a syncing spinner like in google sheets

  useEffect(() => {
    const handleStatusUpdate = ({ event, message }: DBEvent) => {
      if (event === 'load') {
        if (message === 'loading from localStorage') {
          setStatusMessage('loading local database');
        }
        if (message?.includes('unable to load localStore')) {
          setStatusMessage('no local database found');
        }
        if (message === 'loaded from localStorage') {
          setStatusMessage('loaded local database');
        }
        if (message === 'load, online: true') {
          setStatusMessage('loaded local database, connecting remote');
        }
        if (message === 'load, connected rooms') {
          setStatusMessage('loaded local database, connected to remote');
        }
        if (message === 'load, login failed') {
          setStatusMessage('loaded local database, offline');
        }
      }
    };
    db.on(handleStatusUpdate);
  }, [db, setStatusMessage]);
  return <div style={styles.statusBar}>{statusMessage}</div>;
};

// const AppWrapper = () => {
//   return (
//     <DBProvider>
//       <App />
//     </DBProvider>
//   );
// }

const App = () => {
  const [loginStatus, setLoginStatus] = useState(db.loginStatus);
  const [localLoaded, setLocalLoaded] = useState(false);

  useEffect(() => {
    // Set within a useEffect to make sure to only load and set the db.on() callback once
    db.on(({ data, message }) => {
      // this will be called during db.login or db.signup
      if (data?.loginStatus) {
        setLoginStatus(data.loginStatus);
      }
      // this will be called on db.load()
      // after this message the database is ready to be used, but syncing to remote may still be in progress
      if (message === 'loaded from localStorage') {
        setLocalLoaded(true);
      }
    });

    db.load([defaultRoomConfig]);
  }, [db, setLoginStatus]);

  const handleLogin = (loginData: LoginData) =>
    db.login({ initialRoomConnect: defaultRoomConfig, ...loginData });
  const handleSignup = (loginData: LoginData) =>
    db.signup({ initialRoomConnect: defaultRoomConfig, ...loginData });

  const defaultNotesRoom = db.getRoom<Note>(CollectionKey.notes, aliasSeed);

  const dbReady = localLoaded || loginStatus === 'ok';

  return (
    <div style={styles.appRoot}>
      {dbReady && defaultNotesRoom?.ydoc ? (
        <NotesInternal notesRoom={defaultNotesRoom} />
      ) : (
        <LoginForm
          handleLogin={handleLogin}
          handleSignup={handleSignup}
          loginStatus={loginStatus}
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

  useEffect(() => {
    // makes sure we have a selected note on initial load
    setSelectedNote(nonDeletedNotes[0]);
  }, []);

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
