import { useEffect, useState } from 'react';
import { ulid } from 'ulid';
import { CollectionKey, Database, buildRef, newDocument } from '@eweser/db';
import type { Documents, Note, LoginData, YDoc } from '@eweser/db';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';
import * as config from './config';

import { useSyncedStore } from '@syncedstore/react';
import syncedStore from '@syncedstore/core';
import type { MappedTypeDescription } from '@syncedstore/core/types/doc';
import { WEB_RTC_PEERS } from './config';

// WARNING: This example is broken ever since including yjs as a dependency in @eweser/db. SyncedStore expects yjs to be an external dependency.

// This example shows how to implement a basic login/signup form and a basic note-taking app using @eweser/db and the [syncedStore](https://syncedstore.org) library which makes working with Yjs easier.
// Please see example-basic for a simpler example with more contextual comments.

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
  const doc = defaultNotesRoom?.ydoc;
  const documents: Documents<Note> = {};
  const store = syncedStore({ documents }, doc as any);
  return (
    <div style={styles.appRoot}>
      {started && doc?.store ? (
        <NotesInternal doc={doc} store={store} />
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
  const ref = buildRef({
    collectionKey,
    aliasSeed,
    documentId,
  });
  return newDocument<Note>(ref, { text: 'New Note Body' });
};

const NotesInternal = ({
  doc,
  store,
}: {
  doc: YDoc<Note>;
  store: MappedTypeDescription<{
    documents: Documents<Note>;
  }>;
}) => {
  const notes = useSyncedStore(store).documents;

  useEffect(() => {
    // load up the initial values from the external yDoc into the syncedStore
    const documents = doc.getMap('documents').toJSON();
    Object.entries(documents).forEach(([key, value]) => {
      if (JSON.stringify(notes[key]) !== JSON.stringify(value)) {
        notes[key] = value;
      }
    });
  }, [doc, notes]);

  const nonDeletedNotes = Object.keys(notes).filter(
    (id) => !notes[id]?._deleted
  );

  const [selectedNote, setSelectedNote] = useState(nonDeletedNotes[0]);

  const createNote = () => {
    const newNote = buildNewNote();
    // this syncedStore you can simply assign to the key and it will be synced to the external yDoc
    notes[newNote._id] = newNote;
    setSelectedNote(newNote._id);
  };

  const updateNoteText = (text: string, note?: Note) => {
    if (!note) return;
    note.text = text;
  };

  const deleteNote = (note: Note) => {
    const oneMonth = 1000 * 60 * 60 * 24 * 30;
    const oldNote = notes[note._id];
    if (!oldNote) return;
    oldNote._deleted = true;
    oldNote._ttl = new Date().getTime() + oneMonth;
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
