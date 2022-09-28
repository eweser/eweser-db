import { useContext, useEffect, useState } from 'react';

import { CollectionKey, newDocument, NoteBase } from '@eweser/db';
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
  const noteKeys = Object.keys(notes);
  const [selectedNote, setSelectedNote] = useState(noteKeys[0]);
  useEffect(() => {
    if (noteKeys.length === 0) {
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
      <div style={styles.flexWrap}>
        {noteKeys.map((docId) => (
          <NoteCard note={notes[docId]} key={docId} setSelectedNote={setSelectedNote} />
        ))}
      </div>
    </div>
  );
};

const NoteCard = ({
  note,
  setSelectedNote,
}: {
  note: Note;
  setSelectedNote: (id: string) => void;
}) => {
  return (
    <div onClick={() => setSelectedNote(note._id)} style={styles.card}>
      {note.text}
    </div>
  );
};

export default App;
