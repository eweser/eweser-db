"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const room_1 = require("./room");
const types_1 = require("./types");
const events_1 = require("./events");
const shared_1 = require("@eweser/shared");
const getDocuments_1 = require("./utils/getDocuments");
const serverFetch_1 = require("./utils/connection/serverFetch");
const logout_1 = require("./methods/connection/logout");
const login_1 = require("./methods/connection/login");
const log_1 = require("./methods/log");
const generateLoginUrl_1 = require("./methods/connection/generateLoginUrl");
const getAccessGrantTokenFromUrl_1 = require("./methods/connection/getAccessGrantTokenFromUrl");
const getToken_1 = require("./methods/connection/getToken");
const getRegistry_1 = require("./methods/getRegistry");
const loadRoom_1 = require("./methods/connection/loadRoom");
const refreshYSweetToken_1 = require("./methods/connection/refreshYSweetToken");
const syncRegistry_1 = require("./methods/connection/syncRegistry");
const loadRooms_1 = require("./methods/connection/loadRooms");
const localStorageService_1 = require("./utils/localStorageService");
const generateShareRoomLink_1 = require("./methods/connection/generateShareRoomLink");
const pingServer_1 = require("./utils/connection/pingServer");
const pollConnection_1 = require("./utils/connection/pollConnection");
__exportStar(require("./utils"), exports);
__exportStar(require("./types"), exports);
const defaultRtcPeers = [
    'wss://signaling.yjs.debv',
    'wss://y-webrtc-signaling-eu.herokuapp.com',
    'wss://y-webrtc-signaling-us.herokuapp.com',
];
class Database extends events_1.TypedEventEmitter {
    userId = '';
    /* default to the eweser auth server https://www.eweser.com */
    authServer = 'https://www.eweser.com';
    online = false;
    isPolling = false;
    offlineOnly = false;
    /** set to false before `db.loginWithToken()` so that offline-first mode is the default, and it upgrades to online sync after login with token */
    useYSweet = false;
    useWebRTC = true;
    useIndexedDB = true;
    indexedDBProviderPolyfill;
    collectionKeys = shared_1.collectionKeys;
    collections = types_1.collections;
    registry = [];
    accessGrantToken = '';
    webRtcPeers = defaultRtcPeers;
    // METHODS
    // logger/event emitter
    logLevel = 2;
    log = (0, log_1.log)(this);
    debug = (...message) => this.log(0, ...message);
    info = (...message) => this.log(1, ...message);
    warn = (...message) => this.log(2, ...message);
    error = (...message) => this.log(3, message);
    // CONNECT METHODS
    serverFetch = (0, serverFetch_1.serverFetch)(this);
    generateLoginUrl = (0, generateLoginUrl_1.generateLoginUrl)(this);
    login = (0, login_1.login)(this);
    logout = (0, logout_1.logout)(this);
    logoutAndClear = (0, logout_1.logoutAndClear)(this);
    getAccessGrantTokenFromUrl = (0, getAccessGrantTokenFromUrl_1.getAccessGrantTokenFromUrl)(this);
    getToken = (0, getToken_1.getToken)(this);
    refreshYSweetToken = (0, refreshYSweetToken_1.refreshYSweetToken)(this);
    loadRoom = (0, loadRoom_1.loadRoom)(this);
    loadRooms = (0, loadRooms_1.loadRooms)(this);
    syncRegistry = (0, syncRegistry_1.syncRegistry)(this);
    // util methods
    getRegistry = (0, getRegistry_1.getRegistry)(this);
    localStoragePolyfill;
    localStorageService = {
        setItem: (0, localStorageService_1.localStorageSet)(this),
        getItem: (0, localStorageService_1.localStorageGet)(this),
        removeItem: (0, localStorageService_1.localStorageRemove)(this),
    };
    // collection methods
    getDocuments = (0, getDocuments_1.getDocuments)(this);
    getRoom = (collectionKey, roomId) => {
        return this.collections[collectionKey][roomId];
    };
    getRooms(collectionKey) {
        return Object.values(this.collections[collectionKey]);
    }
    /**
     * new rooms must be added to the registry and then synced with the auth server
     * Note: If your app does not have access privileges to the collection, the room won't be synced server-side.
     */
    newRoom = (options) => {
        const room = new room_1.Room(options);
        this.collections[room.collectionKey][room.id] = room;
        const serverRoom = (0, room_1.roomToServerRoom)(room);
        this.registry.push(serverRoom);
        (0, localStorageService_1.setLocalRegistry)(this)(this.registry);
        if (this.online) {
            this.syncRegistry();
        }
        else {
            // const online = checkOnline();
            // if(online){
            //   this.syncRegistry()
            // }
        }
        return room;
    };
    renameRoom = async (room, newName) => {
        const body = {
            newName,
        };
        const { data, error } = await this.serverFetch(`/access-grant/update-room/${room.id}`, {
            method: 'POST',
            body,
        });
        if (error) {
            this.error('Error renaming room', error);
        }
        else if (data?.name) {
            room.name = data.name;
            this.debug('Room renamed', data);
            const registryEntry = this.registry.find((r) => r.id === room.id);
            if (registryEntry) {
                registryEntry.name = data.name;
                (0, localStorageService_1.setLocalRegistry)(this)(this.registry);
            }
            else {
                this.error('Error renaming room, registry entry not found');
            }
        }
        return data;
    };
    generateShareRoomLink = (0, generateShareRoomLink_1.generateShareRoomLink)(this);
    pingServer = (0, pingServer_1.pingServer)(this);
    // Temp docs. These are used for collaborative editing, or for rich-text editors that require a full yDoc passed to the editor. It is recommended in these cases to use a temporary yDoc only used for the session (if that document is open in both apps), then have debounced updates to the actual (ex. Notes) document, saved in cross platform compatible markdown.
    tempDocs = {};
    constructor(optionsPassed) {
        super();
        const options = optionsPassed || {};
        this.localStoragePolyfill = options.localStoragePolyfill || localStorage;
        if (options.authServer) {
            this.authServer = options.authServer;
        }
        if (options.providers) {
            if (!options.providers.includes('WebRTC')) {
                this.webRtcPeers = [];
                this.useWebRTC = false;
            }
            if (options.providers.includes('YSweet')) {
                this.useYSweet = true;
            }
            if (!options.providers.includes('IndexedDB')) {
                // need to have at least one provider, the local storage provider
                throw new Error('IndexedDB provider is required');
                // this.useIndexedDB = false;
            }
        }
        if (options.providers?.length &&
            options.providers?.length === 1 &&
            options.providers[0] === 'IndexedDB') {
            this.offlineOnly = true;
        }
        else {
            (0, pollConnection_1.pollConnection)(this); // start polling for auth server connection status
            if (options?.webRTCPeers) {
                // note that webRtc is only for tempDocs because they are not secure/encrypted yet so we dont want to sync all our long lived yDocs (rooms) with the webRTC peers.
                this.webRtcPeers = options?.webRTCPeers;
            }
        }
        (0, events_1.setupLogger)(this, options.logLevel);
        this.debug('Database created with options', options);
        this.registry = this.getRegistry() || [];
        if (options.initialRooms) {
            const registryRoomIds = this.registry.map((r) => r.id);
            for (const room of options.initialRooms) {
                if (registryRoomIds.includes(room.id)) {
                    continue;
                }
                this.registry.push(room);
            }
        }
        // For now load all registry rooms on start, but in the future might need to change this to limit how many ySweet connections are created on start.
        this.loadRooms(this.registry);
    }
}
exports.Database = Database;
//# sourceMappingURL=index.js.map