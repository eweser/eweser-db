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
import type { Documents, Flashcard, LoginData, Room, Note } from '@eweser/db';
import * as config from './config';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';
import { WEB_RTC_PEERS } from './config';

const aliasSeed = 'flashcards-default';
const collectionKey = CollectionKey.flashcards;
const initialRoomConnect = {
  collectionKey,
  aliasSeed,
  name: 'My Flashcards on Life and Things',
};

// This app, along with AppInteropFlashcards is an example of how two independent apps can interoperate by both connecting to the user's database. All this requires is the user signs in with the same matrix account. There will be real-time syncing between them.
// The example here is a flashcard app that would let you link flashcards to flashcards and vice versa

const db = new Database({
  // set `debug` to true to see debug messages in the console
  // debug: true,
  webRTCPeers: WEB_RTC_PEERS,
  baseUrl: 'http://localhost:3000',
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

  const defaultFlashcardsRoom = db.getRoom<Flashcard>(collectionKey, aliasSeed);

  return (
    <div style={styles.appRoot}>
      {started && defaultFlashcardsRoom?.ydoc ? (
        <FlashcardsInternal flashcardsRoom={defaultFlashcardsRoom} />
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

const buildNewFlashcard = () => {
  const documentId = ulid();
  const ref = buildRef({
    collectionKey,
    aliasSeed,
    documentId,
  });
  return newDocument<Flashcard>(ref, {
    frontText: 'Fire 🔥',
    backText: '火 huo3',
  });
};

const FlashcardsInternal = ({
  flashcardsRoom,
}: {
  flashcardsRoom: Room<Flashcard>;
}) => {
  const flashcardsDocuments = getRoomDocuments(flashcardsRoom);

  const [flashcards, setFlashcards] = useState<Documents<Flashcard>>(
    flashcardsDocuments?.toJSON() ?? {}
  );

  const nonDeletedFlashcards = Object.keys(flashcards).filter(
    (id) => !flashcards[id]?._deleted
  );

  const [selectedFlashcard, setSelectedFlashcard] = useState(
    nonDeletedFlashcards[0]
  );

  flashcardsDocuments?.observe((_event) => {
    setFlashcards(flashcardsDocuments?.toJSON());
  });

  const setFlashcard = (flashcard: Flashcard) => {
    flashcardsDocuments?.set(flashcard._id, flashcard);
  };

  const createFlashcard = () => {
    const newFlashcard = buildNewFlashcard();
    setFlashcard(newFlashcard);
    setSelectedFlashcard(newFlashcard._id);
  };

  const deleteFlashcard = (flashcard: Flashcard) => {
    const oneMonth = 1000 * 60 * 60 * 24 * 30;
    flashcard._deleted = true;
    flashcard._ttl = new Date().getTime() + oneMonth;
    setFlashcard(flashcard);
  };

  const [linkFlashcardModalOpen, setLinkFlashcardModalOpen] = useState(false);

  const handleLinkNote = async (note: Note, notesRoom: Room<Note>) => {
    // add the flashcard to the flashcards list of flashcardRefs and safe it to the doc.

    const flashcard = flashcards[selectedFlashcard];
    if (!flashcard) return;

    const flashcardRefs = note.flashcardRefs ?? [];
    flashcardRefs.push(flashcard._ref);
    note.flashcardRefs = flashcardRefs;
    const notesDocuments = getRoomDocuments(notesRoom);
    notesDocuments.set(note._id, note);

    // add the flashcard to the flashcards list of flashcardRefs and save it to the doc.
    const noteRefs = flashcard.noteRefs ?? [];
    noteRefs.push(flashcard._ref);
    flashcard.noteRefs = flashcardRefs;
    setFlashcard(flashcard);
  };
  const [newFlashcardModalOpen, setNewFlashcardModalOpen] = useState(false);

  return (
    <>
      <h1>Edit</h1>
      {nonDeletedFlashcards.length === 0 && (
        <div>No flashcards found. Please create one</div>
      )}
      {newFlashcardModalOpen && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setNewFlashcardModalOpen(false)}
              style={styles.modalCloseButton}
            >
              X
            </button>
            <NewFlashcardModal room={flashcardsRoom} />
          </div>
        </div>
      )}
      <button onClick={() => setNewFlashcardModalOpen(true)}>
        + New Flashcard
      </button>
      <h1>Flashcards</h1>

      <button onClick={() => createFlashcard()}>New flashcard</button>

      <div style={styles.flexWrap}>
        {nonDeletedFlashcards.map((id) => {
          const flashcard = flashcards[id];
          if (flashcard && !flashcards[id]?._deleted)
            return (
              <div
                onClick={() => setSelectedFlashcard(flashcard._id)}
                style={styles.card}
                key={flashcard._id}
              >
                <button
                  onClick={() => deleteFlashcard(flashcard)}
                  style={styles.deleteButton}
                >
                  X
                </button>
                <FlashcardComponent flashcard={flashcard} />

                <button onClick={() => setLinkFlashcardModalOpen(true)}>
                  + Link flashcard
                </button>

                <div style={{ display: 'flex', marginTop: '2rem' }}>
                  {flashcard.noteRefs?.length &&
                    flashcard.noteRefs.length > 0 && (
                      <div>
                        <p>Linked Notes:</p>
                        {flashcard.noteRefs.map((ref) => (
                          <LinkedNote key={ref} docRef={ref} />
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
              flashcard={flashcards[selectedFlashcard]!}
              handleLinkNote={handleLinkNote}
            />
          </div>
        </div>
      )}
    </>
  );
};
const FlashcardComponent = ({ flashcard }: { flashcard?: Flashcard }) => {
  const [showBack, setShowBack] = useState(false);
  if (!flashcard || flashcard._deleted) return null;

  return (
    <div
      key={flashcard._id}
      style={{
        border: '1px solid black',
        padding: '1rem',
        margin: '1rem',
        cursor: 'pointer',
      }}
    >
      <p>{flashcard.frontText}</p>
      <hr />
      {showBack ? (
        <p>{flashcard.backText}</p>
      ) : (
        <button onClick={() => setShowBack(true)}>Show Answer</button>
      )}
    </div>
  );
};

const LinkedNote = ({ docRef }: { docRef?: string }) => {
  const [note, setNote] = useState<Note | null>(null);
  useEffect(() => {
    if (!docRef) return;
    const loadNote = async () => {
      const note = await db.getDocumentByRef<Note>(docRef);
      setNote(note);
    };
    loadNote();
  }, [docRef]);
  return <div>{note?.text}</div>;
};

const LinkFlashcardModal = ({
  flashcard,
  handleLinkNote,
}: {
  flashcard: Flashcard;
  handleLinkNote: (note: Note, notesRoom: Room<Note>) => Promise<void>;
}) => {
  const notesRoomRegistry = db.getCollectionRegistry(CollectionKey.notes);
  const [connectedRoms, setConnectedRooms] = useState<Room<Note>[]>([]);

  useEffect(() => {
    const createDefaultNotesRoom = async () => {
      const room = await db.createAndConnectRoom<Note>({
        collectionKey: CollectionKey.notes,
        aliasSeed: 'notess-default',
      });
      setConnectedRooms([room]);
    };

    const populateRooms = async () => {
      const connected: Room<Note>[] = [];
      for (const aliasSeed of Object.keys(notesRoomRegistry)) {
        try {
          const room = await db.loadAndConnectRoom<Note>(
            { collectionKey: CollectionKey.notes, aliasSeed }
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

    if (notesRoomRegistry && Object.keys(notesRoomRegistry).length === 0) {
      createDefaultNotesRoom();
    } else if (connectedRoms.length < Object.keys(notesRoomRegistry).length) {
      populateRooms();
    }
  }, [connectedRoms, notesRoomRegistry]);

  return (
    <div>
      {connectedRoms.map((room) => {
        const docs: Documents<Note> =
          room?.ydoc?.getMap('documents')?.toJSON() ?? {};
        return (
          <div key={room.roomAlias}>
            <p> Click a note to link to flashcard:</p>
            {Object.values(docs)?.map((doc) => {
              if (!doc || doc._deleted) return null;
              return (
                <div
                  key={doc._id}
                  onClick={() => {
                    handleLinkNote(doc, room);
                  }}
                  style={{
                    border: '1px solid black',
                    padding: '1rem',
                    margin: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  <p>{doc.text}</p>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const NewFlashcardModal = ({ room }: { room: Room<Flashcard> }) => {
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');

  const handleCreateFlashcard = async () => {
    const documentId = ulid();
    const aliasSeed = getAliasSeedFromAlias(room.roomAlias);
    const ref = buildRef({
      collectionKey: CollectionKey.flashcards,
      aliasSeed,
      documentId,
    });
    const newFlashcard = newDocument<Flashcard>(ref, { frontText, backText });

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
