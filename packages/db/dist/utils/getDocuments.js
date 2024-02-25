"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocuments = void 0;
const utils_1 = require("../utils");
const getDocuments = (_db) => (room) => {
    if (!room)
        throw new Error('no room');
    const documents = room.ydoc?.getMap('documents');
    if (!documents)
        throw new Error('no documents');
    return {
        documents,
        get: (id) => {
            return documents.get(id);
        },
        set: (doc) => {
            doc._updated = Date.now();
            return documents.set(doc._id, doc);
        },
        new: (doc, id) => {
            if (id && documents.get(id)) {
                throw new Error('document already exists');
            }
            let documentId = id || (0, utils_1.randomString)(24);
            if (documents.get(documentId)) {
                documentId = (0, utils_1.randomString)(24);
                if (documents.get(documentId)) {
                    // twice failed to find a unique id
                    throw new Error('document already exists');
                }
            }
            const ref = (0, utils_1.buildRef)({
                authServer: _db.authServer,
                collectionKey: room.collectionKey,
                roomId: room.id,
                documentId,
            });
            const newDoc = (0, utils_1.newDocument)(documentId, ref, doc);
            documents.set(documentId, newDoc);
            return newDoc;
        },
        delete: (id, timeToLiveMs) => {
            const doc = documents.get(id);
            if (!doc)
                throw new Error('document does not exist');
            const oneMonth = 1000 * 60 * 60 * 24 * 30;
            doc._deleted = true;
            doc._ttl = timeToLiveMs ?? new Date().getTime() + oneMonth;
            return documents.set(id, doc);
        },
        getAll: () => {
            return documents.toJSON();
        },
        getUndeleted: () => {
            const undeleted = {};
            documents.forEach((doc) => {
                if (doc && !doc._deleted) {
                    undeleted[doc._id] = doc;
                }
            });
            return undeleted;
        },
        onChange: (callback) => {
            documents.observe(callback);
        },
        sortByRecent: (docs) => {
            const sortedArray = Object.entries(docs).sort((a, b) => b[1]._updated - a[1]._updated);
            return Object.fromEntries(sortedArray);
        },
    };
};
exports.getDocuments = getDocuments;
//# sourceMappingURL=getDocuments.js.map