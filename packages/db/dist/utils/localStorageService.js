"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLocalAccessGrantToken = exports.getLocalAccessGrantToken = exports.setLocalRegistry = exports.getLocalRegistry = void 0;
var LocalStorageKey;
(function (LocalStorageKey) {
    LocalStorageKey["roomRegistry"] = "room_registry";
    LocalStorageKey["accessGrantToken"] = "access_grant_token";
})(LocalStorageKey || (LocalStorageKey = {}));
const localStorageSet = (key, value) => {
    localStorage.setItem('ewe_' + key, JSON.stringify(value));
};
const localStorageGet = (key) => {
    const value = localStorage.getItem('ewe_' + key);
    if (!value)
        return null;
    return JSON.parse(value);
};
function getLocalRegistry() {
    const registry = localStorageGet(LocalStorageKey.roomRegistry);
    if (typeof registry === 'object' && Array.isArray(registry)) {
        return registry;
    }
    return [];
}
exports.getLocalRegistry = getLocalRegistry;
function setLocalRegistry(registry) {
    localStorageSet(LocalStorageKey.roomRegistry, registry);
}
exports.setLocalRegistry = setLocalRegistry;
function getLocalAccessGrantToken() {
    return localStorageGet(LocalStorageKey.accessGrantToken);
}
exports.getLocalAccessGrantToken = getLocalAccessGrantToken;
function setLocalAccessGrantToken(token) {
    localStorageSet(LocalStorageKey.accessGrantToken, token);
}
exports.setLocalAccessGrantToken = setLocalAccessGrantToken;
//# sourceMappingURL=localStorageService.js.map