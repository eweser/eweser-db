"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearLocalAccessGrantToken = exports.setLocalAccessGrantToken = exports.getLocalAccessGrantToken = exports.clearLocalRegistry = exports.setLocalRegistry = exports.getLocalRegistry = exports.localStorageRemove = exports.localStorageGet = exports.localStorageSet = exports.LocalStorageKey = void 0;
var LocalStorageKey;
(function (LocalStorageKey) {
    LocalStorageKey["roomRegistry"] = "room_registry";
    LocalStorageKey["accessGrantToken"] = "access_grant_token";
})(LocalStorageKey || (exports.LocalStorageKey = LocalStorageKey = {}));
const localStorageSet = (db) => (key, value) => {
    db.debug('#### localStorageSet', key, value);
    db.localStoragePolyfill.setItem('ewe_' + key, JSON.stringify(value));
};
exports.localStorageSet = localStorageSet;
const localStorageGet = (db) => (key) => {
    const value = db.localStoragePolyfill.getItem('ewe_' + key);
    db.debug('localStorageGet', key, value);
    if (!value)
        return null;
    return JSON.parse(value);
};
exports.localStorageGet = localStorageGet;
const localStorageRemove = (db) => (key) => {
    db.localStoragePolyfill.removeItem('ewe_' + key);
};
exports.localStorageRemove = localStorageRemove;
// Helpers
const getLocalRegistry = (db) => () => {
    const registry = db.localStorageService.getItem(LocalStorageKey.roomRegistry);
    if (typeof registry === 'object' && Array.isArray(registry)) {
        return registry;
    }
    return [];
};
exports.getLocalRegistry = getLocalRegistry;
const setLocalRegistry = (db) => (registry) => {
    db.localStorageService.setItem(LocalStorageKey.roomRegistry, registry);
};
exports.setLocalRegistry = setLocalRegistry;
const clearLocalRegistry = (db) => () => {
    db.localStorageService.removeItem(LocalStorageKey.roomRegistry);
};
exports.clearLocalRegistry = clearLocalRegistry;
const getLocalAccessGrantToken = (db) => () => {
    return db.localStorageService.getItem(LocalStorageKey.accessGrantToken);
};
exports.getLocalAccessGrantToken = getLocalAccessGrantToken;
const setLocalAccessGrantToken = (db) => (token) => {
    db.localStorageService.setItem(LocalStorageKey.accessGrantToken, token);
};
exports.setLocalAccessGrantToken = setLocalAccessGrantToken;
const clearLocalAccessGrantToken = (db) => () => {
    db.localStorageService.removeItem(LocalStorageKey.accessGrantToken);
};
exports.clearLocalAccessGrantToken = clearLocalAccessGrantToken;
//# sourceMappingURL=localStorageService.js.map