"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractUserIdLocalPart = exports.buildFullUserId = exports.getRoom = exports.getRoomDocuments = exports.randomString = exports.wait = exports.buildRef = exports.newDocument = void 0;
/** Sets the metadata like created and updated for the doc */
const newDocument = (_id, _ref, doc) => {
    const now = new Date().getTime();
    const base = {
        _created: now,
        _id,
        _ref,
        _updated: now,
        _deleted: false,
        _ttl: undefined,
    };
    // @ts-ignore
    return { ...base, ...doc };
};
exports.newDocument = newDocument;
/**
 *
 * @param collection e.g. `'flashcards'` "flashcards"
 * Params must be strings and cannot include `|`
 * @returns `${authServer}|${collectionKey}|${roomId}|${documentId}`
 * @example 'https://eweser.com|flashcards|room-id-uuid|doc-id-uuid'
 */
const buildRef = (params) => {
    Object.entries(params).forEach(([key, param]) => {
        if (!param)
            throw new Error(`${key} is required`);
        if (typeof param !== 'string')
            throw new Error(`${key} must be a string`);
        if (param.includes('|'))
            throw new Error(`${key} cannot include |`);
    });
    const { collectionKey, roomId, documentId, authServer } = params;
    // from large to small groupings
    return `${authServer}|${collectionKey}|${roomId}|${documentId}`;
};
exports.buildRef = buildRef;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.wait = wait;
const randomString = (length) => Math.random()
    .toString(36)
    .substring(2, length + 2);
exports.randomString = randomString;
function getRoomDocuments(room) {
    if (!room.ydoc)
        throw new Error('room.ydoc not found');
    const registryMap = room.ydoc.getMap('documents');
    return registryMap;
}
exports.getRoomDocuments = getRoomDocuments;
const getRoom = (_db) => ({ collectionKey, roomId, }) => {
    const room = _db.collections[collectionKey][roomId];
    if (!room)
        return null;
    return room;
};
exports.getRoom = getRoom;
const buildFullUserId = (username, homeserver) => {
    if (!username)
        throw new Error('username is required');
    if (!homeserver)
        throw new Error('homeserver is required');
    const homeserverParsed = homeserver.includes('http://') || homeserver.includes('https://')
        ? homeserver.split('://')[1]
        : homeserver;
    return `@${username}:${homeserverParsed}`;
};
exports.buildFullUserId = buildFullUserId;
/** returns the local part of a userId.
 * @example extractUserIdLocalPart('@username:matrix.org') => 'username'
 */
const extractUserIdLocalPart = (userId) => {
    if (!userId)
        throw new Error('userId is required');
    if (!userId.includes('@'))
        throw new Error('userId is invalid');
    if (!userId.includes(':'))
        throw new Error('userId is invalid');
    return userId.split('@')[1].split(':')[0];
};
exports.extractUserIdLocalPart = extractUserIdLocalPart;
//# sourceMappingURL=index.js.map