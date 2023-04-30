import { useEffect, useState } from 'react';
import { ulid } from 'ulid';
import { CollectionKey, Database, buildRef, newDocument } from '@eweser/db';
import type { Documents, Note, LoginData, Room } from '@eweser/db';
import * as config from './config';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';
import { WEB_RTC_PEERS } from './config';
import type { CSSProperties } from 'react';

const appStyles: { [key: string]: CSSProperties } = {
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    position: 'relative',
    padding: '5rem',
    background: 'white',
  },
  modalCloseButton: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
  },
  collectionsList: {
    display: 'flex',
    columnGap: '2rem',
    rowGap: '1rem',
    flexWrap: 'wrap',
  },
};

// This example shows how you can use multiple rooms in a single app to allow the user to organize their documents into groups. You might want to call these 'Collections' in the user-facing language, but in the code they are called 'Rooms' because they correspond to a Matrix room. Also, 'Collection' is already a concept in the Database API, so we don't want to confuse the two.

const aliasSeed = 'notes-default';
const collectionKey = CollectionKey.notes;

const initialRoomConnect = {
  collectionKey,
  aliasSeed,
  name: 'My Notes on Life and Things',
};

const db = new Database({
  // set `debug` to true to see debug messages in the console
  debug: true,
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
      const registry = db.getCollectionRegistry(collectionKey);
      // clean up all of the rooms we connected to
      Object.keys(registry).forEach(([key]) => {
        db.disconnectRoom({ collectionKey, aliasSeed: key });
      });
    };
  }, []);

  const handleLogin = (loginData: LoginData) =>
    db.login({ initialRoomConnect, ...loginData });

  const handleSignup = (loginData: LoginData) =>
    db.signup({ initialRoomConnect, ...loginData });

  const defaultNotesRoom = db.getRoom<Note>(collectionKey, aliasSeed);

  return (
    <div style={styles.appRoot}>
      {started && defaultNotesRoom?.ydoc ? (
        <RoomsProvider db={db} />
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

const RoomsProvider = ({ db }: { db: Database }) => {
  // list out all of the notes rooms in the registry.
  const registryRooms = db.getCollectionRegistry(collectionKey);
  // allow the user to select one to connect to
  // Pass the current room down to the NotesInternal component
  const [notesRoom, setNotesRoom] = useState(
    db.getRoom<Note>(collectionKey, aliasSeed)
  );
  // allow creating new rooms.
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const handleCreateRoom = async () => {
    try {
      setCreatingRoom(true);
      const seed = newRoomName.toLowerCase();
      await db.createAndConnectRoom<Note>({
        collectionKey,
        aliasSeed: seed,
        name: newRoomName,
        // can add a topic if you wish
        topic: '',
      });

      setCreateRoomModalOpen(false);
      handleSelectRoom(seed);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCreatingRoom(false);
      setNewRoomName('');
    }
  };

  const handleSelectRoom = async (seed: string) => {
    setNotesRoom(null);
    // load the offline first version of the room for a snappy UX
    const offlineRoom = await db.loadRoom<Note>({
      collectionKey,
      aliasSeed: seed,
    });
    if (!offlineRoom) return alert('Could not load room');
    setNotesRoom(offlineRoom);

    // then connect the online version of the room
    const room = await db.connectRoom<Note>({
      collectionKey,
      aliasSeed: seed,
    });
    if (typeof room === 'string') {
      return alert(room);
    }
    setNotesRoom(room);
  };

  return (
    <>
      <div style={appStyles.collectionsList}>
        Collections:
        {Object.entries(registryRooms).map(([seed, room]) => {
          if (!room) return null;
          const roomName = room.roomName; // This will either be a nice name the user has given the room, or the full alias. We can check if it is an ugly alias by checking if it starts with a !.
          const userFriendlyName =
            roomName && !roomName?.startsWith('!') ? roomName : seed;
          return (
            <button onClick={() => handleSelectRoom(seed)} key={room.roomAlias}>
              {userFriendlyName}
            </button>
          );
        })}
        <button onClick={() => setCreateRoomModalOpen(true)}>
          + New Collection
        </button>
        {createRoomModalOpen && (
          <div style={appStyles.modal}>
            <div style={appStyles.modalContent}>
              <button
                onClick={() => setCreateRoomModalOpen(false)}
                style={appStyles.modalCloseButton}
              >
                X
              </button>
              <label>
                Collection Name
                <input
                  name="new-room-name"
                  type="text"
                  onChange={(e) => {
                    setNewRoomName(e.target.value);
                  }}
                  value={newRoomName}
                />
              </label>
              <button disabled={creatingRoom} onClick={handleCreateRoom}>
                Create Collection
              </button>
            </div>
          </div>
        )}
      </div>
      {notesRoom ? <NotesInternal notesRoom={notesRoom} /> : '...loading'}
    </>
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
