# Eweser Public Aggregator

A server that listens to Matrix rooms marked as public by @eweser/db users, and provides a public API for searching the data.

Shared data is saved into a MongoDB database to enable searches.

The server creates a ydoc listener for each room and updates the database on changes.

The aggregator will only listen to collections listed from the `@eweser/db` package `CollectionKey` enum.

## Dev instructions

Before running the server make sure that the matrix server is running and has a user account with the username and password set in the .env file.

Also make sure that the MongoDB server is running.

Run the server with `npm run dev`. If you want to run the server in production mode, run `npm run build` and then `npm run start`.

## API

When the server is running, you can access the API at `http://localhost:3000/api`.

### Join room

Invites the aggregator to join a room marked as public. Client DBs will invite all known aggregators when creating a public room.

Params defined in `ApiParamsJoinRoomGet`:

### Search
