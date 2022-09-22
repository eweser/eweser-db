# eweserdb

🐑🐑🐑EweserDB, the user-owned database🐑🐑🐑

# A User owned database

`EweserDB` empowers developers to quickly create a cloud-synced, local-first, user-owned database, like a decentralized firebase.

Built using [matrix-crdt](https://github.com/YousefED/Matrix-CRDT)

features:

- user owned
- interoperable
- local-first
- full end to end encryption (coming soon)
- real-time sync between devices
- real-time collaboration
- no backend code
- strongly typed schemas
- extensible

# Motivation

### Current paradigm:

You ask the app: Can I see my data?
e.g.

> You ask Facebook:
> Can I see my friends list, please?

### User-owned data paradigm:

The app asks you: Can I see your data?
e.g.

> Facebook asks you:
> Can I see your friends list?

This flipping of the ownership dynamic enables some important features:

- Users can leave the platform at any time and take their data with them to a new one with no loss.
- Apps cannot survive purely on vendor lock-in or network effects and must instead compete to provide the best experience for users.
- Third party apps can build new features and use your data in new innovative ways without relying on the first app's permission, or on them maintaining an API.
- Data changed in the user-owned database by one app will sync to other apps.
- Users can decide to give apps access to only certain parts of their data, and some parts can be read only.
- Users can get started or try out a new app with all their data ready, no onboarding, and able to enjoy all the features of the new app right away.

# Structure

See `/examples/dbShape.ts` for how the data is structured.

Like MongoDB, EweserDB has `documents` and `collections`. In SQL database terms, collections are like tables and documents like rows. Each collection can have only one document. Documents have a strict schema(typescript type). See examples of documents in the `/collections` folder.

documents can be linked by reference using the document's `_ref` property. The ref is simply the `<collection-name>.<room-id>.<document-id>`

# Rooms

To get it working with Matrix-CRDT, EweserDB adds a middle layer between collections and documents called a `room`. Rooms are a group of documents. They correspond to a Matrix room on their Matrix account that is created for each EweserDB `room`. Rooms in EweserDB are private (invite-only) and fully end to end encrypted by default.

The `registry` is a special collection that stores the addresses(`roomAlias`s) to all of the user's other rooms.

# ACL - Access Control, Privacy and Sharing

Building on top of Matrix allows for advanced ACL features right out of the box. All ACL happens on the `room` level. Users can decide which apps or other users have read or write access to which rooms.

# User owned

Matrix currently is a 'federated' system, working towards 100% user-owned and decentralized. When a user signs up to the DB they must provide a Matrix `homeserver` url. The user's data lives on the home server so you might think that means that the server owns the data and this is no different than facebook servers owning/controlling the data.

The first big difference is that users can sign up using a self-hosted homeserver or a homeserver of their choice that they trust more.

Another key distinction is that with end to end encryption enabled(coming soon), the homeserver cannot read any of the data.

A third distinction is because of Matrix's federated model, users could have a second homeserver that connects to each of their rooms, and their data would be stored on both, decreasing centralized control.

EweserDB also plans to increase user ownership by making backing up and restoring the user's data easy and automatic. Backups could be through a traditional provider like dropbox or web3 options like IPFS (through [pinata](https://pinata.cloud)) or Ethereum (through [swarm](https://ethersphere.github.io/swarm-home)).

# Limitations

- [Matrix events size limit](https://github.com/YousefED/Matrix-CRDT/issues/11)
- connecting to rooms can be slow depending on the homeserver, especially the `getRoomIdForAlias` call

# To Do

- [ ] Helper functions like getRegistry, getRoom, getRef
- [ ] Move Database to standalone repo and publish as a library
- [ ] Offline mode.
- [ ] Add encryption
- [ ] Tests
- [ ] Stress testing. warnings about room or document size limits
- [ ] Backups
- [ ] File storage

flesh out example:

- [ ] make a note editor and get the edit function up
- [ ] design a UI for grouping collections(rooms) of notes
- [ ] make a create collection function
- [ ] make flashcard app.
- [ ] connect data from 2 apps with refs.
