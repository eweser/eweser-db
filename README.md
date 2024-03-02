# eweserdb

🐑🐑🐑 EweserDB, the user-owned database 🐑🐑🐑

# A User owned database

`EweserDB`, ('Ewe-ser' pronounced 'user') empowers developers to quickly create a user-owned database that is local-first yet syncs to the cloud

> it's like a decentralized 🔥firebase🔥.

More than that, it lets independent app developers build on top of each other's data and collaborate in real-time.

It syncs user data using a [yjs](https://github.com/yjs/yjs) [CRDT](https://crdt.tech/). Eweser provides the following packages:

- A lightweight database JavaScript client. This is all most developers will need.
- An authentication server if app developers or power users want to self-host their own homeserver.
- An 'aggregator' server to provide public data to users. (WIP)
- A set of example apps that show how to use the database in different ways.

## Features:

- User owned
- Interoperable between apps
- Real-time sync between devices
- Local-first / offline-first
- Real-time collaboration
- No backend code needed
- Strongly typed schemas
- Extensible
- Fully open source

# Motivation

## Frustration

> I've been using this note-taking app for a while and built up a ton of data in it.

> I want to try out or migrate to a new app, but I feel locked in.

> Ugh! 😤 I have to start over and re-enter all my data. Even if they provide an export, it usually doesn't work or is missing data.

## Current paradigm:

You ask the app: "Can I see my data?"
e.g.

> You ask Facebook:

> "Can I see my friends list, please?"

## User-owned data paradigm:

The app asks you: Can I see your data?
e.g.

> Facebook asks you:

> "Can I see your friends list?"

This flipping of the ownership dynamic enables some important features:

- Data changed in the user-owned database by one app will sync to other apps.
- Users can leave an app's platform at any time and take their data with them to a new one with no loss.
- Apps cannot survive purely on vendor lock-in or network effects and must instead compete to provide the best experience for users.
- Third party apps can build new features and use your data in new innovative ways without relying on the first app's permission, or on them maintaining an API.
- Users can get started or try out a new app with all their data ready, with no onboarding, and are able to enjoy all the features of the new app right away.

# Get Started

`npm install @eweser/db`

This is a simplified example. For a more use cases and working demos see the example apps like `packages/example-basic/src/App.tsx`

```tsx
import { Database } from '@eweser/db';
import type { Note } from '@eweser/db';

const initialRooms = [
  {
    collectionKey: 'notes', // this marks it as a certain schema with strict typing
    name: 'My Notes on Life and Things',
  },
];

const db = new Database({ initialRooms });

db.on('roomsLoaded', () => {
  // .. ready to use in offline mode immediately
});

const room = db.getRoom<Note>(collectionKey, aliasSeed); // this 'room' is like a folder with a set of access permissions on it and stores a collection of note documents which share a `Note` schema.

// This Notes object provides a set of methods for easily updating the documents in the room. It is a wrapper around the ydoc that is provided by the room.
const Notes = db.getDocuments(notesRoom);

Notes.onChange((event) => {
  console.log('ydoc changed', event);
});

Notes.new({ text: 'hello world' });

// To get data to sync on the cloud, we need to connect to an auth server/homeserver
const loginUrl = db.generateLoginUrl({ name: 'Basic Example App' }); // use this url to redirect the user to the auth server's login page
// the user will be sent back with a token in the url

if (
  db.getToken() // looks for the token in the url or in local storage
) {
  db.login();
}
```

That's it! 🚀🚀🚀 You now have a user-owned database that syncs between devices and apps.

Try opening in another browser or device and notice the changes sync.
Refresh the page and notice the data persists.
Turn off your internet and notice the data still updates in the browser app.
Turn it back on and watch the sync propagate to the other device. (TODO: Reimplement log back in on internet connection reestablished)

# Features

## Structure

See `packages/db/examples/dbShape.ts` for how the data is structured.

Like MongoDB, EweserDB has `document`s and `collection`s. In SQL database terms, collections are like tables and documents like rows. Documents have a strict schema(typescript type). Each collection can have only one schema(document) but as many of those documents as you'd like. See examples of document schemas in the `/collections` folder.

Documents can be linked by reference using the document's `_ref` property. The ref is simply the `${collection}|${roomId}|${documentId}` e.g. `flashcards.https://www.eweser.com|uuid.doc-id`.
Say you wanted to store a reference to a note from a flashcard, you could add the following to the flashcard document:

```ts
{
  note_ref: db.buildRef({collectionKey: 'notes', roomId: notesRoom.roomId, docId: noteDocId}),
}
```

## Rooms

A `room` could be conceptualized as a 'folder' or 'group' of documents. Each room is a

## ACL - Access Control, Privacy and Sharing

ACL is handled by the auth server

## User owned

First off, the data is local-first, meaning the user always has access to their data even offline, compare this to services like Google Docs where you can't access your data without an internet connection.

The cloud persistence of the data is handled by the auth server, so there is a custodial relationship there. However it will be easy for power users to host their own server. Auth servers are federated, meaning a user could share access to their data with another user on a different server.

## Extending the Database and Collections

Say you'd like to add a new collection or document type, like `TodoItem`, or `BlogPost` etc. Either you'd like it to be only accessible by your app, or to other apps that use eweser-db as well.

To make the collection usable by other apps, submit a pull request to add the collection types. Follow the examples in the `db/src/collections` folder.

To only use a document in your app that you don't want made available to other apps, fork the project and do the same thing, or extend locally and use some `//@ts-ignore`s for the type errors you will encounter.

## User consent notice

As it is designed now, when the user signs in, the app will have read/write access to the full user-owned database for the duration of the session. Users should be made aware of this fact when logging in to an app. People are already comfortable with an app managing its own data, but it is another level of trust required in the app to also let it manage data used by other apps. Users need to know the level of trust they are putting in each app when they sign in.

## Publicly shared data - aggregator servers

Because user-owned data flips the current data storage paradigm on its head, app developers might be wondering how to share public data between users.

This is achieved using 'aggregator' servers. These are public Matrix accounts/servers which the user can invite to the room that they wish to make public. The aggregator server will listen to changes in the room and update a local database. Apps can query the aggregators to search public data.

## Limitations

- This project is still in Alpha. It is not ready for production use. Database schema and API are subject to change.
- Developers should minimize the number of rooms the user has connected to at any given time (current limit is set to 100) and use `db.disconnectRoom()` to disconnect from rooms when they are not needed. Otherwise you might run into an error saying there are too many event listeners.

# Example apps

### [Basic Notes App](https://eweser-db-example-basic.netlify.app/)

- dev [url](http://localhost:8000/)
- view the code at `/examples/example-basic`.
- E2E test is in `/e2e/cypress/tests/basic.cy.js`

# Contribute and develop

## How to contribute

- Make an app with EweserDB and provide feedback. We can make an 'awesome-eweserdb' list of interoperable apps that use it.
- Submit a pull request to add (for example):
  - a new collection type to the `db` package.
  - a new e2e test to the `e2e` package.
  - a new example app to the `example` package.
  - a new feature to the `db` package.
  - something from the to do list below.

## Set up local dev

`npm install`
`npm run dev`

This will run the example apps in `examples/example-basic`

Example apps will be served at the dev urls listed above.

Run unit tests by first starting the docker server (make sure you have docker running) with `npm run start-test-server` and then `npm run test`

Run e2e tests headless once with `npm run test:e2e`, or with `npm run dev-e2e` to open the Cypress GUI.

# To Do

Priority:

- [ ] **Sharing,**: user can invite another to a room and collaborate on the documents within. Can also just be read only
- [ ] **Public data**: set up ‘aggregator’ listeners when a user makes a collection as public. These will be MatrixReader’s that live on a node server and listen for changes to the collection. How to aggregate and serve to public listeners?
- [ ] **Files:** set up file hosting provider services like Pinata, Dropbox, etc. and give users the option to connect their accounts to the app.
- [ ] **Backups** - user can add storage account (dropbox, pinata, etc) that store snapshots of the database in the file hosting provider.
- [ ] End 2 End **Encryption** — multiple devices?
- [ ] Versioning strategy for schema/api changes. How to maintain backwards compatibility with older versions of the database.

Nice to haves:

- [ ] Add WebRTC to addTempDocToRoom()
- [ ] create an async cron job that runs after the db loads, and once a day, to delete items with the \_deleted flag whose ttl has expired.
- [ ] set up the ‘awareness’ listeners for shared editing.
- [ ] example of next.js, server-side rendering workarounds
- [ ] give some instructions on self-hosting.
- [ ] make 2 servers and federate them. Figure out a federation-as-backup strategy for users, for example inviting another of our accounts as a listener to each of your rooms.
- [ ] “Joins” or aggregation searches across collections. e.g. select all documents in the `notes` collection that have a ref to a document in the `flashcards` collection.
- [ ] Stress testing. warnings about room or document size limits
- [ ] **offline mode:** offline first - allow interacting with app before ever signed up or logged in. This might just need to be an example, not db feature. Might need to add an 'initialValues' option to create and connect room.

- [ ] regenerate token on failed room connection
- [ ] newRoom
- [ ] don't send to permissions page if grant already exists and matches the login request permissions. just redirect back with token.
- [ ] reimplement server ping, online check, reload when re-online.
- [ ] track users' active sync hours and charge them for it or limit after a certain amount, based on ySweet pricing model.
