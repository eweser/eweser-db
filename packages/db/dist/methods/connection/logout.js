"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAndClear = exports.logout = void 0;
const localStorageService_1 = require("../../utils/localStorageService");
const logout = (db) => 
/**
 * clears the login token from storage and disconnects all ySweet providers. Still leaves the local indexedDB yDocs.
 */
() => {
    (0, localStorageService_1.clearLocalAccessGrantToken)(db)();
    db.accessGrantToken = '';
    db.useYSweet = false;
    db.online = false;
    for (const room of db.registry) {
        const dbRoom = db.getRoom(room.collectionKey, room.id);
        dbRoom.disconnect();
    }
    db.emit('onLoggedInChange', false);
};
exports.logout = logout;
const logoutAndClear = (db) => 
/**
 * Logs out and also clears all local data from indexedDB and localStorage.
 */
() => {
    db.logout();
    for (const collectionKey of db.collectionKeys) {
        for (const room of db.getRooms(collectionKey)) {
            room.indexedDbProvider?.clearData();
            room.indexedDbProvider?.destroy();
        }
    }
    db.registry = [];
    (0, localStorageService_1.clearLocalRegistry)(db)();
};
exports.logoutAndClear = logoutAndClear;
//# sourceMappingURL=logout.js.map