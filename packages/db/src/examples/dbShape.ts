import type { Flashcard, Note, Profile } from '../collections';
import type { DocumentBase } from '../collections/documentBase';
import type { Collections, Documents } from '../types';
import { CollectionKey } from '../types';
import { buildRef } from '../utils';

/**
 * some metadata that exists on each document
 */
const metadata: DocumentBase = {
  /**
   * The reference to the room and document. This is used to make relational links between documents.
   * format: <collection_key>.<room_id>.<document_id>
   * room_id includes the auth server url
   */
  _ref: 'profiles.https://eweser.com|123abc.123abc',
  _id: '123abc',
  _created: 1653135317729,
  _updated: 1653135317729,
  _deleted: false,
  _ttl: undefined,
};

const profileYDoc: { documents: Documents<Profile> } = {
  documents: {
    ['default']: {
      firstName: 'Eweser',
      ...metadata,
    },
  },
};
const profilePrivateYDoc: { documents: Documents<Profile> } = {
  documents: {
    ['default']: {
      lastName: 'DB',
      ...metadata,
    },
  },
};

const myStudyNotesYDoc: { documents: Documents<Note> } = {
  documents: {
    ['0']: {
      text: 'A fact about Typescript',
      ...metadata,
      _ref: 'notes.https://eweser.com|0.0',
      _id: '0',
    },
    ['1']: {
      text: 'Second fact about Typescript',
      ...metadata,
      _id: '0',
      _ref: 'notes.https://eweser.com|0.1',
    },
    ['abc']: {
      text: 'Third fact about Typescript. Uses a string for id',
      ...metadata,
      _id: 'abc',
      _ref: 'notes.https://eweser.com|0.abc',
    },
  },
};

const typescriptFlashcardsYDoc: { documents: Documents<Flashcard> } = {
  documents: {
    ['0']: {
      frontText: 'Question',
      backText: 'Answer',
      // links to other document ref
      noteRefs: ['notes.my_study_notes.0'], // or use buildRef()
      ...metadata,
    },
  },
};

const chineseFlashcardsYDoc: { documents: Documents<Flashcard> } = {
  documents: {
    ['0']: {
      frontText: 'What does 火 mean?',
      backText: 'Fire🔥',
      noteRefs: [
        buildRef({
          collectionKey: CollectionKey.notes,
          roomId: 'https://eweser.com|abc123',
          documentId: '0',
        }),
      ],
      _ref: buildRef({
        collectionKey: CollectionKey.flashcards,
        roomId: 'https://eweser.com|abc123',
        documentId: '0',
      }),
      _id: 'noteID',
      _created: 1653135317729,
      _updated: 1653135317729,
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
        roomId: 'https://eweser.com|uuid',
        name: 'My Study Notes',
        created: new Date(),
        connectStatus: 'ok',
        ydoc: myStudyNotesYDoc as any,
        tempDocs: {},
        webRtcProvider: null,
        indexeddbProvider: null,
      },
    },
    flashcards: {
      ['typescript_study_cards']: {
        collectionKey: CollectionKey.flashcards,
        roomId: 'https://eweser.com|uuid',
        name: 'Typescript Study Flashcards',
        connectStatus: 'ok',
        created: new Date(),
        ydoc: typescriptFlashcardsYDoc as any,
        tempDocs: {},
        webRtcProvider: null,
        indexeddbProvider: null,
      },
      ['chinese_flashcards']: {
        collectionKey: CollectionKey.flashcards,
        roomId: 'https://eweser.com|uuid',
        name: 'Chinese Study Flashcards',
        connectStatus: 'ok',
        created: new Date(),
        ydoc: chineseFlashcardsYDoc as any,
        tempDocs: {},
        webRtcProvider: null,
        indexeddbProvider: null,
      },
    },
    profiles: {
      ['public']: {
        collectionKey: CollectionKey.profiles,
        roomId: 'https://eweser.com|uuid',
        name: 'Public Profile',
        connectStatus: 'ok',
        created: new Date(),
        ydoc: profileYDoc as any,
        tempDocs: {},
        webRtcProvider: null,
        indexeddbProvider: null,
      },
      ['private']: {
        collectionKey: CollectionKey.profiles,
        roomId: 'https://eweser.com|uuid',
        name: 'Private Profile',
        connectStatus: 'ok',
        created: new Date(),
        ydoc: profilePrivateYDoc as any,
        tempDocs: {},
        webRtcProvider: null,
        indexeddbProvider: null,
      },
    },
  },
};

/** V2, drafts for y-sweet control flow: */

/**A UTH SERVER MODEL */

/**
 * A room is a folder or a collection of documents. It is a place where documents are stored. access permissions are set at the room level.
 */
export const room = {
  id: 'room_id', // <authserver-url>|<uuid>
  name: 'room_name',
  collection_key: 'enum CollectionKey',
  token: 'string', // y-sweet access token to sync the document
  doc_id: 'string', // y-sweet document id. <user_id>|<collection_key>|<room_id>
  public: 'boolean', // if true, anyone can access the room. will invite all aggregators.

  read_access: 'enum array user_id[]', // can read
  write_access: 'enum array user_id[]', // can write
  admin_access: 'enum array user_id[]', // can change access

  created: 'date',
  updated: 'date',
};

export const jwt = {
  id: 'jwt_id',
  access_record_id: '<user_id>|<requester_id>',

  owner_id: 'user_id',
  requester_id: 'requester_app_domain or requester_user_server_id',
  requester_type: "enum 'app' 'user'",
  created: 'date',
  updated: 'date',
  expires: 'date',
  keep_alive_days: 'number', // auto renew, extend expiry date by x days every time token is used
};

/**
 * generate on signup (give db access to an app). used to create the access token jwt
 * can only update from the auth server website.
 * basically what is inside the jwt... except for the room_ids array which might be a bit too large for a jwt.
 * after an app is permissioned by the user, they use the jwt to quickly access this access_grant from the db, and make a join call for all the room.tokens, room.names, and room.collection_keys for any room_ids in the access_grant.
 * The access grant has some duplicate data from the room table, but it is necessary to have it in one place for quick access.
 * make helper functions that update the access_grant and room tables at the same time.
 */
export const access_grant = {
  id: '<user_id>|<requester_id>',

  is_valid: 'boolean', // use to revoke an existing jwt, although it is better to just create a new jwt
  room_ids: 'enum array string[]',

  // jwt info:
  owner_id: 'user_id',
  requester_id: 'requester_app_domain or requester_user_server_id',
  requester_type: "enum 'app' 'user'",
  jwt_id: 'jwt_id',
  created: 'date',
  updated: 'date',
  expires: 'date',
  keep_alive_days: 'number', // auto renew, extend expiry date by x days every time token is used

  // validate url to make sure it isnt too long like over 200 chars
  // requester_user_id: '<https://authserver.com>|<user_id>',
  // requester_app_domain: 'app.com',
};
