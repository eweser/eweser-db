import { useEffect, useState } from 'react';
import { ulid } from 'ulid';
import { CollectionKey, Database, buildRef, newDocument } from '@eweser/db';
import type { Documents, Note, LoginData, Room } from '@eweser/db';
import * as config from './config';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';
import { WEB_RTC_PEERS } from './config';

// This example shows how to implement a basic login/signup form and a basic note-taking app using @eweser/db
// The CRUD operations are all done directly on the ydoc.
// For most real-world use-cases you will probably want to pass the doc to a helper library like synced-store https://syncedstore.org/docs/.
// or pass the doc to an editor like prosemirror (preferably a subdoc like in the `example-editor` example to maintain interoperability)

/** basically the code-facing 'name' of a room. This will be used to generate the `roomAlias that matrix uses to identify rooms */
const aliasSeed = 'notes-default';
const collectionKey = CollectionKey.notes;
/** a room is a group of documents that all share a common `Collection` type, like Note. A room also corresponds with a Matrix chat room where the data is stored. */
const initialRoomConnect = {
  collectionKey,
  aliasSeed,
  name: 'My Notes on Life and Things',
};

// use this to sync webRTC locally with the test-rpc-server
const db = new Database({
  // set `debug` to true to see debug messages in the console
  // debug: true,
  webRTCPeers: WEB_RTC_PEERS,
});

const App = () => {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Set within a useEffect to make sure to only call `db.load()` and `db.on()` once
    db.on('my-listener-name', ({ event }) => {
      // 'started' or 'startFailed' will be called as the result of either db.load(), db.login(), or db.signup()
      if (event === 'started') {
        // after this message the database is ready to be used, but syncing to remote may still be in progress
        setStarted(true);
      }
    });
    // `db.load()` tries to start up the database from an existing localStore. This will only work if the user has previously logged in from this device
    db.load([initialRoomConnect]);
    return () => {
      // practice good hygiene and clean up when the component unmounts
      db.off('my-listener-name');
      db.disconnectRoom(initialRoomConnect);
    };
  }, []);

  const handleLogin = (loginData: LoginData) =>
    db.login({ initialRoomConnect, ...loginData });

  const handleSignup = (loginData: LoginData) =>
    db.signup({ initialRoomConnect, ...loginData });

  const defaultNotesRoom = db.getRoom<Note>(collectionKey, aliasSeed);

  return (
    <div style={styles.appRoot}>
      {/* You can check that the ydoc exists to make sure the room is connected */}
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

const buildNewNote = () => {
  const documentId = ulid();
  // a ref is used to build up links between documents. It is a string that looks like `collectionKey:aliasSeed:documentId`
  const ref = buildRef({
    collectionKey,
    aliasSeed,
    documentId,
  });
  return newDocument<Note>(ref, { text: 'New Note Body' });
};

const NotesInternal = ({ notesRoom }: { notesRoom: Room<Note> }) => {
  // initialize the ydoc with .getMap() and then use .observe() to update the state when the ydoc changes
  const notesDoc = notesRoom.ydoc?.getMap('documents');

  const [notes, setNotes] = useState<Documents<Note>>(notesDoc?.toJSON() ?? {});

  // You can also delete entries by setting them to undefined/null, but it is better to use the _deleted flag to mark them for deletion later just in case the user changes their mind
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
    const newNote = buildNewNote();
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

  const getDocumentByRef = async (ref: string) => {
    //
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
                <div style={{ display: 'flex' }}>
                  <button>+ Link flashcard</button>
                  {note.flashcardRefs?.length &&
                    note.flashcardRefs.length > 0 && (
                      <>
                        <p>Linked Flashcards:</p>
                        {note.flashcardRefs.map((ref) => {
                          return null;
                        })}
                      </>
                    )}
                </div>
              </div>
            );
        })}
      </div>
    </>
  );
};

export default App;
