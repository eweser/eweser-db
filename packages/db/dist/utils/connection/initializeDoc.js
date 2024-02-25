"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDocAndLocalProvider = void 0;
const y_indexeddb_1 = require("y-indexeddb");
const yjs_1 = require("yjs");
const initializeDocAndLocalProvider = async (roomId, existingDoc) => {
    const ydoc = existingDoc || new yjs_1.Doc();
    if (!ydoc)
        throw new Error('could not create doc');
    const localProvider = new y_indexeddb_1.IndexeddbPersistence(roomId, ydoc);
    if (localProvider.synced)
        return { ydoc, localProvider };
    const synced = await localProvider.whenSynced;
    if (synced.synced)
        return { ydoc, localProvider };
    else
        throw new Error('could not sync doc');
};
exports.initializeDocAndLocalProvider = initializeDocAndLocalProvider;
//# sourceMappingURL=initializeDoc.js.map