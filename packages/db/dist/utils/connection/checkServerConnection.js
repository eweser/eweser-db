"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkServerConnection = void 0;
/** pings the matrix server and sets the result to db.online. emits an event on change */
const checkServerConnection = async (db) => {
    const success = await db.pingServer();
    if (success) {
        if (db.online) {
            return;
        }
        db.debug('Server is online');
        db.online = true;
        db.emit('onlineChange', true);
    }
    else {
        if (!db.online) {
            return;
        }
        db.error('Server is offline');
        db.online = false;
        db.emit('onlineChange', false);
    }
};
exports.checkServerConnection = checkServerConnection;
//# sourceMappingURL=checkServerConnection.js.map