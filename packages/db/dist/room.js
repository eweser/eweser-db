"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomToServerRoom = exports.Room = void 0;
const y_webrtc_1 = require("y-webrtc");
const events_1 = require("./events");
const getDocuments_1 = require("./utils/getDocuments");
const awareness_js_1 = require("y-protocols/awareness.js");
const yjs_1 = require("yjs");
class Room extends events_1.TypedEventEmitter {
    db;
    id;
    name;
    collectionKey;
    token;
    tokenExpiry;
    ySweetUrl;
    publicAccess;
    readAccess;
    writeAccess;
    adminAccess;
    createdAt;
    updatedAt;
    _deleted;
    _ttl;
    indexedDbProvider;
    webRtcProvider;
    ySweetProvider;
    ydoc;
    connectionRetries = 0;
    disconnect = () => {
        this.ySweetProvider?.disconnect();
        this.webRtcProvider?.disconnect();
        this.emit('roomConnectionChange', 'disconnected', this);
        const Docs = this.getDocuments().getAllToArray();
        Docs.forEach((doc) => {
            delete this.db.tempDocs[doc._id];
        });
    };
    getDocuments;
    tempDoc = (docId) => {
        const existing = this.db.tempDocs[docId];
        if (existing) {
            if (existing.provider?.connected) {
                return existing;
            }
        }
        const doc = new yjs_1.Doc();
        const awareness = new awareness_js_1.Awareness(doc);
        const servers = this.db.webRtcPeers;
        /* could consider improving this security */
        const password = this.id;
        const provider = new y_webrtc_1.WebrtcProvider(docId, doc, {
            password,
            signaling: servers,
            awareness,
        });
        this.db.tempDocs[docId] = { doc, provider, awareness };
        return { doc, provider, awareness };
    };
    constructor({ db, indexedDbProvider, webRtcProvider, ySweetProvider, ydoc, ...serverRoom }) {
        super();
        this.db = db;
        this.id = serverRoom.id || crypto.randomUUID();
        this.name = serverRoom.name;
        this.collectionKey = serverRoom.collectionKey;
        this.token = serverRoom.token ?? null;
        this.tokenExpiry = serverRoom.tokenExpiry ?? null;
        this.ySweetUrl = serverRoom.ySweetUrl ?? null;
        this.publicAccess = serverRoom.publicAccess ?? 'private';
        this.readAccess = serverRoom.readAccess ?? [];
        this.writeAccess = serverRoom.writeAccess ?? [];
        this.adminAccess = serverRoom.adminAccess ?? [];
        this.createdAt = serverRoom.createdAt ?? null;
        this.updatedAt = serverRoom.updatedAt ?? null;
        this._deleted = serverRoom._deleted ?? false;
        this._ttl = serverRoom._ttl ?? null;
        this.indexedDbProvider = indexedDbProvider;
        this.webRtcProvider = webRtcProvider;
        this.ySweetProvider = ySweetProvider;
        this.ydoc = ydoc;
        this.getDocuments = () => (0, getDocuments_1.getDocuments)(this.db)(this);
    }
}
exports.Room = Room;
function roomToServerRoom(room) {
    const { indexedDbProvider: _unused_1, webRtcProvider: _unused_2, ySweetProvider: _unused_3, ydoc: _unused_4, ...serverRoom } = room;
    return serverRoom;
}
exports.roomToServerRoom = roomToServerRoom;
//# sourceMappingURL=room.js.map