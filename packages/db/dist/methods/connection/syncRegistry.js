"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRegistry = void 0;
const localStorageService_1 = require("../../utils/localStorageService");
const syncRegistry = (db) => 
/** sends the registry to the server to check for additions/subtractions on either side */
async () => {
    const body = {
        token: db.getToken() ?? '',
        rooms: db.registry,
    };
    if (!body.token) {
        return false;
    }
    const { data: syncResult } = await db.serverFetch('/access-grant/sync-registry', { method: 'POST', body });
    db.info('syncResult', syncResult);
    const { rooms, token, userId } = syncResult ?? {};
    if (userId && typeof userId === 'string') {
        db.debug('setting new userId', userId);
        db.userId = userId;
    }
    if (token && typeof token === 'string') {
        db.debug('setting new token', token);
        (0, localStorageService_1.setLocalAccessGrantToken)(db)(token);
        db.accessGrantToken = token;
    }
    else {
        return false;
    }
    if (rooms &&
        typeof rooms === 'object' &&
        Array.isArray(rooms) &&
        rooms.length >= 2) {
        db.debug('setting new rooms', rooms);
        (0, localStorageService_1.setLocalRegistry)(db)(rooms);
        db.registry = rooms;
    }
    else {
        return false;
    }
    return true;
};
exports.syncRegistry = syncRegistry;
//# sourceMappingURL=syncRegistry.js.map