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

const loginUrl = db.generateLoginUrl({ name: 'Interop Notes Example App' });

const getDocIdFromRef = (ref: string) => ref.split('|')[3] ?? '';

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [notes, setNotes] = useState<Documents<Note>>({});
  const [flashcards, setFlashcards] = useState<Documents<Flashcard>>({});
  const [selectedNoteId, setSelectedNoteId] = useState('');

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

  const createNote = () => {
    if (!notesApi) {
      return;
    }

    const note = notesApi.new({
      text: `Interop note ${Object.keys(notesApi.getUndeleted()).length + 1}`,
    });
    setSelectedNoteId(note._id);
  };

  const updateNote = (note: Note, text: string) => {
    if (!notesApi) {
      return;
    }
    note.text = text;
    notesApi.set(note);
  };

  const createLinkedFlashcard = (note: Note) => {
    if (!notesApi || !flashcardsApi) {
      return;
    }

    const flashcard = flashcardsApi.new({
      frontText: `Prompt for ${note.text.slice(0, 18)}`,
      backText: 'Answer from notes app',
      noteRefs: [note._ref],
    });

    note.flashcardRefs = [flashcard._ref].concat(note.flashcardRefs ?? []);
    notesApi.set(note);
  };

  return (
    <div style={styles.appRoot} data-cy="interop-notes-app-root">
      <AppHeader />
      {loaded && notesApi ? (
        <>
          <div style={styles.roomBar} data-cy="interop-notes-toolbar">
            <h1 style={{ margin: 0 }}>Interop Notes</h1>
            <button data-cy="interop-notes-new-note" onClick={createNote}>
              New note
            </button>
          </div>
          <div style={styles.flexWrap} data-cy="interop-notes-grid">
            {Object.values(notes).length === 0 && (
              <div data-cy="interop-notes-empty">No notes yet</div>
            )}
            {Object.values(notes).map((note) => {
              if (note._deleted) {
                return null;
              }

              const linkedFlashcards = (note.flashcardRefs ?? [])
                .map((ref) => flashcards[getDocIdFromRef(ref)])
                .filter(Boolean) as Flashcard[];

              return (
                <div
                  key={note._id}
                  style={styles.card}
                  data-cy={`interop-notes-card-${note._id}`}
                  onClick={() => setSelectedNoteId(note._id)}
                >
                  <button
                    style={styles.deleteButton}
                    data-cy={`interop-notes-delete-${note._id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      notesApi.delete(note._id);
                    }}
                  >
                    X
                  </button>

                  {selectedNoteId === note._id ? (
                    <textarea
                      style={styles.editor}
                      data-cy={`interop-notes-editor-${note._id}`}
                      value={notes[note._id]?.text ?? ''}
                      onBlur={() => setSelectedNoteId('')}
                      onChange={(event) => updateNote(note, event.target.value)}
                    />
                  ) : (
                    <p
                      style={styles.cardInner}
                      data-cy={`interop-notes-text-${note._id}`}
                    >
                      {note.text}
                    </p>
                  )}

                  <button
                    data-cy={`interop-notes-link-flashcard-${note._id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      createLinkedFlashcard(note);
                    }}
                  >
                    Link new flashcard
                  </button>

                  {linkedFlashcards.length > 0 && (
                    <div data-cy={`interop-notes-linked-${note._id}`}>
                      <p>Linked Flashcards</p>
                      {linkedFlashcards.map((flashcard) => (
                        <p
                          key={flashcard._id}
                          data-cy={`interop-notes-linked-front-${flashcard._id}`}
                        >
                          {flashcard.frontText}
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
        <div data-cy="interop-notes-loading">loading...</div>
      )}
    </div>
  );
};

const AppHeader = () => {
  return (
    <div style={styles.statusBar} data-cy="interop-notes-header">
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
