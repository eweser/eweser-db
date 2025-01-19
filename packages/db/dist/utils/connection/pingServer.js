"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingServer = void 0;
const pingServer = (db) => async () => {
    const { data, error } = await db.serverFetch('/access-grant/ping');
    if (error) {
        db.error('Error pinging server', error);
        return false;
    }
    else {
        db.debug('Server pinged', data);
        return data?.reply && data.reply === 'pong';
    }
};
exports.pingServer = pingServer;
//# sourceMappingURL=pingServer.js.map