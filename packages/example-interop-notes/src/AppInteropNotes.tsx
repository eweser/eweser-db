import { useEffect, useState } from 'react';
import { ulid } from 'ulid';
import {
  CollectionKey,
  Database,
  buildRef,
  getAliasSeedFromAlias,
  getRoomDocuments,
  newDocument,
} from '@eweser/db';
import type { Documents, Note, LoginData, Room, FlashCard } from '@eweser/db';
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
  baseUrl: 'http://localhost:3000',
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
  const notesDocuments = getRoomDocuments(notesRoom);

  const [notes, setNotes] = useState<Documents<Note>>(
    notesDocuments?.toJSON() ?? {}
  );

  // You can also delete entries by setting them to undefined/null, but it is better to use the _deleted flag to mark them for deletion later just in case the user changes their mind
  const nonDeletedNotes = Object.keys(notes).filter(
    (id) => !notes[id]?._deleted
  );

  const [selectedNote, setSelectedNote] = useState(nonDeletedNotes[0]);

  notesDocuments?.observe((_event) => {
    setNotes(notesDocuments?.toJSON());
  });

  const setNote = (note: Note) => {
    notesDocuments?.set(note._id, note);
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

  const [linkFlashcardModalOpen, setLinkFlashcardModalOpen] = useState(false);

  const handleLinkFlashcard = async (
    flashcard: FlashCard,
    flashcardsRoom: Room<FlashCard>
  ) => {
    // add the note to the flashcards list of noteRefs and safe it to the doc.

    const note = notes[selectedNote];
    if (!note) return;

    const noteRefs = flashcard.noteRefs ?? [];
    noteRefs.push(flashcard._ref);
    flashcard.noteRefs = noteRefs;
    const flashcardsDocuments = getRoomDocuments(flashcardsRoom);
    flashcardsDocuments.set(flashcard._id, flashcard);

    // add the flashcard to the notes list of flashcardRefs and save it to the doc.
    const flashcardRefs = note.flashcardRefs ?? [];
    flashcardRefs.push(flashcard._ref);
    note.flashcardRefs = flashcardRefs;
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
                <p> {note.text}</p>

                <button onClick={() => setLinkFlashcardModalOpen(true)}>
                  + Link flashcard
                </button>

                <div style={{ display: 'flex', marginTop: '2rem' }}>
                  {note.flashcardRefs?.length &&
                    note.flashcardRefs.length > 0 && (
                      <div>
                        <p>Linked Flashcards:</p>
                        {note.flashcardRefs.map((ref) => (
                          <LinkedFlashcard key={ref} docRef={ref} />
                        ))}
                      </div>
                    )}
                </div>
              </div>
            );
        })}
      </div>
      {linkFlashcardModalOpen && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setLinkFlashcardModalOpen(false)}
              style={styles.modalCloseButton}
            >
              X
            </button>
            <LinkFlashcardModal
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              note={notes[selectedNote]!}
              handleLinkFlashcard={handleLinkFlashcard}
            />
          </div>
        </div>
      )}
    </>
  );
};

const LinkedFlashcard = ({ docRef }: { docRef?: string }) => {
  const [flashcard, setFlashcard] = useState<FlashCard | null>(null);
  useEffect(() => {
    if (!docRef) return;
    const loadFlashcard = async () => {
      const flashcard = await db.getDocumentByRef<FlashCard>(docRef);
      setFlashcard(flashcard);
    };
    loadFlashcard();
  }, [docRef]);
  return <div>{flashcard?.frontText}</div>;
};

const LinkFlashcardModal = ({
  note,
  handleLinkFlashcard,
}: {
  note: Note;
  handleLinkFlashcard: (
    flashcard: FlashCard,
    flashcardsRoom: Room<FlashCard>
  ) => Promise<void>;
}) => {
  const flashcardRoomRegistry = db.getCollectionRegistry(
    CollectionKey.flashcards
  );
  const [connectedRoms, setConnectedRooms] = useState<Room<FlashCard>[]>([]);

  useEffect(() => {
    const createDefaultFlashcardsRoom = async () => {
      const room = await db.createAndConnectRoom<FlashCard>({
        collectionKey: CollectionKey.flashcards,
        aliasSeed: 'flashcards-default',
      });
      setConnectedRooms([room]);
    };

    const populateRooms = async () => {
      const connected: Room<FlashCard>[] = [];
      for (const aliasSeed of Object.keys(flashcardRoomRegistry)) {
        try {
          const room = await db.loadAndConnectRoom<FlashCard>(
            { collectionKey: CollectionKey.flashcards, aliasSeed }
            // performance could be improved by using the offline room which returns earlier.
          );
          connected.push(room);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }

      setConnectedRooms(connected);
    };

    if (
      flashcardRoomRegistry &&
      Object.keys(flashcardRoomRegistry).length === 0
    ) {
      createDefaultFlashcardsRoom();
    } else if (
      connectedRoms.length < Object.keys(flashcardRoomRegistry).length
    ) {
      populateRooms();
    }
  }, [connectedRoms, flashcardRoomRegistry]);
  const [newFlashcardModalOpen, setNewFlashcardModalOpen] = useState(false);

  return (
    <div>
      {connectedRoms.map((room) => {
        const docs: Documents<FlashCard> =
          room?.ydoc?.getMap('documents')?.toJSON() ?? {};
        return (
          <div key={room.roomAlias}>
            {newFlashcardModalOpen && (
              <div style={styles.modal}>
                <div style={styles.modalContent}>
                  <button
                    onClick={() => setNewFlashcardModalOpen(false)}
                    style={styles.modalCloseButton}
                  >
                    X
                  </button>
                  <NewFlashcardModal room={room} noteText={note.text ?? ''} />
                </div>
              </div>
            )}
            <button onClick={() => setNewFlashcardModalOpen(true)}>
              + New Flashcard
            </button>
            <p> Click a flashcard to link to note:</p>
            {Object.values(docs)?.map((doc) => {
              if (!doc || doc._deleted) return null;
              return (
                <div
                  key={doc._id}
                  onClick={() => {
                    handleLinkFlashcard(doc, room);
                  }}
                  style={{
                    border: '1px solid black',
                    padding: '1rem',
                    margin: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  <p>{doc.frontText}</p>
                  <hr />
                  <p>{doc.backText}</p>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const NewFlashcardModal = ({
  room,
  noteText,
}: {
  room: Room<FlashCard>;
  noteText: string;
}) => {
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState(noteText);

  const handleCreateFlashcard = async () => {
    const documentId = ulid();
    const aliasSeed = getAliasSeedFromAlias(room.roomAlias);
    const ref = buildRef({
      collectionKey: CollectionKey.flashcards,
      aliasSeed,
      documentId,
    });
    const newFlashcard = newDocument<FlashCard>(ref, { frontText, backText });

    room.ydoc?.getMap('documents').set(documentId, newFlashcard);
  };
  return (
    <>
      <label htmlFor="front-text">Front Text</label>
      <input
        id="front-text"
        value={frontText}
        onChange={(e) => setFrontText(e.target.value)}
      />
      <label htmlFor="back-text">Back Text</label>
      <input
        id="back-text"
        value={backText}
        onChange={(e) => setBackText(e.target.value)}
      />
      <button onClick={handleCreateFlashcard}>Create</button>
    </>
  );
};

export default App;
