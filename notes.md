# Notes

- add packages to lerna with `lerna add <package> --scope=<library-folder-name>` e.g. lerna add axios --scope=@eweser/db

## TODO

- new load method unit tests. cleanup helpers/utils.
- `getCollectionRoom` could return a class with some helpers that manipulate the ydoc. e.g. `getCollectionRoom('collection-name').getDoc('doc-id).update({title: 'new title'})` to make crud ops easier. Make the basic exampleapp use as little code as possible. Update the event emitter to have a special 'onLoaded' event and a 'onLoginSuccess' event so we just have to listen to those two.
- get sub-docs working in editor example
- update plaintext on editor ydoc change
- make example of multiple collections and switching between them
- set up cross collection reference links and helpers. First we can just use data links,
  - but it would be awesome to set up links in the markdown. e.g. `[[collection-name:doc-id]]`. but how would we intercept the link click and distinguish it from a normal link?
- check out what synced store is doing behind the hood and see if just a simple hook that updates the state on ydoc change would work just as well.
- rewrite the ewe-note app, keeping just the markdown editor work. Try to get as close as possible to all the features in the examples just without the and the styling. See if syncedStore will be better vs the simple hook idea.
- store user session in localStorage and retrieve on ddb start up. maybe create a new 'load' command that tries to login from the session and connect a room given in the options.
- offline mode: document in examples how to load just one room offline
- example of using syncedStore with a react component. get rid of `hooks` library and just try to make the base DB easier to use.
- example of next.js, server-side rendering workarounds
- consider using a dendrite server with wasm for true user ownership of their data. This would require a lot of work to set up a server and federate it with matrix.org. But it would be cool to have a true decentralized app.
- set up the 'awareness' listeners for shared editing and faster sync.
- build full-fledged example apps like ewe-note and IPFC.
- set up 'aggregator' listeners when a user makes a collection as public. These will be MatrixReader's that live on a node server and listen for changes to the collection. How to aggregate and serve to public listeners?
- set up file hosting provider services like Pinata, Dropbox, etc. and give users the option to connect their accounts to the app. Could also try the 'matrix files' [library](https://github.com/matrix-org/matrix-files-sdk).
- set up backup services that store snapshots of the database in the file hosting provider.
- set up a matrix synapse server so that users can sign up with me instead of matrix.org.
- give some instructions on self-hosting.
- make 2 servers and federate them. Figure out a federation strategy, like inviting another listener to each of your rooms.
- figure out how E2E Encryption works and how it would work on multiple devices for users.
