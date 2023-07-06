import { MongoClient, ServerApiVersion } from 'mongodb';
import { logger } from './helpers.js';
import { MONGO_URL } from './constants.js';

const mongoClient = await new MongoClient(MONGO_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).connect();

const db = mongoClient.db();
const ping = await db.command({ ping: 1 });
logger('connected to mongo: ' + JSON.stringify(ping));

// MODEL
const roomsCollectionKey = 'rooms';
export type MongoRoomRecord = {
  roomId: string;
};

const Rooms = db.collection<MongoRoomRecord>(roomsCollectionKey);

// METHODS
export const getAllRooms = async () => await Rooms.find({}).toArray();

export const addRoom = async (roomId: string) => {
  const existing = await Rooms.findOne({ roomId });
  if (!existing) {
    await Rooms.insertOne({ roomId });
  }
};

export default db;
