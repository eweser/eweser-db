import { useEffect, useState } from 'react';
import { CollectionKey, Database } from '@eweser/db';
import type { Documents, Note, LoginData, Room } from '@eweser/db';
import * as config from './config';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';

const aliasSeed = 'notes-default';
const collectionKey = CollectionKey.notes;

const initialRoomConnect: LoginData['initialRoomConnect'] = {
  collectionKey,
  aliasSeed,
  name: 'My Notes on Life and Things',
};

const db = new Database({
  webRTCPeers: config.WEB_RTC_PEERS,
});
const localDb = new Database({
  offlineOnly: true,
  debug: true,
});

localDb.createOfflineRoom(initialRoomConnect);

const App = () => {
  const [localReady, setLocalReady] = useState(false);
  const [useLocal, setUseLocal] = useState(true);
  useEffect(() => {
    localDb.on('my-listener-name', ({ event, message }) => {
      if (event === 'createOfflineRoom' && message === 'ydoc created') {
        setLocalReady(true);
      }
    });
    db.on('my-listener-name', ({ event }) => {
      if (event === 'started') {
        setUseLocal(false);
      }
    });
    db.load([initialRoomConnect]);
    return () => {
      localDb.off('my-listener-name');
      db.off('my-listener-name');
      db.disconnectRoom(initialRoomConnect);
    };
  }, []);
  const [showLogin, setShowLogin] = useState(false);
  const defaultNotesRoom = db.getRoom<Note>({ collectionKey, aliasSeed });
  const offlineRoom = localDb.getRoom<Note>({ collectionKey, aliasSeed });
  const handleLogin = async (loginData: LoginData) => {
    if (offlineRoom?.ydoc) {
      const Notes = db.getDocuments(offlineRoom);
      const unDeleted = Notes.sortByRecent(Notes.getUndeleted());
      initialRoomConnect.initialValues = Object.values(unDeleted);
    }
    await db.login({ initialRoomConnect, ...loginData });
    setShowLogin(false);
    setUseLocal(false);
  };

  const handleSignup = async (loginData: LoginData) => {
    if (offlineRoom?.ydoc) {
      const Notes = db.getDocuments(offlineRoom);
      const unDeleted = Notes.sortByRecent(Notes.getUndeleted());
      initialRoomConnect.initialValues = Object.values(unDeleted);
    }
    await db.signup({ initialRoomConnect, ...loginData });
    setShowLogin(false);
    setUseLocal(false);
  };

  return (
    <div style={styles.appRoot}>
      {!showLogin ? (
        localReady && offlineRoom?.ydoc ? (
          <>
            <NotesInternal
              notesRoom={defaultNotesRoom ?? offlineRoom}
              setShowLogin={setShowLogin}
              loggedIn={!useLocal}
            />
          </>
        ) : (
          <div>loading...</div>
        )
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

const NotesInternal = ({
  notesRoom,
  setShowLogin,
  loggedIn,
}: {
  notesRoom: Room<Note>;
  setShowLogin: (show: boolean) => void;
  loggedIn: boolean;
}) => {
  // This Notes object provides a set of methods for easily updating the documents in the room. It is a wrapper around the ydoc that is provided by the room.
  const Notes = db.getDocuments(notesRoom);

  const [notes, setNotes] = useState<Documents<Note>>(
    Notes.sortByRecent(Notes.getUndeleted())
  );

  const [selectedNote, setSelectedNote] = useState(
    Object.keys(Notes.sortByRecent(Notes.getUndeleted()))[0]
  );

  // listen for changes to the ydoc and update the state
  Notes.onChange((_event) => {
    const unDeleted = Notes.sortByRecent(Notes.getUndeleted());
    setNotes(unDeleted);
    if (!unDeleted[selectedNote]) {
      setSelectedNote(Object.keys(unDeleted)[0]);
    }
  });

  const createNote = () => {
    // Notes.new will fill in the metadata for you, including _id with a random string and _updated with the current timestamp
    const newNote = Notes.new({ text: 'New Note Body' });
    setSelectedNote(newNote._id);
  };

  const updateNoteText = (text: string, note?: Note) => {
    if (!note) return;
    note.text = text;
    // Notes.set will update _updated with the current timestamp
    Notes.set(note);
  };

  const deleteNote = (note: Note) => {
    Notes.delete(note._id);
  };
  return (
    <>
      <button
        onClick={() => {
          if (loggedIn) {
            db.logout(); // note that logout does not remove the local database. If you want to do that, use dexie or idb, or indexedDB directly and delete the database
            //   const databases = await window.indexedDB.databases();
            // for (const database of databases) {
            // if (database.name) await deleteDB(database.name);
            // }

            window.location.reload();
          } else {
            setShowLogin(true);
          }
        }}
        style={{ position: 'absolute', right: '1rem', top: '1rem' }}
      >
        {loggedIn ? 'Sign out' : 'Sign in'}
      </button>
      <h1>Edit</h1>
      {Object.keys(notes)?.length === 0 ? (
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
                {note.text}
              </div>
            );
        })}
      </div>
    </>
  );
};

export default App;
