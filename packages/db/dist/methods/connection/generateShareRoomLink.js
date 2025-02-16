"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShareRoomLink = void 0;
const shared_1 = require("@eweser/shared");
const generateShareRoomLink = (db) => async ({ roomId, invitees, redirectUrl, redirectQueries, expiry, accessType, appName, domain, collections, }) => {
    const body = {
        roomId,
        invitees: invitees || [],
        redirectQueries,
        expiry: expiry || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        accessType,
        ...(0, shared_1.loginOptionsToQueryParams)({
            name: appName,
            domain: domain || window.location.host,
            collections: collections ?? ['all'],
            redirect: redirectUrl || window.location.href.split('?')[0],
        }),
    };
    const { error, data } = await db.serverFetch('/access-grant/create-room-invite', {
        body,
        method: 'POST',
    });
    if (error) {
        db.error('Error creating room invite', error);
        return JSON.stringify(error);
    }
    if (!data?.link) {
        return 'Error creating room invite';
    }
    return data.link;
};
exports.generateShareRoomLink = generateShareRoomLink;
//# sourceMappingURL=generateShareRoomLink.js.map