"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRoom = void 0;
const room_1 = require("../../room");
const shared_1 = require("@eweser/shared");
const initializeDoc_1 = require("../../utils/connection/initializeDoc");
const client_1 = require("@y-sweet/client");
const shared_2 = require("@eweser/shared");
const awareness_1 = require("y-protocols/awareness");
function validate(room) {
    if (!room) {
        throw new Error('room is required');
    }
    const { id: roomId, collectionKey } = room;
    if (!roomId) {
        throw new Error('roomId is required');
    }
    if (!collectionKey) {
        throw new Error('collectionKey is required');
    }
    return { roomId, collectionKey };
}
function checkLoadedState(db) {
    return (room, token) => {
        const localLoaded = !!room && !!room.ydoc && !!room.indexedDbProvider;
        const shouldLoadYSweet = db.useYSweet && token && room?.ySweetUrl;
        const ySweetLoaded = token &&
            room?.ySweetProvider &&
            room.token === token &&
            room.tokenExpiry &&
            !(0, shared_1.isTokenExpired)(room.tokenExpiry);
        return { localLoaded, ySweetLoaded, shouldLoadYSweet };
    };
}
async function loadLocal(db, room) {
    const { yDoc: ydoc, localProvider } = await (0, initializeDoc_1.initializeDocAndLocalProvider)(room.id, room.ydoc, db.indexedDBProviderPolyfill);
    room.ydoc = ydoc;
    room.indexedDbProvider = localProvider;
    db.debug('initialized ydoc and localProvider', room.ydoc, room.indexedDbProvider);
}
async function loadYSweet(db, room, withAwareness = true) {
    function emitConnectionChange(status) {
        if (status === 'connected') {
            room.connectionRetries = 0;
        }
        room.emit('roomConnectionChange', status, room);
        db.emit('roomConnectionChange', status, room);
    }
    const handleStatusChange = ({ status }) => emitConnectionChange(status);
    function handleSync(synced) {
        emitConnectionChange(synced ? 'connected' : 'disconnected');
        db.debug('ySweetProvider synced', synced);
    }
    async function handleConnectionError(error) {
        db.error('ySweetProvider error', error);
        emitConnectionChange('disconnected');
        // because this is a change listener, it could be called many times. In order to prevent an infinite loop of retries, we will only allow 3 retries.
        if (room.connectionRetries < 3) {
            await (0, shared_2.wait)(1000);
            room.connectionRetries++;
            checkTokenAndConnectProvider(withAwareness);
        }
    }
    async function checkTokenAndConnectProvider(withAwareness = true) {
        emitConnectionChange('connecting');
        if (room.tokenExpiry && (0, shared_1.isTokenExpired)(room.tokenExpiry)) {
            const refreshed = await db.refreshYSweetToken(room);
            db.debug('refreshed token. success: ', refreshed?.ySweetUrl && refreshed.tokenExpiry);
            if (refreshed?.ySweetUrl && refreshed.tokenExpiry) {
                // room.token = refreshed.token;
                room.tokenExpiry = refreshed.tokenExpiry;
                room.ySweetUrl = refreshed.ySweetUrl;
            }
        }
        const awareness = new awareness_1.Awareness(room.ydoc);
        room.ySweetProvider = (0, client_1.createYjsProvider)(room.ydoc, {
            url: room.ySweetUrl ?? '',
            token: room.token ?? '',
            docId: room.id,
        }, withAwareness ? { awareness } : {});
        // update the room's ydoc with the new provider attached
        room.ydoc = room.ySweetProvider.doc;
        room.ySweetProvider.on('status', handleStatusChange);
        room.ySweetProvider.on('sync', handleSync);
        room.ySweetProvider.on('connection-error', handleConnectionError);
        room.ySweetProvider.connect();
    }
    await checkTokenAndConnectProvider();
    db.debug('created ySweetProvider', room.ySweetProvider);
    room.disconnect = () => {
        room.ySweetProvider?.off('status', handleStatusChange);
        room.ySweetProvider?.off('sync', handleSync);
        room.ySweetProvider?.off('connection-error', handleConnectionError);
        room.ySweetProvider?.disconnect();
        room.webRtcProvider?.disconnect();
        emitConnectionChange('disconnected');
    };
}
/** first loads the local indexedDB ydoc for the room. if this.useYSweet is true and ySweetTokens are available will also connect to remote. IF a connection error, will  */
const loadRoom = (db) => async (serverRoom) => {
    const { roomId, collectionKey } = validate(serverRoom);
    const room = db.collections[collectionKey][roomId] ?? new room_1.Room({ db, ...serverRoom });
    db.info('loading room', { room, serverRoom });
    const { localLoaded, ySweetLoaded, shouldLoadYSweet } = checkLoadedState(db)(room, serverRoom.token);
    db.debug('loadedState', {
        localLoaded,
        ySweetLoaded,
        shouldLoadYSweet,
    });
    if (localLoaded && (!shouldLoadYSweet || ySweetLoaded)) {
        db.debug('room already loaded', room);
        return room;
    }
    if (!localLoaded) {
        await loadLocal(db, room);
    }
    if (shouldLoadYSweet && !ySweetLoaded) {
        await loadYSweet(db, room);
    }
    // Save the room to the db
    db.collections[collectionKey][roomId] = room;
    db.emit('roomLoaded', room);
    return room;
};
exports.loadRoom = loadRoom;
//# sourceMappingURL=loadRoom.js.map