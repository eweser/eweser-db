"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newRoom = void 0;
const room_1 = require("../room");
const localStorageService_1 = require("../utils/localStorageService");
const newRoom = (db) => 
/**
 * new rooms must be added to the registry and then synced with the auth server
 * Note: If your app does not have access privileges to the collection, the room won't be synced server-side.
 */
(options) => {
    const room = new room_1.Room({ db, ...options });
    db.debug('new room', room);
    db.collections[options.collectionKey][room.id] = room;
    const registryRoom = (0, room_1.roomToServerRoom)(room);
    db.registry.push(registryRoom);
    (0, localStorageService_1.setLocalRegistry)(db)(db.registry);
    db.loadRoom(room);
    if (db.online) {
        db.syncRegistry();
    }
    else {
        // const online = checkOnline();
        // if(online){
        //   this.syncRegistry()
        // }
    }
    return room;
};
exports.newRoom = newRoom;
//# sourceMappingURL=newRoom.js.map