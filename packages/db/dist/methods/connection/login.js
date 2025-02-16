"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const pollConnection_1 = require("../../utils/connection/pollConnection");
const login = (db) => 
/**
 * @param loadAllRooms default false. Will load all rooms from the registry and connect to them. Disable this is you have too many rooms and want to load them later individually.
 * @returns true if successful
 */
async (options) => {
    //TODO: better event?
    db.emit('roomConnectionChange', 'connecting', {});
    const token = db.getToken();
    if (!token) {
        throw new Error('No token found');
    }
    const syncResult = await db.syncRegistry();
    if (!syncResult) {
        throw new Error('Failed to sync registry');
    }
    db.useYSweet = true;
    (0, pollConnection_1.pollConnection)(db); // start polling for auth server connection status if db was started in offline mode previously
    if (options?.loadAllRooms) {
        await db.loadRooms(db.registry); // connects the ySweet providers. Could make this more atomic in the future to avoid creating too many connections.
    }
    db.emit('onLoggedInChange', true);
    return true;
};
exports.login = login;
//# sourceMappingURL=login.js.map