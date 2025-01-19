"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDocAndLocalProvider = void 0;
const y_indexeddb_1 = require("y-indexeddb");
const yjsWrapper_1 = require("../../utils/yjsWrapper");
const initializeDocAndLocalProvider = async (roomId, existingDoc, provider) => {
    const yDoc = existingDoc || new yjsWrapper_1.Doc();
    if (!yDoc)
        throw new Error('could not create doc');
    const localProvider = provider
        ? provider(roomId, yDoc)
        : new y_indexeddb_1.IndexeddbPersistence(roomId, yDoc);
    if (localProvider.synced)
        return { yDoc: yDoc, localProvider };
    const synced = await localProvider.whenSynced;
    if (synced.synced)
        return { yDoc, localProvider };
    else
        throw new Error('could not sync doc');
};
exports.initializeDocAndLocalProvider = initializeDocAndLocalProvider;
//# sourceMappingURL=initializeDoc.js.map