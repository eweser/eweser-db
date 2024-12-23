# Notes

## TODO

- [ ]

## Ideas / musings

- Should we make a separate pingger, and online status with listeners for webrtc? so `db.rtcOnline` and `db.emit({event: 'rtcOnlineChange' })` etc.
- `getCollectionRoom` could return a class with some helpers that manipulate the ydoc. e.g. `getCollectionRoom('collection-name').getDoc('doc-id).update({title: 'new title'})` to make crud ops easier.
- set up links in the markdown. e.g. `[[collection-name:doc-id]]`. but how would we intercept the link click and distinguish it from a normal link?
- check out what synced store is doing behind the hood and see if just a simple hook that updates the state on ydoc change would work just as well.
- use a dendrite server with wasm for even stronger user ownership of their data. NOTE: not possible yet, but keep an eye out.
