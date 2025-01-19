"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRoom = void 0;
exports.loadYSweet = loadYSweet;
const room_1 = require("../../room");
const initializeDoc_1 = require("../../utils/connection/initializeDoc");
const client_1 = require("@y-sweet/client");
const shared_1 = require("@eweser/shared");
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
    return (room, ySweetUrl) => {
        const localLoaded = !!room && !!room.ydoc && !!room.indexedDbProvider;
        const ySweet = room.ySweetProvider;
        const shouldLoadYSweet = room.connectionStatus === 'disconnected' &&
            !!db.getToken() &&
            db.useYSweet &&
            !!room?.ySweetUrl &&
            ySweet?.status !== 'connecting' &&
            ySweet?.status !== 'handshaking';
        const ySweetLoaded = room.connectionStatus === 'connected' &&
            ySweetUrl &&
            ySweet &&
            room.ySweetUrl === ySweetUrl &&
            ySweet.status === 'connected';
        db.info('checkLoadedState', {
            room: room.name,
            localLoaded,
            ySweetLoaded,
            shouldLoadYSweet,
            status: ySweet?.status,
        });
        return { localLoaded, ySweetLoaded, shouldLoadYSweet };
    };
}
async function loadLocal(db, room) {
    const { yDoc: ydoc, localProvider } = await (0, initializeDoc_1.initializeDocAndLocalProvider)(room.id, room.ydoc, db.indexedDBProviderPolyfill);
    room.ydoc = ydoc;
    room.indexedDbProvider = localProvider;
    db.debug('initialized ydoc and localProvider', room.ydoc, room.indexedDbProvider);
}
async function loadYSweet(db, room, withAwareness = true, awaitConnection = false, maxWait = 30000) {
    if (!room.connectAbortController) {
        room.connectAbortController = new AbortController();
    }
    function emitConnectionChange(status) {
        room.connectionStatus = status;
        if (status === 'connected') {
            room.connectionRetries = 0;
        }
        room.emit('roomConnectionChange', status, room);
        db.emit('roomConnectionChange', status, room);
    }
    const handleStatusChange = ({ status }) => {
        if (status === 'connected') {
            room.connectionRetries = 0;
            room.connectAbortController?.abort();
        }
        emitConnectionChange(status);
    };
    function handleSync(synced) {
        emitConnectionChange(synced ? 'connected' : 'disconnected');
        db.debug('ySweetProvider synced', synced);
    }
    async function handleConnectionError(error) {
        db.error('ySweetProvider error', room.name, error);
        emitConnectionChange('disconnected');
        // because this is a change listener, it could be called many times. In order to prevent an infinite loop of retries, we will only allow 3 retries.
        if (room.connectionRetries < 3) {
            await (0, shared_1.wait)(1000);
            room.connectionRetries++;
            checkTokenAndConnectProvider();
        }
    }
    async function pollForYSweetConnectionAndAwait() {
        let waited = 0;
        return new Promise((resolve, reject) => {
            const poll = setInterval(() => {
                if (room.ySweetProvider?.status === 'connected') {
                    clearInterval(poll);
                    resolve();
                }
                else {
                    waited += 1000;
                    if (waited >= maxWait) {
                        console.log('timed out waiting for ySweet connection', room.name, waited, maxWait, room.ySweetProvider);
                        clearInterval(poll);
                        reject(new Error('timed out waiting for ySweet connection ' + room.name));
                    }
                }
            }, 300);
        });
    }
    async function checkTokenAndConnectProvider() {
        if (room.ySweetProvider) {
            console.log('----- provider exsits', room.ySweetProvider?.status, room.name);
            if (awaitConnection) {
                try {
                    await pollForYSweetConnectionAndAwait();
                }
                catch (e) {
                    db.error(e);
                }
                db.emit('roomRemoteLoaded', room);
            }
            return;
        }
        emitConnectionChange('connecting');
        room.ySweetProvider = (0, client_1.createYjsProvider)(room.ydoc, room.id, async () => {
            db.debug('----- createYjsProvider token refresh', room.ySweetProvider?.status, room.name);
            const status = room.ySweetProvider?.status;
            // if have at least 5 minutes left ignore
            if (room.ySweetUrl &&
                room.ySweetBaseUrl &&
                room.tokenExpiry &&
                new Date(room.tokenExpiry) > new Date(Date.now() + 5 * 60 * 1000)) {
                db.debug('returning existing token', room.name);
                return {
                    url: room.ySweetUrl,
                    baseUrl: room.ySweetBaseUrl,
                    docId: room.id,
                };
            }
            if ((status === 'connecting' || status === 'handshaking') &&
                room.ySweetUrl &&
                room.ySweetBaseUrl &&
                room.tokenExpiry) {
                db.debug('already connecting, returning existing token', room.name);
                return {
                    url: room.ySweetUrl,
                    baseUrl: room.ySweetBaseUrl,
                    docId: room.id,
                };
            }
            const refreshed = await db.refreshYSweetToken(room);
            db.debug('refreshed token. success: ', refreshed?.ySweetUrl && refreshed.tokenExpiry, room.name);
            if (refreshed?.ySweetUrl &&
                refreshed.tokenExpiry &&
                refreshed.ySweetBaseUrl) {
                room.tokenExpiry = refreshed.tokenExpiry;
                room.ySweetUrl = refreshed.ySweetUrl;
                room.ySweetBaseUrl = refreshed.ySweetBaseUrl;
                return {
                    url: refreshed.ySweetUrl,
                    baseUrl: refreshed.ySweetBaseUrl,
                    docId: room.id,
                };
            }
            else {
                throw new Error('No ySweetUrl found: ' + room.name);
            }
        }, withAwareness ? { awareness: new awareness_1.Awareness(room.ydoc) } : {});
        // update the room's ydoc with the new provider attached
        // room.ydoc = room.ySweetProvider.doc as YDoc<any>;
        room.ySweetProvider.on('status', handleStatusChange);
        room.ySweetProvider.on('sync', handleSync);
        room.ySweetProvider.on('connection-error', handleConnectionError);
        // room.ySweetProvider.connect();
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
    if (awaitConnection) {
        try {
            await pollForYSweetConnectionAndAwait();
        }
        catch (e) {
            db.error(e);
        }
    }
    db.emit('roomRemoteLoaded', room);
}
const loadRoom = (db) => async (serverRoom, remoteLoadOptions) => {
    const loadRemote = remoteLoadOptions?.loadRemote ?? true;
    const awaitLoadRemote = remoteLoadOptions?.awaitLoadRemote ?? true;
    const loadRemoteMaxWait = remoteLoadOptions?.loadRemoteMaxWait ?? 30000;
    const withAwareness = remoteLoadOptions?.withAwareness ?? false;
    const { roomId, collectionKey } = validate(serverRoom);
    const room = db.collections[collectionKey][roomId] ?? new room_1.Room({ db, ...serverRoom });
    db.info('loading room', { room, serverRoom });
    const { localLoaded, ySweetLoaded, shouldLoadYSweet } = checkLoadedState(db)(room, serverRoom.ySweetUrl);
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
    if (loadRemote && shouldLoadYSweet && !ySweetLoaded) {
        if (awaitLoadRemote) {
            await loadYSweet(db, room, withAwareness, true, loadRemoteMaxWait);
        }
        else {
            loadYSweet(db, room, withAwareness, false);
        }
    }
    // Save the room to the db
    db.collections[collectionKey][roomId] = room;
    db.emit('roomLoaded', room);
    return room;
};
exports.loadRoom = loadRoom;
//# sourceMappingURL=loadRoom.js.map