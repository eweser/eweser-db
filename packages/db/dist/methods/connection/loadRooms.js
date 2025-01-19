"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRooms = void 0;
/** in order not to overwhelm the requests for remote server collect, loading the server connections will be staggered with a default 1 second gap */
const loadRooms = (db) => async (rooms, staggerMs = 1000) => {
    const loadedRooms = [];
    db.debug('loading rooms', rooms);
    for (const room of rooms) {
        const loadedRoom = await db.loadRoom(room, { loadRemote: false });
        loadedRooms.push(loadedRoom);
    }
    db.debug('loaded rooms', loadedRooms);
    db.emit('roomsLoaded', loadedRooms);
    const remoteLoadedRooms = [];
    let isFirstRoom = true;
    for (const room of rooms) {
        if (!isFirstRoom) {
            await new Promise((resolve) => setTimeout(resolve, staggerMs));
        }
        else {
            isFirstRoom = false;
        }
        const remoteLoadedRoom = await db.loadRoom(room, { loadRemote: true });
        if (remoteLoadedRoom.ySweetProvider &&
            remoteLoadedRoom.ySweetProvider?.status !== 'error' &&
            remoteLoadedRoom.ySweetProvider?.status !== 'offline') {
            remoteLoadedRooms.push(remoteLoadedRoom);
        }
    }
    db.debug('loaded remotes for rooms', remoteLoadedRooms);
    db.emit('roomsRemotesLoaded', remoteLoadedRooms);
};
exports.loadRooms = loadRooms;
//# sourceMappingURL=loadRooms.js.map