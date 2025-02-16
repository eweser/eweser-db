"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollConnection = void 0;
const checkServerConnection_1 = require("./checkServerConnection");
/** by default polls often (2000ms) trying to check for return of connection after connection loss, and less often (10000ms) checking to make sure connection is still there */
const pollConnection = (db, offlineInterval = 2000, onlineInterval = 10000) => {
    if (db.isPolling) {
        db.info('Already polling connection');
        return;
    }
    db.isPolling = true;
    setInterval(() => {
        if (!db.online) {
            (0, checkServerConnection_1.checkServerConnection)(db);
        }
    }, offlineInterval);
    setInterval(() => {
        if (db.online) {
            (0, checkServerConnection_1.checkServerConnection)(db);
        }
    }, onlineInterval);
};
exports.pollConnection = pollConnection;
//# sourceMappingURL=pollConnection.js.map