import type { FlashCard, Note, Profile } from '../collections';
import { DocumentBase } from '../collections/documentBase';
import type { Collections, Documents, RegistryData } from '../types';
import { CollectionKey } from '../types';
import { buildRef } from '../utils';
const profileYDoc: { documents: Documents<Profile> } = {
  documents: {
    ['0']: {
      firstName: 'Eweser',
      _ref: 'flashcards.typescript_study_cards.0',
      _id: '0',
      _created: 1653135317729,
      _updated: 1653135317729,
    },
  },
};

const myStudyNotesYDoc: { documents: Documents<Note> } = {
  documents: {
    ['0']: {
      text: 'A fact about Typescript',
      _ref: 'notes.my_study_notes.0',
      _id: '0',
      _created: 1653135317729,
      _updated: 1653135317729,
    },
    ['1']: {
      text: 'Second fact about Typescript',
      _ref: 'notes.my_study_notes.1',
      _id: '0',
      _created: 1653135317729,
      _updated: 1653135317729,
    },
    ['abc']: {
      text: 'Third fact about Typescript. Uses a string for id',
      _ref: 'notes.my_study_notes.abc',
      _id: 'abc',
      _created: 1653135317729,
      _updated: 1653135317729,
    },
  },
};

const typescriptFlashcardsYDoc: { documents: Documents<FlashCard> } = {
  documents: {
    ['0']: {
      frontText: 'Question',
      backText: 'Answer',
      // links to other document ref
      noteLink: 'notes.my_study_notes.0', // or use buildRef()
      _ref: 'flashcards.typescript_study_cards.0',
      _id: '0',
      _created: 1653135317729,
      _updated: 1653135317729,
    },
  },
};

const chineseFlashcardsYDoc: { documents: Documents<FlashCard> } = {
  documents: {
    ['0']: {
      frontText: 'What does 火 mean?',
      backText: 'Fire🔥',
      noteLink: buildRef({
        collection: CollectionKey.notes,
        aliasSeed: 'my_study_notes',
        documentID: '0',
      }),
      _ref: buildRef({
        collection: CollectionKey.flashcards,
        aliasSeed: 'chinese_flashcards',
        documentID: '0',
      }),
      _id: 'noteID',
      _created: 1653135317729,
      _updated: 1653135317729,
    },
  },
};

const registryYDoc: { documents: { '0': DocumentBase & RegistryData } } = {
  documents: {
    // registry only has one document, so it is just '0'
    ['0']: {
      notes: {
        ['my_study_notes']: {
          roomAlias: '#my_study_notes~notes~@username:matrix.org',
          roomId: '!A32adflk2hadf',
        },
      },
      flashcards: {
        ['typescript_study_cards']: {
          roomAlias: '#typescript_study_cards~flashcards~@username:matrix.org',
          roomId: '!Bfd32adflk2haf',
        },
        ['chinese_flashcards']: {
          roomAlias: '#chinese_flashcards~flashcards~@username:matrix.org',
          // might not always have roomId
        },
      },
      profiles: {
        public: {
          roomAlias: '#public~profiles~@username:matrix.org',
        },
      },
      _ref: 'registry.0.0',
      _id: '0',
      _created: 0,
      _updated: 0,
    },
  },
};
//** to conceptualize DB shape */
export const exampleDb: { collections: Collections } = {
  collections: {
    notes: {
      // Rooms
      ['my_study_notes']: {
        collectionKey: CollectionKey.notes,
        matrixProvider: null,
        roomAlias: '#my_study_notes~notes~@username:matrix.org',
        name: 'My Study Notes',
        created: new Date(),
        connectStatus: 'ok',
        ydoc: myStudyNotesYDoc as any,
      },
    },
    flashcards: {
      ['typescript_study_cards']: {
        collectionKey: CollectionKey.flashcards,
        matrixProvider: null,
        roomAlias: '#typescript_study_cards~flashcards~@username:matrix.org',
        name: 'Typescript Study Flashcards',
        connectStatus: 'ok',
        created: new Date(),
        ydoc: typescriptFlashcardsYDoc as any,
      },
      ['chinese_flashcards']: {
        collectionKey: CollectionKey.flashcards,
        matrixProvider: null,
        roomAlias: '#chinese_flashcards~flashcards~@username:matrix.org',
        name: 'Chinese Study Flashcards',
        connectStatus: 'ok',
        created: new Date(),
        ydoc: chineseFlashcardsYDoc as any,
      },
    },
    profiles: {
      ['public']: {
        collectionKey: CollectionKey.profiles,
        matrixProvider: null,
        roomAlias: '#public~profiles~@username:matrix.org',
        name: 'Public Profile',
        connectStatus: 'ok',
        created: new Date(),
        ydoc: profileYDoc as any,
      },
    },
    registry: {
      // other rooms are indexed by their room alias seed. registry is just a single room so its index is 0.
      ['0']: {
        collectionKey: 'registry',
        matrixProvider: null,
        roomAlias: '#eweser-db~registry~@username:matrix.org',
        connectStatus: 'ok',
        ydoc: registryYDoc as any,
      },
    },
  },
};
