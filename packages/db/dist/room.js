"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
exports.roomToServerRoom = roomToServerRoom;
const events_1 = require("./events");
const getDocuments_1 = require("./utils/getDocuments");
const loadRoom_1 = require("./methods/connection/loadRoom");
class Room extends events_1.TypedEventEmitter {
    db;
    name;
    collectionKey;
    id;
    tokenExpiry;
    ySweetUrl;
    ySweetBaseUrl;
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
    connectionStatus = 'disconnected';
    connectAbortController;
    disconnect = () => {
        this.ySweetProvider?.disconnect();
        this.webRtcProvider?.disconnect();
        this.emit('roomConnectionChange', 'disconnected', this);
    };
    getDocuments;
    load;
    addingAwareness = false;
    /** disconnect and reconnect the existing ySweetProvider, this time with awareness on */
    addAwareness = async () => {
        if (this.addingAwareness || this.ySweetProvider?.awareness) {
            return;
        }
        this.addingAwareness = true;
        this.ySweetProvider?.disconnect();
        this.ySweetProvider?.destroy();
        this.ySweetProvider = null;
        await (0, loadRoom_1.loadYSweet)(this.db, this, true, true);
        this.addingAwareness = false;
    };
    constructor(options) {
        super();
        this.db = options.db;
        this.name = options.name;
        this.collectionKey = options.collectionKey;
        this.id = options.id || crypto.randomUUID();
        this.tokenExpiry = options.tokenExpiry ?? null;
        this.ySweetUrl = options.ySweetUrl ?? null;
        this.ySweetBaseUrl = options.ySweetBaseUrl ?? null;
        this.publicAccess = options.publicAccess ?? 'private';
        this.readAccess = options.readAccess ?? [];
        this.writeAccess = options.writeAccess ?? [];
        this.adminAccess = options.adminAccess ?? [];
        this.createdAt = options.createdAt ?? new Date().toISOString();
        this.updatedAt = options.updatedAt ?? new Date().toISOString();
        this._deleted = options._deleted ?? false;
        this._ttl = options._ttl ?? null;
        if (options.indexedDbProvider) {
            this.indexedDbProvider = options.indexedDbProvider;
        }
        if (options.webRtcProvider) {
            this.webRtcProvider = options.webRtcProvider;
        }
        if (options.ySweetProvider) {
            this.ySweetProvider = options.ySweetProvider;
        }
        if (options.ydoc) {
            this.ydoc = options.ydoc;
        }
        this.getDocuments = () => (0, getDocuments_1.getDocuments)(this.db)(this);
        this.load = () => this.db.loadRoom(this);
    }
}
exports.Room = Room;
function roomToServerRoom(room) {
    return {
        id: room.id,
        name: room.name,
        collectionKey: room.collectionKey,
        tokenExpiry: room.tokenExpiry,
        ySweetUrl: room.ySweetUrl,
        ySweetBaseUrl: room.ySweetBaseUrl,
        publicAccess: room.publicAccess,
        readAccess: room.readAccess,
        writeAccess: room.writeAccess,
        adminAccess: room.adminAccess,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        _deleted: room._deleted,
        _ttl: room._ttl,
    };
}
//# sourceMappingURL=room.js.map