"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegistry = void 0;
const localStorageService_1 = require("../utils/localStorageService");
const getRegistry = (db) => () => {
    if (db.registry.length > 0) {
        return db.registry;
    }
    else {
        const localRegistry = (0, localStorageService_1.getLocalRegistry)(db)();
        if (localRegistry) {
            db.registry = localRegistry;
        }
        return db.registry;
    }
};
exports.getRegistry = getRegistry;
//# sourceMappingURL=getRegistry.js.map