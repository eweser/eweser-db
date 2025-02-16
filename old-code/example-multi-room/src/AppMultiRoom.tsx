import { useEffect, useState } from 'react';
import { CollectionKey, Database } from '@eweser/db';
import type { Documents, Note, LoginData, Room } from '@eweser/db';
import * as config from './config';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';
import { WEB_RTC_PEERS } from './config';
import type { CSSProperties } from 'react';

const appStyles: { [key: string]: CSSProperties } = {
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
      try {
        const registry = db.getCollectionRegistry(collectionKey);
        // clean up all of the rooms we connected to
        Object.keys(registry).forEach(([key]) => {
          db.disconnectRoom({ collectionKey, aliasSeed: key });
        });
      } catch (error) {
        // console.log(error);
      }
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
    db.getRoom<Note>({ collectionKey, aliasSeed })
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

  const handleSelectRoom = async (aliasSeed: string) => {
    setNotesRoom(null);
    const onlineRoom = await db.loadAndConnectRoom<Note>(
      { collectionKey, aliasSeed },
      (offlineRoom) => setNotesRoom(offlineRoom)
    );
    setNotesRoom(onlineRoom);
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
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <button
                onClick={() => setCreateRoomModalOpen(false)}
                style={styles.modalCloseButton}
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

const NotesInternal = ({ notesRoom }: { notesRoom: Room<Note> }) => {
  const Notes = db.getDocuments(notesRoom);

  const [notes, setNotes] = useState<Documents<Note>>(
    Notes.sortByRecent(Notes.getUndeleted())
  );

  const [selectedNote, setSelectedNote] = useState(notes[0]?._id);

  // listen for changes to the ydoc and update the state
  Notes.onChange((_event) => {
    const unDeleted = Notes.sortByRecent(Notes.getUndeleted());
    setNotes(unDeleted);
    if (!notes[selectedNote] || notes[selectedNote]._deleted) {
      setSelectedNote(Object.keys(unDeleted)[0]);
    }
  });

  const createNote = () => {
    const newNote = Notes.new({ text: 'New Note Body' });
    setSelectedNote(newNote._id);
  };

  const updateNoteText = (text: string, note?: Note) => {
    if (!note) return;
    note.text = text;
    Notes.set(note);
  };

  const deleteNote = (note: Note) => {
    Notes.delete(note._id);
  };

  return (
    <>
      <h1>Edit</h1>
      {Object.keys(notes).length === 0 ? (
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
