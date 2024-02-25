import { useEffect, useState } from 'react';
import { Database } from '@eweser/db';
import type { Documents, Note, Registry, Room } from '@eweser/db';
import * as config from './config';
import { v4 as uuid } from 'uuid';
import { styles, StatusBar, LoginButton } from '@eweser/examples-components';

// This example shows how to implement a basic login/signup form and a basic note-taking app using @eweser/db
// The CRUD operations are all done directly on the yjs ydoc using the `Documents` object and its methods returned from `db.getDocuments()`

/** to make sure that we only have one default room created, make a new uuid for the default room, but if there is already one in localStorage use that*/
const randomRoomId = uuid();
const roomId = localStorage.getItem('roomId') || randomRoomId;
localStorage.setItem('roomId', roomId);
const collectionKey = 'notes';
/** A room is a group of documents that all share a common `Collection` type, like Note. Sharing and view permissions can be set on a per room basis */
const initialRooms: Registry = [
  {
    collectionKey,
    id: roomId,
    name: 'My Notes on Life and Things',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publicAccess: 'private',
    readAccess: [],
    writeAccess: [],
    adminAccess: [],
    token: '',
    ySweetUrl: '',
    _deleted: false,
    _ttl: '',
  },
];

const db = new Database({
  authServer: config.AUTH_SERVER,
  // set `logLevel` to 0 to see debug messages in the console
  logLevel: 0,
  // use this to sync webRTC locally with the test-rpc-server started with `npm run start-test-rpc-server`
  webRTCPeers: config.WEB_RTC_PEERS,
  initialRooms,
});
const loginUrl = db.generateLoginUrl({ name: 'Basic Example App' });

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (hasToken) {
      return;
    }
    const foundToken = db.getToken(); // will pull token from the query string or from localStorage
    if (foundToken) {
      setHasToken(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, window.location.search]); // token will be in the query string after login redirect

  useEffect(() => {
    if (loggedIn || !hasToken) {
      return;
    }
    async function login() {
      const loginRes = await db.login();
      if (loginRes) {
        setLoggedIn(true);
      }
    }
    login();
  }, [loggedIn, hasToken]);

  db.on('roomsLoaded', () => {
    setLoaded(true);
  });

  const defaultNotesRoom = db.getRoom<Note>(collectionKey, roomId);

  return (
    <div style={styles.appRoot}>
      {/* You can check that the ydoc exists to make sure the room is connected */}
      {loaded && defaultNotesRoom?.ydoc ? (
        <NotesInternal notesRoom={defaultNotesRoom} />
      ) : (
        // usually loads almost instantaneously, but we need to make sure a yDoc is ready before we can use it
        <>loading...</>
      )}

      {!loggedIn && (
        <div>
          Log in to sync your notes to the cloud and other devices
          <LoginButton loginUrl={loginUrl} />
        </div>
      )}
      <StatusBar db={db} />
    </div>
  );
};

const NotesInternal = ({ notesRoom }: { notesRoom: Room<Note> }) => {
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
