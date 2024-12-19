import type { Flashcard, Note, Profile, DocumentBase } from '@eweser/shared';
import type { Collections, Documents } from '../types';
import { buildRef } from '../utils';
import { Room } from '../room';
import { Database } from '..';

const db = new Database();

/**
 * some metadata that exists on each document
 */
const metadata: DocumentBase = {
  /**
   * The reference to the room and document. This is used to make relational links between documents.
   * format: <collection_key>.<room_id>.<document_id>
   * room_id includes the auth server url
   */
  _ref: 'profiles.https://www.eweser.com|123abc.123abc',
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
      _ref: 'notes.https://www.eweser.com|0.0',
      _id: '0',
    },
    ['1']: {
      text: 'Second fact about Typescript',
      ...metadata,
      _id: '0',
      _ref: 'notes.https://www.eweser.com|0.1',
    },
    ['abc']: {
      text: 'Third fact about Typescript. Uses a string for id',
      ...metadata,
      _id: 'abc',
      _ref: 'notes.https://www.eweser.com|0.abc',
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
          collectionKey: 'notes',
          roomId: 'https://www.eweser.com|abc123',
          documentId: '0',
          authServer: 'https://www.eweser.com',
        }),
      ],
      _ref: buildRef({
        collectionKey: 'flashcards',
        roomId: 'https://www.eweser.com|abc123',
        documentId: '0',
        authServer: 'https://www.eweser.com',
      }),
      _id: 'noteID',
      _created: 1653135317729,
      _updated: 1653135317729,
    },
  },
};

//** to conceptualize DB shape */
const _exampleDb: { collections: Collections } = {
  collections: {
    notes: {
      // Rooms
      ['my_study_notes']: new Room({
        db,
        collectionKey: 'notes',
        name: 'My Study Notes',
        ydoc: myStudyNotesYDoc as any,
      }),
    },
    flashcards: {
      ['typescript_study_cards']: new Room({
        db,
        collectionKey: 'flashcards',
        name: 'Typescript Study Flashcards',
        ydoc: typescriptFlashcardsYDoc as any,
      }),
      ['chinese_flashcards']: new Room({
        db,
        collectionKey: 'flashcards',
        name: 'Chinese Study Flashcards',
        ydoc: chineseFlashcardsYDoc as any,
      }),
    },
    profiles: {
      ['public']: new Room({
        db,
        collectionKey: 'profiles',
        name: 'Public Profile',
        ydoc: profileYDoc as any,
      }),
      ['private']: new Room({
        db,
        collectionKey: 'profiles',
        name: 'Private Profile',
        ydoc: profilePrivateYDoc as any,
      }),
    },
  },
};

/** V2, drafts for y-sweet control flow: */

/**AUTH SERVER MODEL */

/**
 * A room is a folder or a collection of documents. It is a place where documents are stored. access permissions are set at the room level.
 */
const _room = new Room({
  db,
  id: 'uuid',
  name: 'room_name',
  collectionKey: 'flashcards', // CollectionKey
  tokenExpiry: '12-12-12',
  ySweetUrl: 'https://url-from-ysweet', // acts as a token
  ySweetBaseUrl: 'https://base-url-from-ysweet', // acts as a token
  publicAccess: 'private', //"private" | "read" | "write" // if read or write will invite all aggregators.
  readAccess: ['userId', 'AUTH_SERVER_DOMAIN'], // auth server if just for personal use, more (aggregators) if public
  writeAccess: ['userId', 'AUTH_SERVER_DOMAIN'], // auth server if just for personal use, more (other users) if shared writable
  adminAccess: ['userId'], // generally only user has admin but could give uring sharing
  createdAt: '12-12-12',
  updatedAt: '12-12-12',
  _deleted: false,
  _ttl: null, // '12-12-12' if deleted,

  indexedDbProvider: null,
  webRtcProvider: null,
  ySweetProvider: null,
  ydoc: null,
});

export const _jwt = {
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
