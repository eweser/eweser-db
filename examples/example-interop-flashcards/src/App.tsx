import { useEffect, useMemo, useState } from 'react';
import { Database } from '@eweser/db';
import type { CollectionKey, Documents, Flashcard, Note } from '@eweser/db';
import { styles } from '@eweser/examples-components';
import * as config from './config';

const notesCollection: CollectionKey = 'notes';
const flashcardsCollection: CollectionKey = 'flashcards';
const sharedRoomId = 'interop-shared-room-v1';

const db = new Database({
  authServer: config.AUTH_SERVER,
  logLevel: 0,
  initialRooms: [
    { collectionKey: notesCollection, id: sharedRoomId, name: 'Interop Notes' },
    {
      collectionKey: flashcardsCollection,
      id: sharedRoomId,
      name: 'Interop Flashcards',
    },
  ],
});

const loginUrl = db.generateLoginUrl({
  name: 'Interop Flashcards Example App',
});

const getDocIdFromRef = (ref: string) => ref.split('|')[3] ?? '';

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [notes, setNotes] = useState<Documents<Note>>({});
  const [flashcards, setFlashcards] = useState<Documents<Flashcard>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const notesRoom = db.getRoom<Note>('notes', sharedRoomId);
  const flashcardsRoom = db.getRoom<Flashcard>('flashcards', sharedRoomId);

  const notesApi = useMemo(
    () => (notesRoom ? db.getDocuments(notesRoom) : null),
    [notesRoom]
  );
  const flashcardsApi = useMemo(
    () => (flashcardsRoom ? db.getDocuments(flashcardsRoom) : null),
    [flashcardsRoom]
  );

  useEffect(() => {
    db.on('roomsLoaded', () => {
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!notesApi) {
      return;
    }

    setNotes(notesApi.getUndeleted());
    const handleNotesChange = () => {
      setNotes(notesApi.getUndeleted());
    };
    notesApi.onChange(handleNotesChange);

    return () => {
      notesApi.documents.unobserve(handleNotesChange);
    };
  }, [notesApi]);

  useEffect(() => {
    if (!flashcardsApi) {
      return;
    }

    setFlashcards(flashcardsApi.getUndeleted());
    const handleFlashcardsChange = () => {
      setFlashcards(flashcardsApi.getUndeleted());
    };
    flashcardsApi.onChange(handleFlashcardsChange);

    return () => {
      flashcardsApi.documents.unobserve(handleFlashcardsChange);
    };
  }, [flashcardsApi]);

  const createFlashcard = () => {
    if (!flashcardsApi) {
      return;
    }

    flashcardsApi.new({
      frontText: `Flashcard ${Object.keys(flashcardsApi.getUndeleted()).length + 1}`,
      backText: 'Sample answer',
    });
  };

  return (
    <div style={styles.appRoot} data-cy="interop-flashcards-app-root">
      <AppHeader />
      {loaded && flashcardsApi ? (
        <>
          <div style={styles.roomBar} data-cy="interop-flashcards-toolbar">
            <h1 style={{ margin: 0 }}>Interop Flashcards</h1>
            <button
              data-cy="interop-flashcards-new"
              onClick={createFlashcard}
              style={styles.newNoteButton}
            >
              New flashcard
            </button>
          </div>

          <div style={styles.flexWrap} data-cy="interop-flashcards-grid">
            {Object.values(flashcards).length === 0 && (
              <div data-cy="interop-flashcards-empty">No flashcards yet</div>
            )}
            {Object.values(flashcards).map((flashcard) => {
              if (flashcard._deleted) {
                return null;
              }

              const linkedNotes = (flashcard.noteRefs ?? [])
                .map((ref) => notes[getDocIdFromRef(ref)])
                .filter(Boolean) as Note[];

              return (
                <div
                  key={flashcard._id}
                  style={styles.card}
                  data-cy={`interop-flashcard-card-${flashcard._id}`}
                >
                  <button
                    style={styles.deleteButton}
                    data-cy={`interop-flashcard-delete-${flashcard._id}`}
                    onClick={() => flashcardsApi.delete(flashcard._id)}
                  >
                    X
                  </button>

                  <div style={styles.borderedCard}>
                    <p data-cy={`interop-flashcard-front-${flashcard._id}`}>
                      {flashcard.frontText}
                    </p>
                    {revealed[flashcard._id] ? (
                      <p data-cy={`interop-flashcard-back-${flashcard._id}`}>
                        {flashcard.backText}
                      </p>
                    ) : (
                      <button
                        data-cy={`interop-flashcard-reveal-${flashcard._id}`}
                        onClick={() =>
                          setRevealed((prev) => ({
                            ...prev,
                            [flashcard._id]: true,
                          }))
                        }
                      >
                        Show answer
                      </button>
                    )}
                  </div>

                  {linkedNotes.length > 0 && (
                    <div
                      data-cy={`interop-flashcard-linked-notes-${flashcard._id}`}
                    >
                      <p>Linked Notes</p>
                      {linkedNotes.map((note) => (
                        <p
                          key={note._id}
                          data-cy={`interop-flashcard-linked-note-${note._id}`}
                        >
                          {note.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div data-cy="interop-flashcards-loading">loading...</div>
      )}
    </div>
  );
};

const AppHeader = () => {
  return (
    <div style={styles.statusBar} data-cy="interop-flashcards-header">
      <div style={styles.logoutButtonsDiv}>
        <a href={loginUrl} style={{ textDecoration: 'none' }}>
          <button style={styles.logoutButton}>Login</button>
        </a>
        <button
          style={styles.logoutButton}
          onClick={() => {
            db.logoutAndClear();
            window.location.reload();
          }}
        >
          Clear storage
        </button>
      </div>
    </div>
  );
};

export default App;
