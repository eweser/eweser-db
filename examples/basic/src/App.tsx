import { useCallback, useContext, useEffect, useState } from 'react';

import { CollectionKey, Database } from '@eweser/db';

import type { Documents, Note, NoteBase } from '@eweser/db';

import LoginForm from 'LoginForm';

import { styles } from 'styles';
import { MATRIX_SERVER } from 'config';

const defaultNotesRoomAliasName = 'notes-default';
const defaultCollectionData = {
  collectionKey: CollectionKey.notes,
  aliasName: defaultNotesRoomAliasName,
  name: 'Default Notes Collection',
};

const db = new Database({ baseUrl: MATRIX_SERVER, debug: true });
const App = () => {
  const [loginStatus, setLoginStatus] = useState(db.loginStatus);

  db.on((event) => {
    if (event.data?.loginStatus) setLoginStatus(event.data.loginStatus);
  });

  if (loginStatus === 'ok') return <NotesInternal />;
  else if (loginStatus === 'initial')
    return (
      <>
        <h1>Login</h1>
        <LoginForm handleLogin={db.login} loginStatus={loginStatus} />
      </>
    );
  else if (loginStatus === 'loading' || !db) return <div>Logging in...</div>;
  else return <div>Something went wrong</div>;
};

const NotesInternal = () => {
  // const { store, newDocument } = useContext(CollectionContext);
  const notes: Documents<Note> = {};
  const [selectedNote, setSelectedNote] = useState(Object.keys(notes)[0]);

  const deleteNote = useCallback(
    (docId: string) => {
      // You can also simply do
      // delete notes[docId];

      // But this will delete the document from the database after 30 days
      const oneMonth = 1000 * 60 * 60 * 24 * 30;
      // notes[docId]._deleted = true;
      // notes[docId]._ttl = new Date().getTime() + oneMonth;
    },
    [notes]
  );
  const createNote = useCallback(() => {
    // notes[Object.keys(notes).length] = newDocument<NoteBase>({
    //   text: 'New Note Body',
    // });
  }, [notes]);

  useEffect(() => {
    if (Object.keys(notes).length === 0) {
      // notes[0] = newDocument({ text: 'Write a new note' });
    }
  }, []);

  return (
    <div>
      <div>
        <h1>Edit</h1>
        <textarea
          style={styles.editor}
          name="main-card-editor"
          // value={
          //   notes[selectedNote] && !notes[selectedNote]._deleted
          //     ? notes[selectedNote].text
          //     : ''
          // }
          // onChange={(e) => {
          //   if (!notes[selectedNote] || notes[selectedNote]._deleted) return;
          //   notes[selectedNote].text = e.target.value;
          // }}
        ></textarea>
      </div>
      <h1>Notes</h1>
      <button onClick={() => createNote()}>New note</button>
      <div style={styles.flexWrap}>
        {/* {Object.keys(notes).map((docId) => {
          if (!notes[docId]._deleted)
            return (
              <NoteCard
                key={docId}
                note={notes[docId]}
                setSelectedNote={setSelectedNote}
                deleteNote={deleteNote}
              />
            );
        })} */}
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
