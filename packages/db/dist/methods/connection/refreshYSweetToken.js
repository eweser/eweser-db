"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshYSweetToken = void 0;
const refreshYSweetToken = (db) => async (room) => {
    const { data: refreshed } = await db.serverFetch(`/access-grant/refresh-y-sweet-token/${room.id}`, undefined, room.connectAbortController);
    return refreshed;
};
exports.refreshYSweetToken = refreshYSweetToken;
//# sourceMappingURL=refreshYSweetToken.js.map