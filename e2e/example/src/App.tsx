import { useCallback, useContext, useEffect, useState } from 'react';

import { CollectionKey, NoteBase } from '@eweser/db';
import type { Documents, Note } from '@eweser/db';
import { DatabaseContext, CollectionProvider, CollectionContext } from '@eweser/hooks';

import LoginForm from 'LoginForm';

import { styles } from 'styles';

const defaultNotesRoomAliasKey = 'notes--default';
const defaultCollectionData = {
  collectionKey: CollectionKey.notes,
  aliasKey: defaultNotesRoomAliasKey,
  name: 'Default Notes Collection',
};

const App = () => {
  const { db, loginStatus, login } = useContext(DatabaseContext);
  if (loginStatus === 'initial')
    return (
      <>
        <h1>Login</h1>
        <LoginForm handleLogin={login} loginStatus={loginStatus} />
      </>
    );
  else if (loginStatus === 'loading' || !db) return <div>Logging in...</div>;
  else
    return (
      /** Don't call `CollectionProvider` until the login is loaded */
      <CollectionProvider db={db} {...defaultCollectionData}>
        <NotesInternal />
      </CollectionProvider>
    );
};

const NotesInternal = () => {
  const { store, newDocument } = useContext(CollectionContext);
  const notes: Documents<Note> = store.documents;
  const [selectedNote, setSelectedNote] = useState(Object.keys(notes)[0]);

  const deleteNote = useCallback(
    (docId: string) => {
      const oneMonth = 1000 * 60 * 60 * 24 * 30;
      notes[docId]._deleted = true;
      notes[docId]._ttl = new Date().getTime() + oneMonth;
    },
    [notes]
  );
  const createNote = useCallback(() => {
    notes[Object.keys(notes).length] = newDocument<NoteBase>({ text: 'New Note Body' });
  }, [notes]);

  useEffect(() => {
    if (Object.keys(notes).length === 0) {
      notes[0] = newDocument({ text: 'Write a new note' });
    }
  }, []);

  return (
    <div>
      <div>
        <h1>Edit</h1>
        <textarea
          style={styles.editor}
          name="main-card-editor"
          value={notes[selectedNote].text}
          onChange={(e) => (notes[selectedNote].text = e.target.value)}
        ></textarea>
      </div>
      <h1>Notes</h1>
      <button onClick={() => createNote()}>+</button>
      <div style={styles.flexWrap}>
        {Object.keys(notes).map((docId) => {
          if (!notes[docId]._deleted)
            return (
              <NoteCard
                key={docId}
                note={notes[docId]}
                setSelectedNote={setSelectedNote}
                deleteNote={deleteNote}
              />
            );
        })}
      </div>
    </div>
  );
};

const NoteCard = ({
  note,
  setSelectedNote,
  deleteNote,
}: {
  note: Note;
  setSelectedNote: (id: string) => void;
  deleteNote: (id: string) => void;
}) => {
  return (
    <div onClick={() => setSelectedNote(note._id)} style={styles.card}>
      <button onClick={() => deleteNote(note._id)} style={styles.deleteButton}>
        X
      </button>
      {note.text}
    </div>
  );
};

export default App;
