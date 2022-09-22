import { CollectionKey, Collections } from '../types';
import { buildRef } from '../utils';

//** to conceptualize DB shape. Note that */
export const exampleDb: { collections: Collections } = {
  collections: {
    registry: {
      // other rooms are indexed by their room alias. registry is just a single room so it's index is 0.
      ['0']: {
        collectionKey: CollectionKey.registry,
        matrixProvider: null,
        // note that roomAlias is the undecorated alias. if the final will be # `#<alias>_<username>:matrix.org' just <alias>
        roomAlias: 'eduvault_registry_<username>',
        connectStatus: 'ok',
        store: {
          documents: {
            ['0']: {
              _ref: 'registry.0.0',
              _id: '0',
              _created: 0,
              _updated: 0,
              notes: {
                ['notes-room-alias-1']: {
                  roomAlias: 'notes-room-alias-1',
                },
              },
              flashcards: {
                ['flashcard-room-alias-1']: {
                  roomAlias: 'flashcard-room-alias-1',
                },
                ['flashcard-room-alias-2']: {
                  roomAlias: 'flashcard-room-alias-2',
                },
              },
              registry: {},
            },
          },
        },
      },
    },
    notes: {
      // Rooms
      ['notes-room-alias-1']: {
        collectionKey: CollectionKey.notes,
        matrixProvider: null,
        roomAlias: 'notes-room-alias-1',
        name: 'Typescript Study Notes',
        created: new Date(),
        connectStatus: 'ok',
        store: {
          documents: {
            ['0']: {
              text: 'A fact about Typescript',
              // if we follow this dot notation we need to make sure that room aliases don't have dots in them.
              _ref: 'notes.notes-room-alias-1.0',
              _id: '0',
              _created: 1653135317729,
              _updated: 1653135317729,
            },
            ['1']: {
              text: 'Second fact about Typescript',
              _ref: 'notes.notes-room-alias-1.1',
              _id: '0',
              _created: 1653135317729,
              _updated: 1653135317729,
            },
          },
        },
      },
    },
    flashcards: {
      ['flashcards-room-alias-1']: {
        collectionKey: CollectionKey.flashcards,
        matrixProvider: null,
        roomAlias: 'flashcards-room-alias-1',
        name: 'Typescript Study Flashcards',
        connectStatus: 'ok',
        created: new Date(),
        store: {
          documents: {
            ['0']: {
              frontText: 'Question',
              backText: 'Answer',
              noteLink: 'notes.0.0', // or use buildRef('notes', '0','0')
              _ref: 'flashcards.0.0',
              _id: 'noteID',
              _created: 1653135317729,
              _updated: 1653135317729,
            },
          },
        },
      },
      ['flashcards-room-alias-2']: {
        collectionKey: CollectionKey.flashcards,
        matrixProvider: null,
        roomAlias: 'flashcards-room-alias-2',
        name: 'Chinese Study Flashcards',
        connectStatus: 'ok',
        created: new Date(),
        store: {
          documents: {
            ['0']: {
              frontText: 'Question',
              backText: 'Answer',
              noteLink: buildRef(CollectionKey.notes, 0, 0),
              _ref: 'flashcards.1.0',
              _id: 'noteID',
              _created: 1653135317729,
              _updated: 1653135317729,
            },
          },
        },
      },
    },
  },
};
