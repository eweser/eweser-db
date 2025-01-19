"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = void 0;
const localStorageService_1 = require("../../utils/localStorageService");
const getToken = (db) => 
/**
 * Looks for the access grant token first in the DB class, then in local storage, then in the url query params
 */
() => {
    const urlToken = db.getAccessGrantTokenFromUrl();
    if (urlToken) {
        db.accessGrantToken = urlToken;
        return urlToken;
    }
    if (db.accessGrantToken) {
        return db.accessGrantToken;
    }
    const savedToken = (0, localStorageService_1.getLocalAccessGrantToken)(db)();
    if (savedToken) {
        db.accessGrantToken = savedToken;
        return savedToken;
    }
    return null;
};
exports.getToken = getToken;
//# sourceMappingURL=getToken.js.map