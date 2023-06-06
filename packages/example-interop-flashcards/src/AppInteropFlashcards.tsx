import { useEffect, useState } from 'react';
import { CollectionKey, Database } from '@eweser/db';
import type { Documents, Flashcard, LoginData, Room, Note } from '@eweser/db';
import * as config from './config';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';

styles.appRoot.backgroundColor = 'rgb(112 56 56)';

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
  webRTCPeers: config.WEB_RTC_PEERS,
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

  const defaultFlashcardsRoom = db.getRoom<Flashcard>({
    collectionKey,
    aliasSeed,
  });

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

const FlashcardsInternal = ({
  flashcardsRoom,
}: {
  flashcardsRoom: Room<Flashcard>;
}) => {
  const Flashcards = db.getDocuments(flashcardsRoom);
  const [flashcards, setFlashcards] = useState<Documents<Flashcard>>(
    Flashcards.sortByRecent(Flashcards.getUndeleted())
  );

  Flashcards.onChange((_event) => {
    setFlashcards(Flashcards.sortByRecent(Flashcards.getUndeleted()));
  });

  const deleteFlashcard = (flashcard: Flashcard) => {
    Flashcards.delete(flashcard._id);
  };

  const [linkNoteModalFlashcard, setLinkNoteModalFlashcard] =
    useState<Flashcard | null>(null);

  const handleLinkNote = async ({
    flashcard,
    note,
    notesRoom,
  }: {
    flashcard: Flashcard;
    note: Note;
    notesRoom: Room<Note>;
  }) => {
    note.flashcardRefs = [flashcard._ref].concat(note.flashcardRefs ?? []);
    const Notes = db.getDocuments(notesRoom);
    Notes.set(note);

    flashcard.noteRefs = [note._ref].concat(flashcard.noteRefs ?? []);
    Flashcards.set(flashcard);

    setLinkNoteModalFlashcard(null);
  };
  const [newFlashcardModalOpen, setNewFlashcardModalOpen] = useState(false);

  return (
    <>
      <h1>Flashcards</h1>
      {Object.keys(flashcards).length === 0 && (
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
            <NewFlashcardModal
              room={flashcardsRoom}
              setNewFlashcardModalOpen={setNewFlashcardModalOpen}
            />
          </div>
        </div>
      )}
      <button onClick={() => setNewFlashcardModalOpen(true)}>
        New Flashcard
      </button>

      <div style={styles.flexWrap}>
        {Object.values(flashcards).map((flashcard) => {
          if (flashcard && !flashcards._deleted)
            return (
              <div style={styles.card} key={flashcard._id}>
                <button
                  onClick={() => deleteFlashcard(flashcard)}
                  style={styles.deleteButton}
                >
                  X
                </button>
                <FlashcardComponent flashcard={flashcard} />

                <div style={{ marginTop: '2rem' }}>
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

                <button
                  style={{ alignSelf: 'flex-end' }}
                  onClick={() => setLinkNoteModalFlashcard(flashcard)}
                >
                  Link note
                </button>
              </div>
            );
        })}
      </div>
      {linkNoteModalFlashcard && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setLinkNoteModalFlashcard(null)}
              style={styles.modalCloseButton}
            >
              X
            </button>
            <LinkNoteModal
              flashcard={linkNoteModalFlashcard}
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
    <div key={flashcard._id} style={styles.borderedCard}>
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
  return <div style={styles.borderedCard}>{note?.text}</div>;
};

const LinkNoteModal = ({
  flashcard,
  handleLinkNote,
}: {
  flashcard: Flashcard;
  handleLinkNote: ({
    flashcard,
    note,
    notesRoom,
  }: {
    flashcard: Flashcard;
    note: Note;
    notesRoom: Room<Note>;
  }) => Promise<void>;
}) => {
  const notesRoomRegistry = db.getCollectionRegistry(CollectionKey.notes);
  const [connectedRoms, setConnectedRooms] = useState<Room<Note>[]>([]);

  useEffect(() => {
    const createDefaultNotesRoom = async () => {
      const room = await db.createAndConnectRoom<Note>({
        collectionKey: CollectionKey.notes,
        aliasSeed: 'notes-default',
      });
      setConnectedRooms([room]);
    };

    const populateRooms = async () => {
      const connected = [...connectedRoms];
      for (const [aliasSeed, registryEntry] of Object.entries(
        notesRoomRegistry
      )) {
        if (!registryEntry) continue;
        const { roomAlias } = registryEntry;
        if (connectedRoms.some((room) => room.roomAlias === roomAlias))
          continue;
        try {
          const room = await db.loadAndConnectRoom<Note>(
            { collectionKey: CollectionKey.notes, aliasSeed },
            (room) => {
              connected.push(room);
              setConnectedRooms(connected);
            }
            // performance could be improved by using the offline room which returns earlier.
          );

          const existing = connected.find(
            (room) => room.roomAlias === roomAlias
          );
          if (existing) continue;
          connected.push(room);
          setConnectedRooms(connected);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }
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
        const Notes = db.getDocuments(room);
        if (Object.values(Notes.getUndeleted()).length === 0) return null;
        return (
          <div key={room.roomAlias} style={{ color: 'black' }}>
            <h3>{room.name}</h3>
            <p> Click a note to link to flashcard:</p>
            {Object.values(Notes.getUndeleted())?.map((note) => {
              return (
                <div
                  key={note._id}
                  onClick={() => {
                    handleLinkNote({ flashcard, note, notesRoom: room });
                  }}
                  style={styles.borderedCard}
                >
                  <p>{note.text}</p>
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
  setNewFlashcardModalOpen,
}: {
  room: Room<Flashcard>;
  setNewFlashcardModalOpen: (open: boolean) => void;
}) => {
  const [frontText, setFrontText] = useState('Fire 🔥');
  const [backText, setBackText] = useState('火 huo3');

  const handleCreateFlashcard = async () => {
    const Flashcards = db.getDocuments(room);
    Flashcards.new({ frontText, backText });
    setNewFlashcardModalOpen(false);
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
