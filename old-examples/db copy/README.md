# eweserdb

🐑🐑🐑 EweserDB, the user-owned database 🐑🐑🐑

<a href="https://matrix.to/#/#eweser-db:matrix.org"><img alt="Matrix" src="https://img.shields.io/badge/Chat on matrix%20-%23000.svg?&style=for-the-badge&logo=matrix&logoColor=white"/></a>

# A User owned database

`EweserDB`, (pronounced 'user deebee') empowers developers to quickly create a user-owned database that is local-first yet syncs to the cloud

> it's like a decentralized 🔥firebase🔥.

It syncs user data to a [Matrix](https://www.matrix.org/) chat room using a [yjs](https://github.com/yjs/yjs) [CRDT](https://crdt.tech/). Builds on the [matrix-crdt](https://github.com/YousefED/Matrix-CRDT) library to provide NoSQL style document database.

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

Note: You'll probably also need to add some node.js polyfills for the browser, see `packages/example-basic`'s `package.json`, `vite.config.js`, and `index.html` for an example.
If you encounter an installation error about `@matrix-org/olm`, copy the `.npmrc` file from the root of this repo into your project.

This is a simplified example. For a more use cases and working demos see the example apps like `packages/example-basic/src/App.tsx`

```tsx
import { Database } from '@eweser/db';
import type { Note } from '@eweser/db';

const db = new Database();

const collectionKey = 'notes'; // or use the enum CollectionKey exported from the db package
const roomId = 'notes-default'; // basically the code-facing 'name' of a room
const initialRoomConnect = { collectionKey, roomId };

// If a user has previously logged in, `load` will try to start up the database and connect to the collections provided in the array.
// If offline, it will open up a local-only database and the user can start interacting with the data immediately. If online, it will also connect the matrix rooms and start syncing.
db.load([initialRoomConnect]);

db.login({
  userId: 'user',
  password: 'password',
  baseUrl: 'https://matrix.org', // or your own homeserver, or the user's self-hosted homeserver. If using matrix.org, instruct users to signup for an account at https://app.element.io/.
  initialRoomConnect,
});
// ...
db.on('my-listener', ({ event }) => {
  if (event === 'started') {
    // load up the ui and start using the database
  }
});

const room = db.getRoom<Note>(collectionKey, roomId); // this is a matrix room that stores a collection of note documents which share a `Note` schema.

// This Notes object provides a set of methods for easily updating the documents in the room. It is a wrapper around the ydoc that is provided by the room.
const Notes = db.getDocuments(notesRoom);

Notes.onChange((event) => {
  console.log('ydoc changed', event);
});

Notes.new({ text: 'hello world' });
```

That's it! 🚀🚀🚀 You now have a user-owned database that syncs between devices and apps.

Try opening in another browser or device and notice the changes sync.
Refresh the page and notice the data persists.
Turn off your internet and notice the data still updates.

# Features

## Structure

See `packages/db/examples/dbShape.ts` for how the data is structured.

Like MongoDB, EweserDB has `document`s and `collection`s. In SQL database terms, collections are like tables and documents like rows. Each collection can have only one document. Documents have a strict schema(typescript type). See examples of documents in the `/collections` folder.

Documents can be linked by reference using the document's `_ref` property. The ref is simply the `<collection>.<roomId>.<documentId>` e.g. `flashcards.#roomName~flashcards~@username:matrix.org.doc-id`.
Say you wanted to store a reference to a note from a flashcard, you could add the following to the flashcard document:

```ts
{
  note_ref: db.buildRef('notes', 'default', 'note-id'),
}
```

## Rooms

Each `room` corresponds to a Matrix chat room that will be created on the user's Matrix account inside a space called "My Database". Rooms in EweserDB are private (invite-only) and (coming soon) will be fully end to end encrypted by default.

The `registry` is a special collection that stores the addresses(`roomId`s) to all of the user's other rooms.

## ACL - Access Control, Privacy and Sharing

Building on top of Matrix allows for advanced ACL features right out of the box. All ACL happens on the `room` level. Users can decide which apps or other users have read or write access to which rooms simply by using Matrix's built in privacy control features and by inviting or kicking out other users in the room.

## User owned

Matrix is a 'federated' system, working towards 100% user-owned and decentralized. When a user signs up to the DB they must provide a Matrix `homeserver` url. The user's data lives on the home server so at first glance it appears that the server owns the data and this is no different than facebook servers owning/controlling the data.

The first big difference is that users can sign up using a self-hosted homeserver or a homeserver of their choice that they trust more.

Another key distinction is that with end to end encryption enabled (coming soon), the homeserver cannot read any of the data.

Thirdly, because of Matrix's federated model, users could have a second homeserver that connects to each of their rooms, and their data would be stored on both, decreasing centralized control.

In the future, Matrix has plans to roll out full P2P functionality, which would allow each device to act as its own homeserver.

EweserDB also plans to increase user ownership by making backing up and restoring the user's data easy and automatic. Backups could be through a traditional provider like dropbox or web3 options like IPFS (through [pinata](https://pinata.cloud)) or Ethereum (through [swarm](https://ethersphere.github.io/swarm-home)).

## Extending the Database and Collections

Say you'd like to add a new collection or document type, like `TodoItem`, or `BlogPost` etc. Either you'd like it to be only accessible by your app, or to other apps that use eweser-db as well.

To make the collection usable by other apps, submit a pull request to add the collection types. Follow the examples in the `db/src/collections` folder.

To only use a document in your app that you don't want made available to other apps, fork the project and do the same thing, or extend locally and use some `//@ts-ignore`s for the type errors you will encounter.

## App development strategy, user consent

As it is designed now, when the user signs in, the app will have read/write access to the full user-owned database for the duration of the session. Users should be made aware of this fact when logging in to an app. People are already comfortable with an app managing its own data, but it is another level of trust required in the app to also let it manage data used by other apps. Users need to know the level of trust they are putting in each app when they sign ing.

Because user-owned data flips the current data storage paradigm on its head, app developers might be wondering how to share public data between users. For example, a user might mark a certain collection of notes as public and apps could aggregate them and let other users search and discover those.

One solution would be that for each room marked as 'public' by the user, we could invite an observer account into the room.

Another option would be to simply use a traditional database for public collections, but then that would break interoperability between apps.

This is an area that needs further consideration. Community input is appreciated.

## Limitations

- This project is still in Alpha. It is not ready for production use. Database schema and API are subject to change.
- [Matrix events size limit](https://github.com/YousefED/Matrix-CRDT/issues/11)
- [Matrix-crdt e2ee support](https://github.com/YousefED/Matrix-CRDT/pull/17)
- connecting to rooms can be slow depending on the homeserver, especially the `getRoomIdForAlias` call when the homeserver has many rooms it needs to search through. Because the registry stores the id, the second time a room is connected to it should be faster.
- Developers should minimize the number of rooms the user has connected to at any given time and use `room.matrixProvider.dispose()` to disconnect from rooms when they are not needed. Otherwise you might run into an error saying there are too many event listeners.

# Example apps

- [Basic Notes App](https://eweser-db-example-basic.netlify.app/), dev [url](http://localhost:8000/)

  - view the code at `/packages/example-basic`.
  - E2E test is in `/e2e/cypress/tests/basic.cy.js`

- [Notes App with Markdown Editor](https://eweser-db-example-editor.netlify.app/), dev [url](http://localhost:8100/)

  - view the code at `/packages/example-editor`.
  - E2E test is in `/e2e/cypress/tests/editor.cy.js`

- [Multi-room](https://eweser-db-example-editor.netlify.app/), dev [url](http://localhost:8300/)

  - view the code at `/packages/example-multi-room`.
  - E2E test is in `/e2e/cypress/tests/multi-room.cy.js`

- [Interoperability - Notes](https://eweser-db-example-interop-flashcards.netlify.app/), dev [url](http://localhost:8400/)
  Use this app to link notes in this app to flashcards in the next flashcards app.

  - view the code at `/packages/example-interop-flashcards`.
  - E2E test is in `/e2e/cypress/tests/interoperability.cy.js`

- [Interoperability - Flashcards](https://eweser-db-example-interop-flashcards.netlify.app/), dev [url](http://localhost:8500/)

  - view the code at `/packages/example-interop-flashcards`.
  - E2E test is in `/e2e/cypress/tests/interoperability.cy.js`

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

This will run the example apps in `packages/example-basic` and `packages/example-editor` etc.

Example apps will be served at the dev urls listed above.

Run unit tests by first starting the docker server (make sure you have docker running) with `npm run start-test-server` and then `npm run test`

Run e2e tests headless once with `npm run test:e2e`, or with `npm run dev-e2e` to open the Cypress GUI.

# To Do

Priority:

- [ ] **Files:** set up file hosting provider services like Pinata, Dropbox, etc. and give users the option to connect their accounts to the app. Could also try the ‘matrix files’ [library](~https://github.com/matrix-org/matrix-files-sdk~).
- [ ] **Public data**: set up ‘aggregator’ listeners when a user makes a collection as public. These will be MatrixReader’s that live on a node server and listen for changes to the collection. How to aggregate and serve to public listeners?
- [ ] **Backups** - user can add storage account (dropbox, pinata, etc) that store snapshots of the database in the file hosting provider.
- [ ] End 2 End **Encryption** — multiple devices?
- [ ] **Sharing,**: user can invite another to a room and collaborate on the documents within. Can also just be read only
- [ ] Versioning strategy for schema/api changes. How to maintain backwards compatibility with older versions of the database.
- [ ] Per-App **Access control**. Instead of signing in the matrix client as the user, we could instead sign in with a Matrix account provided by the app owner, and then have the use invite that account into each room, specifying read-only or write permissions.

Nice to haves:

- [ ] Add WebRTC to addTempDocToRoom()
- [ ] create an async cron job that runs after the db loads, and once a day, to delete items with the \_deleted flag whose ttl has expired.
- [ ] set up the ‘awareness’ listeners for shared editing.
- [ ] example of next.js, server-side rendering workarounds
- [ ] give some instructions on self-hosting.
- [ ] set up a matrix synapse server so that users can sign up with me instead of matrix.org.
- [ ] make 2 servers and federate them. Figure out a federation-as-backup strategy for users, for example inviting another of our accounts as a listener to each of your rooms.
- [ ] “Joins” or aggregation searches across collections. e.g. select all documents in the `notes` collection that have a ref to a document in the `flashcards` collection.
- [ ] Stress testing. warnings about room or document size limits
- [ ] **offline mode:** offline first - allow interacting with app before ever signed up or logged in. This might just need to be an example, not db feature. Might need to add an 'initialValues' option to create and connect room.
