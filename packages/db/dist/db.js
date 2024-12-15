var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import * as Y from "yjs";
import { Doc as Doc$1 } from "yjs";
var events = { exports: {} };
var R = typeof Reflect === "object" ? Reflect : null;
var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
  return Function.prototype.apply.call(target, receiver, args);
};
var ReflectOwnKeys;
if (R && typeof R.ownKeys === "function") {
  ReflectOwnKeys = R.ownKeys;
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys2(target) {
    return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys2(target) {
    return Object.getOwnPropertyNames(target);
  };
}
function ProcessEmitWarning(warning) {
  if (console && console.warn)
    console.warn(warning);
}
var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
  return value !== value;
};
function EventEmitter() {
  EventEmitter.init.call(this);
}
events.exports = EventEmitter;
events.exports.once = once2;
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.prototype._events = void 0;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = void 0;
var defaultMaxListeners = 10;
function checkListener(listener) {
  if (typeof listener !== "function") {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}
Object.defineProperty(EventEmitter, "defaultMaxListeners", {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
    }
    defaultMaxListeners = arg;
  }
});
EventEmitter.init = function() {
  if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
    this._events = /* @__PURE__ */ Object.create(null);
    this._eventsCount = 0;
  }
  this._maxListeners = this._maxListeners || void 0;
};
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
  }
  this._maxListeners = n;
  return this;
};
function _getMaxListeners(that) {
  if (that._maxListeners === void 0)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}
EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};
EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++)
    args.push(arguments[i]);
  var doError = type === "error";
  var events2 = this._events;
  if (events2 !== void 0)
    doError = doError && events2.error === void 0;
  else if (!doError)
    return false;
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      throw er;
    }
    var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
    err.context = er;
    throw err;
  }
  var handler = events2[type];
  if (handler === void 0)
    return false;
  if (typeof handler === "function") {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners2 = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners2[i], this, args);
  }
  return true;
};
function _addListener(target, type, listener, prepend) {
  var m;
  var events2;
  var existing;
  checkListener(listener);
  events2 = target._events;
  if (events2 === void 0) {
    events2 = target._events = /* @__PURE__ */ Object.create(null);
    target._eventsCount = 0;
  } else {
    if (events2.newListener !== void 0) {
      target.emit(
        "newListener",
        type,
        listener.listener ? listener.listener : listener
      );
      events2 = target._events;
    }
    existing = events2[type];
  }
  if (existing === void 0) {
    existing = events2[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === "function") {
      existing = events2[type] = prepend ? [listener, existing] : [existing, listener];
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      w.name = "MaxListenersExceededWarning";
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }
  return target;
}
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};
EventEmitter.prototype.on = EventEmitter.prototype.addListener;
EventEmitter.prototype.prependListener = function prependListener(type, listener) {
  return _addListener(this, type, listener, true);
};
function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}
function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: void 0, target, type, listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}
EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};
EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
  checkListener(listener);
  this.prependListener(type, _onceWrap(this, type, listener));
  return this;
};
EventEmitter.prototype.removeListener = function removeListener(type, listener) {
  var list, events2, position, i, originalListener;
  checkListener(listener);
  events2 = this._events;
  if (events2 === void 0)
    return this;
  list = events2[type];
  if (list === void 0)
    return this;
  if (list === listener || list.listener === listener) {
    if (--this._eventsCount === 0)
      this._events = /* @__PURE__ */ Object.create(null);
    else {
      delete events2[type];
      if (events2.removeListener)
        this.emit("removeListener", type, list.listener || listener);
    }
  } else if (typeof list !== "function") {
    position = -1;
    for (i = list.length - 1; i >= 0; i--) {
      if (list[i] === listener || list[i].listener === listener) {
        originalListener = list[i].listener;
        position = i;
        break;
      }
    }
    if (position < 0)
      return this;
    if (position === 0)
      list.shift();
    else {
      spliceOne(list, position);
    }
    if (list.length === 1)
      events2[type] = list[0];
    if (events2.removeListener !== void 0)
      this.emit("removeListener", type, originalListener || listener);
  }
  return this;
};
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
  var listeners2, events2, i;
  events2 = this._events;
  if (events2 === void 0)
    return this;
  if (events2.removeListener === void 0) {
    if (arguments.length === 0) {
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
    } else if (events2[type] !== void 0) {
      if (--this._eventsCount === 0)
        this._events = /* @__PURE__ */ Object.create(null);
      else
        delete events2[type];
    }
    return this;
  }
  if (arguments.length === 0) {
    var keys2 = Object.keys(events2);
    var key;
    for (i = 0; i < keys2.length; ++i) {
      key = keys2[i];
      if (key === "removeListener")
        continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners("removeListener");
    this._events = /* @__PURE__ */ Object.create(null);
    this._eventsCount = 0;
    return this;
  }
  listeners2 = events2[type];
  if (typeof listeners2 === "function") {
    this.removeListener(type, listeners2);
  } else if (listeners2 !== void 0) {
    for (i = listeners2.length - 1; i >= 0; i--) {
      this.removeListener(type, listeners2[i]);
    }
  }
  return this;
};
function _listeners(target, type, unwrap) {
  var events2 = target._events;
  if (events2 === void 0)
    return [];
  var evlistener = events2[type];
  if (evlistener === void 0)
    return [];
  if (typeof evlistener === "function")
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];
  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}
EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};
EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};
EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === "function") {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};
EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events2 = this._events;
  if (events2 !== void 0) {
    var evlistener = events2[type];
    if (typeof evlistener === "function") {
      return 1;
    } else if (evlistener !== void 0) {
      return evlistener.length;
    }
  }
  return 0;
}
EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};
function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}
function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}
function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}
function once2(emitter, name) {
  return new Promise(function(resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }
    function resolver() {
      if (typeof emitter.removeListener === "function") {
        emitter.removeListener("error", errorListener);
      }
      resolve([].slice.call(arguments));
    }
    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== "error") {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}
function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === "function") {
    eventTargetAgnosticAddListener(emitter, "error", handler, flags);
  }
}
function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === "function") {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === "function") {
    emitter.addEventListener(name, function wrapListener(arg) {
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}
var eventsExports = events.exports;
class TypedEventEmitter extends eventsExports.EventEmitter {
  on(event, listener) {
    return super.on(event, listener);
  }
  emit(event, ...args) {
    return super.emit(event, ...args);
  }
}
const setupLogger = (db, logLevel) => {
  if (logLevel) {
    db.logLevel = logLevel;
  }
  db.on("log", (level, ...message) => {
    switch (level) {
      case 0:
        return console.info(...message);
      case 1:
        return console.log(...message);
      case 2:
        return console.warn(...message);
      case 3:
        return console.error(...message);
    }
  });
};
const newDocument = (_id, _ref, doc) => {
  const now = (/* @__PURE__ */ new Date()).getTime();
  const base = {
    _created: now,
    _id,
    _ref,
    _updated: now,
    _deleted: false,
    _ttl: void 0
  };
  return { ...base, ...doc };
};
const buildRef = (params2) => {
  Object.entries(params2).forEach(([key, param]) => {
    if (!param)
      throw new Error(`${key} is required`);
    if (typeof param !== "string")
      throw new Error(`${key} must be a string`);
    if (param.includes("|"))
      throw new Error(`${key} cannot include |`);
  });
  const { collectionKey, roomId, documentId, authServer } = params2;
  return `${authServer}|${collectionKey}|${roomId}|${documentId}`;
};
const wait$1 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomString = (length2) => Math.random().toString(36).substring(2, length2 + 2);
function getRoomDocuments(room) {
  if (!room.ydoc)
    throw new Error("room.ydoc not found");
  const registryMap = room.ydoc.getMap("documents");
  return registryMap;
}
const getRoom = (_db) => ({
  collectionKey,
  roomId
}) => {
  const room = _db.collections[collectionKey][roomId];
  if (!room)
    return null;
  return room;
};
const getDocuments = (_db) => (room) => {
  var _a;
  if (!room)
    throw new Error("no room");
  const documents = (_a = room.ydoc) == null ? void 0 : _a.getMap("documents");
  if (!documents)
    throw new Error("no documents");
  return {
    documents,
    get: (id) => {
      return documents.get(id);
    },
    set: (doc) => {
      doc._updated = Date.now();
      return documents.set(doc._id, doc);
    },
    new: (doc, id) => {
      if (id && documents.get(id)) {
        throw new Error("document already exists");
      }
      let documentId = id || randomString(24);
      if (documents.get(documentId)) {
        documentId = randomString(24);
        if (documents.get(documentId)) {
          throw new Error("document already exists");
        }
      }
      const ref = buildRef({
        authServer: _db.authServer,
        collectionKey: room.collectionKey,
        roomId: room.id,
        documentId
      });
      const newDoc = newDocument(documentId, ref, doc);
      documents.set(documentId, newDoc);
      return newDoc;
    },
    delete: (id, timeToLiveMs) => {
      const doc = documents.get(id);
      if (!doc)
        throw new Error("document does not exist");
      const oneMonth = 1e3 * 60 * 60 * 24 * 30;
      doc._deleted = true;
      doc._ttl = timeToLiveMs ?? (/* @__PURE__ */ new Date()).getTime() + oneMonth;
      return documents.set(id, doc);
    },
    getAll: () => {
      return documents.toJSON();
    },
    getAllToArray: () => {
      return Object.values(documents.toJSON());
    },
    getUndeleted: () => {
      const undeleted = {};
      documents.forEach((doc) => {
        if (doc && !doc._deleted) {
          undeleted[doc._id] = doc;
        }
      });
      return undeleted;
    },
    getUndeletedToArray: () => {
      const undeleted = [];
      documents.forEach((doc) => {
        if (doc && !doc._deleted) {
          undeleted.push(doc);
        }
      });
      return undeleted;
    },
    toArray: (docs) => {
      return Object.values(docs);
    },
    onChange: (callback) => {
      documents.observe(callback);
    },
    sortByRecent: (docs) => {
      const sortedArray = Object.entries(docs).sort(
        (a, b) => b[1]._updated - a[1]._updated
      );
      return Object.fromEntries(sortedArray);
    }
  };
};
class Room extends TypedEventEmitter {
  constructor({
    db,
    indexedDbProvider,
    webRtcProvider,
    ySweetProvider,
    ydoc,
    ...serverRoom
  }) {
    super();
    __publicField(this, "db");
    __publicField(this, "id");
    __publicField(this, "name");
    __publicField(this, "collectionKey");
    __publicField(this, "token");
    __publicField(this, "tokenExpiry");
    __publicField(this, "ySweetUrl");
    __publicField(this, "publicAccess");
    __publicField(this, "readAccess");
    __publicField(this, "writeAccess");
    __publicField(this, "adminAccess");
    __publicField(this, "createdAt");
    __publicField(this, "updatedAt");
    __publicField(this, "_deleted");
    __publicField(this, "_ttl");
    __publicField(this, "indexedDbProvider");
    __publicField(this, "webRtcProvider");
    __publicField(this, "ySweetProvider");
    __publicField(this, "ydoc");
    __publicField(this, "connectionRetries", 0);
    __publicField(this, "disconnect", () => {
      var _a, _b;
      (_a = this.ySweetProvider) == null ? void 0 : _a.disconnect();
      (_b = this.webRtcProvider) == null ? void 0 : _b.disconnect();
      this.emit("roomConnectionChange", "disconnected", this);
    });
    __publicField(this, "getDocuments");
    this.db = db;
    this.id = serverRoom.id || crypto.randomUUID();
    this.name = serverRoom.name;
    this.collectionKey = serverRoom.collectionKey;
    this.token = serverRoom.token ?? null;
    this.tokenExpiry = serverRoom.tokenExpiry ?? null;
    this.ySweetUrl = serverRoom.ySweetUrl ?? null;
    this.publicAccess = serverRoom.publicAccess ?? "private";
    this.readAccess = serverRoom.readAccess ?? [];
    this.writeAccess = serverRoom.writeAccess ?? [];
    this.adminAccess = serverRoom.adminAccess ?? [];
    this.createdAt = serverRoom.createdAt ?? null;
    this.updatedAt = serverRoom.updatedAt ?? null;
    this._deleted = serverRoom._deleted ?? false;
    this._ttl = serverRoom._ttl ?? null;
    this.indexedDbProvider = indexedDbProvider;
    this.webRtcProvider = webRtcProvider;
    this.ySweetProvider = ySweetProvider;
    this.ydoc = ydoc;
    this.getDocuments = () => getDocuments(this.db)(this);
  }
}
function roomToServerRoom(room) {
  const {
    indexedDbProvider: _unused_1,
    webRtcProvider: _unused_2,
    ySweetProvider: _unused_3,
    ydoc: _unused_4,
    ...serverRoom
  } = room;
  return serverRoom;
}
const collections = {
  notes: {},
  flashcards: {},
  profiles: {}
};
const COLLECTION_KEYS = ["notes", "flashcards", "profiles"];
const collectionKeys = COLLECTION_KEYS.map((key) => key);
function loginOptionsToQueryParams({ collections: collections2, ...rest }) {
  const _collections = collections2.length === 0 ? "all" : collections2.length === 1 ? collections2[0] : collections2.join("|");
  const params2 = {
    collections: _collections,
    ...rest
  };
  return params2;
}
const isTokenExpired = (tokenExpiry, bufferMinutes = 2) => {
  const expiry = new Date(tokenExpiry).getTime();
  const now = (/* @__PURE__ */ new Date()).getTime() + bufferMinutes * 60 * 1e3;
  return expiry < now;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const serverFetch = (_db) => async (path, _options) => {
  const options = {
    ..._options
  };
  try {
    const token = _db.getToken();
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`
      };
    }
    if (options.method === "POST" && options.body) {
      options.body = JSON.stringify(options.body);
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json"
      };
      options.referrer = "no-referrer";
    }
    const resultRaw = await fetch(`${_db.authServer}${path}`, options);
    const data = await resultRaw.json();
    if (!data || typeof data !== "object") {
      throw new Error("No data returned");
    }
    if ("error" in data) {
      return { error: data.error, data: null };
    }
    return { error: null, data };
  } catch (error) {
    _db.error("serverFetch error", path, options, error);
    return { error, data: null };
  }
};
const localStorageSet = (db) => (key, value) => {
  db.debug("#### localStorageSet", key, value);
  db.localStoragePolyfill.setItem("ewe_" + key, JSON.stringify(value));
};
const localStorageGet = (db) => (key) => {
  const value = db.localStoragePolyfill.getItem("ewe_" + key);
  db.debug("localStorageGet", key, value);
  if (!value)
    return null;
  return JSON.parse(value);
};
const localStorageRemove = (db) => (key) => {
  db.localStoragePolyfill.removeItem("ewe_" + key);
};
const getLocalRegistry = (db) => () => {
  const registry = db.localStorageService.getItem(
    "room_registry"
    /* roomRegistry */
  );
  if (typeof registry === "object" && Array.isArray(registry)) {
    return registry;
  }
  return [];
};
const setLocalRegistry = (db) => (registry) => {
  db.localStorageService.setItem("room_registry", registry);
};
const clearLocalRegistry = (db) => () => {
  db.localStorageService.removeItem(
    "room_registry"
    /* roomRegistry */
  );
};
const getLocalAccessGrantToken = (db) => () => {
  return db.localStorageService.getItem(
    "access_grant_token"
    /* accessGrantToken */
  );
};
const setLocalAccessGrantToken = (db) => (token) => {
  db.localStorageService.setItem("access_grant_token", token);
};
const clearLocalAccessGrantToken = (db) => () => {
  db.localStorageService.removeItem(
    "access_grant_token"
    /* accessGrantToken */
  );
};
const logout = (db) => (
  /**
   * clears the login token from storage and disconnects all ySweet providers. Still leaves the local indexedDB yDocs.
   */
  () => {
    clearLocalAccessGrantToken(db)();
    db.accessGrantToken = "";
    db.useYSweet = false;
    db.online = false;
    for (const room of db.registry) {
      const dbRoom = db.getRoom(room.collectionKey, room.id);
      dbRoom.disconnect();
    }
    db.emit("onLoggedInChange", false);
  }
);
const logoutAndClear = (db) => (
  /**
   * Logs out and also clears all local data from indexedDB and localStorage.
   */
  () => {
    var _a, _b;
    db.logout();
    for (const collectionKey of db.collectionKeys) {
      for (const room of db.getRooms(collectionKey)) {
        (_a = room.indexedDbProvider) == null ? void 0 : _a.clearData();
        (_b = room.indexedDbProvider) == null ? void 0 : _b.destroy();
      }
    }
    db.registry = [];
    clearLocalRegistry(db)();
  }
);
const checkServerConnection = async (db) => {
  const success = await db.pingServer();
  if (success) {
    if (db.online) {
      return;
    }
    db.debug("Server is online");
    db.online = true;
    db.emit("onlineChange", true);
  } else {
    if (!db.online) {
      return;
    }
    db.error("Server is offline");
    db.online = false;
    db.emit("onlineChange", false);
  }
};
const pollConnection = (db, offlineInterval = 2e3, onlineInterval = 1e4) => {
  if (db.isPolling) {
    db.info("Already polling connection");
    return;
  }
  db.isPolling = true;
  setInterval(() => {
    if (!db.online) {
      checkServerConnection(db);
    }
  }, offlineInterval);
  setInterval(() => {
    if (db.online) {
      checkServerConnection(db);
    }
  }, onlineInterval);
};
const login = (db) => (
  /**
   * @param loadAllRooms default false. Will load all rooms from the registry and connect to them. Disable this is you have too many rooms and want to load them later individually.
   * @returns true if successful
   */
  async (options) => {
    db.emit("roomConnectionChange", "connecting", {});
    const token = db.getToken();
    if (!token) {
      throw new Error("No token found");
    }
    const syncResult = await db.syncRegistry();
    if (!syncResult) {
      throw new Error("Failed to sync registry");
    }
    db.useYSweet = true;
    pollConnection(db);
    if (options == null ? void 0 : options.loadAllRooms) {
      await db.loadRooms(db.registry);
    }
    db.emit("onLoggedInChange", true);
    return true;
  }
);
const log = (db) => (level, ...message) => {
  if (level <= db.logLevel) {
    db.emit("log", level, ...message);
  }
};
const generateLoginUrl = (db) => (
  /**
   *
   * @param redirect default uses window.location
   * @param appDomain default uses window.location.hostname
   * @param collections default 'all', which collections your app would like to have write access to
   * @returns a string you can use to redirect the user to the auth server's login page
   */
  (options) => {
    const url = new URL(db.authServer);
    const params2 = loginOptionsToQueryParams({
      redirect: (options == null ? void 0 : options.redirect) || window.location.href.split("?")[0],
      domain: (options == null ? void 0 : options.domain) || window.location.host,
      collections: (options == null ? void 0 : options.collections) ?? ["all"],
      name: options.name
    });
    Object.entries(params2).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }
);
const getAccessGrantTokenFromUrl = (db) => (
  /**
   * Pulls the access grant token from the url query params, clears the url query params, and saves the token to local storage
   */
  () => {
    var _a, _b;
    const query = new URLSearchParams(((_a = window == null ? void 0 : window.location) == null ? void 0 : _a.search) ?? "");
    const token = query.get("token");
    if (token && typeof token === "string") {
      setLocalAccessGrantToken(db)(token);
    }
    if ((_b = window == null ? void 0 : window.location) == null ? void 0 : _b.search) {
      const url = new URL(window.location.href);
      for (const key of url.searchParams.keys()) {
        url.searchParams.delete(key);
      }
      window.history.replaceState({}, "", url.toString());
    }
    return token;
  }
);
const getToken = (db) => (
  /**
   * Looks for the access grant token first in the DB class, then in local storage, then in the url query params
   */
  () => {
    if (db.accessGrantToken) {
      return db.accessGrantToken;
    }
    const savedToken = getLocalAccessGrantToken(db)();
    if (savedToken) {
      db.accessGrantToken = savedToken;
      return savedToken;
    }
    const urlToken = db.getAccessGrantTokenFromUrl();
    if (urlToken) {
      db.accessGrantToken = urlToken;
      return urlToken;
    }
    return null;
  }
);
const getRegistry = (db) => () => {
  if (db.registry.length > 0) {
    return db.registry;
  } else {
    const localRegistry = getLocalRegistry(db)();
    if (localRegistry) {
      db.registry = localRegistry;
    }
    return db.registry;
  }
};
const floor$1 = Math.floor;
const min$1 = (a, b) => a < b ? a : b;
const max$1 = (a, b) => a > b ? a : b;
const getUnixTime$1 = Date.now;
const create$4 = (f) => (
  /** @type {Promise<T>} */
  new Promise(f)
);
Promise.all.bind(Promise);
const create$3 = (s) => new Error(s);
const rtop = (request) => create$4((resolve, reject) => {
  request.onerror = (event) => reject(new Error(event.target.error));
  request.onsuccess = (event) => resolve(event.target.result);
});
const openDB = (name, initDB) => create$4((resolve, reject) => {
  const request = indexedDB.open(name);
  request.onupgradeneeded = (event) => initDB(event.target.result);
  request.onerror = (event) => reject(create$3(event.target.error));
  request.onsuccess = (event) => {
    const db = event.target.result;
    db.onversionchange = () => {
      db.close();
    };
    resolve(db);
  };
});
const deleteDB = (name) => rtop(indexedDB.deleteDatabase(name));
const createStores = (db, definitions) => definitions.forEach(
  (d) => (
    // @ts-ignore
    db.createObjectStore.apply(db, d)
  )
);
const transact = (db, stores, access = "readwrite") => {
  const transaction = db.transaction(stores, access);
  return stores.map((store) => getStore(transaction, store));
};
const count = (store, range) => rtop(store.count(range));
const get = (store, key) => rtop(store.get(key));
const del = (store, key) => rtop(store.delete(key));
const put = (store, item, key) => rtop(store.put(item, key));
const addAutoKey = (store, item) => rtop(store.add(item));
const getAll = (store, range, limit) => rtop(store.getAll(range, limit));
const queryFirst = (store, query, direction) => {
  let first = null;
  return iterateKeys(store, query, (key) => {
    first = key;
    return false;
  }, direction).then(() => first);
};
const getLastKey = (store, range = null) => queryFirst(store, range, "prev");
const iterateOnRequest = (request, f) => create$4((resolve, reject) => {
  request.onerror = reject;
  request.onsuccess = async (event) => {
    const cursor = event.target.result;
    if (cursor === null || await f(cursor) === false) {
      return resolve();
    }
    cursor.continue();
  };
});
const iterateKeys = (store, keyrange, f, direction = "next") => iterateOnRequest(store.openKeyCursor(keyrange, direction), (cursor) => f(cursor.key));
const getStore = (t, store) => t.objectStore(store);
const createIDBKeyRangeUpperBound = (upper, upperOpen) => IDBKeyRange.upperBound(upper, upperOpen);
const createIDBKeyRangeLowerBound = (lower, lowerOpen) => IDBKeyRange.lowerBound(lower, lowerOpen);
const create$2 = () => /* @__PURE__ */ new Map();
const setIfUndefined$1 = (map2, key, createT) => {
  let set = map2.get(key);
  if (set === void 0) {
    map2.set(key, set = createT());
  }
  return set;
};
const create$1 = () => /* @__PURE__ */ new Set();
const from$1 = Array.from;
let Observable$1 = class Observable {
  constructor() {
    this._observers = create$2();
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  on(name, f) {
    setIfUndefined$1(this._observers, name, create$1).add(f);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  once(name, f) {
    const _f = (...args) => {
      this.off(name, _f);
      f(...args);
    };
    this.on(name, _f);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  off(name, f) {
    const observers = this._observers.get(name);
    if (observers !== void 0) {
      observers.delete(f);
      if (observers.size === 0) {
        this._observers.delete(name);
      }
    }
  }
  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @param {N} name The event name.
   * @param {Array<any>} args The arguments that are applied to the event listener.
   */
  emit(name, args) {
    return from$1((this._observers.get(name) || create$2()).values()).forEach((f) => f(...args));
  }
  destroy() {
    this._observers = create$2();
  }
};
const customStoreName = "custom";
const updatesStoreName = "updates";
const PREFERRED_TRIM_SIZE = 500;
const fetchUpdates = (idbPersistence, beforeApplyUpdatesCallback = () => {
}, afterApplyUpdatesCallback = () => {
}) => {
  const [updatesStore] = transact(
    /** @type {IDBDatabase} */
    idbPersistence.db,
    [updatesStoreName]
  );
  return getAll(updatesStore, createIDBKeyRangeLowerBound(idbPersistence._dbref, false)).then((updates) => {
    if (!idbPersistence._destroyed) {
      beforeApplyUpdatesCallback(updatesStore);
      Y.transact(idbPersistence.doc, () => {
        updates.forEach((val) => Y.applyUpdate(idbPersistence.doc, val));
      }, idbPersistence, false);
      afterApplyUpdatesCallback(updatesStore);
    }
  }).then(() => getLastKey(updatesStore).then((lastKey) => {
    idbPersistence._dbref = lastKey + 1;
  })).then(() => count(updatesStore).then((cnt) => {
    idbPersistence._dbsize = cnt;
  })).then(() => updatesStore);
};
const storeState = (idbPersistence, forceStore = true) => fetchUpdates(idbPersistence).then((updatesStore) => {
  if (forceStore || idbPersistence._dbsize >= PREFERRED_TRIM_SIZE) {
    addAutoKey(updatesStore, Y.encodeStateAsUpdate(idbPersistence.doc)).then(() => del(updatesStore, createIDBKeyRangeUpperBound(idbPersistence._dbref, true))).then(() => count(updatesStore).then((cnt) => {
      idbPersistence._dbsize = cnt;
    }));
  }
});
class IndexeddbPersistence extends Observable$1 {
  /**
   * @param {string} name
   * @param {Y.Doc} doc
   */
  constructor(name, doc) {
    super();
    this.doc = doc;
    this.name = name;
    this._dbref = 0;
    this._dbsize = 0;
    this._destroyed = false;
    this.db = null;
    this.synced = false;
    this._db = openDB(
      name,
      (db) => createStores(db, [
        ["updates", { autoIncrement: true }],
        ["custom"]
      ])
    );
    this.whenSynced = create$4((resolve) => this.on("synced", () => resolve(this)));
    this._db.then((db) => {
      this.db = db;
      const beforeApplyUpdatesCallback = (updatesStore) => addAutoKey(updatesStore, Y.encodeStateAsUpdate(doc));
      const afterApplyUpdatesCallback = () => {
        if (this._destroyed)
          return this;
        this.synced = true;
        this.emit("synced", [this]);
      };
      fetchUpdates(this, beforeApplyUpdatesCallback, afterApplyUpdatesCallback);
    });
    this._storeTimeout = 1e3;
    this._storeTimeoutId = null;
    this._storeUpdate = (update, origin) => {
      if (this.db && origin !== this) {
        const [updatesStore] = transact(
          /** @type {IDBDatabase} */
          this.db,
          [updatesStoreName]
        );
        addAutoKey(updatesStore, update);
        if (++this._dbsize >= PREFERRED_TRIM_SIZE) {
          if (this._storeTimeoutId !== null) {
            clearTimeout(this._storeTimeoutId);
          }
          this._storeTimeoutId = setTimeout(() => {
            storeState(this, false);
            this._storeTimeoutId = null;
          }, this._storeTimeout);
        }
      }
    };
    doc.on("update", this._storeUpdate);
    this.destroy = this.destroy.bind(this);
    doc.on("destroy", this.destroy);
  }
  destroy() {
    if (this._storeTimeoutId) {
      clearTimeout(this._storeTimeoutId);
    }
    this.doc.off("update", this._storeUpdate);
    this.doc.off("destroy", this.destroy);
    this._destroyed = true;
    return this._db.then((db) => {
      db.close();
    });
  }
  /**
   * Destroys this instance and removes all data from indexeddb.
   *
   * @return {Promise<void>}
   */
  clearData() {
    return this.destroy().then(() => {
      deleteDB(this.name);
    });
  }
  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @return {Promise<String | number | ArrayBuffer | Date | any>}
   */
  get(key) {
    return this._db.then((db) => {
      const [custom] = transact(db, [customStoreName], "readonly");
      return get(custom, key);
    });
  }
  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @param {String | number | ArrayBuffer | Date} value
   * @return {Promise<String | number | ArrayBuffer | Date>}
   */
  set(key, value) {
    return this._db.then((db) => {
      const [custom] = transact(db, [customStoreName]);
      return put(custom, value, key);
    });
  }
  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @return {Promise<undefined>}
   */
  del(key) {
    return this._db.then((db) => {
      const [custom] = transact(db, [customStoreName]);
      return del(custom, key);
    });
  }
}
const Doc = Doc$1;
const initializeDocAndLocalProvider = async (roomId, existingDoc, provider) => {
  const yDoc = existingDoc || new Doc();
  if (!yDoc)
    throw new Error("could not create doc");
  const localProvider = provider ? provider(roomId, yDoc) : new IndexeddbPersistence(roomId, yDoc);
  if (localProvider.synced)
    return { yDoc, localProvider };
  const synced = await localProvider.whenSynced;
  if (synced.synced)
    return { yDoc, localProvider };
  else
    throw new Error("could not sync doc");
};
const BIT8$1 = 128;
const BITS7$1 = 127;
const MAX_SAFE_INTEGER$1 = Number.MAX_SAFE_INTEGER;
const _encodeUtf8Polyfill$1 = (str) => {
  const encodedString = unescape(encodeURIComponent(str));
  const len = encodedString.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = /** @type {number} */
    encodedString.codePointAt(i);
  }
  return buf;
};
const utf8TextEncoder$1 = (
  /** @type {TextEncoder} */
  typeof TextEncoder !== "undefined" ? new TextEncoder() : null
);
const _encodeUtf8Native$1 = (str) => utf8TextEncoder$1.encode(str);
const encodeUtf8$1 = utf8TextEncoder$1 ? _encodeUtf8Native$1 : _encodeUtf8Polyfill$1;
let utf8TextDecoder$1 = typeof TextDecoder === "undefined" ? null : new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
if (utf8TextDecoder$1 && utf8TextDecoder$1.decode(new Uint8Array()).length === 1) {
  utf8TextDecoder$1 = null;
}
let Encoder$1 = class Encoder {
  constructor() {
    this.cpos = 0;
    this.cbuf = new Uint8Array(100);
    this.bufs = [];
  }
};
const createEncoder$1 = () => new Encoder$1();
const length$2 = (encoder) => {
  let len = encoder.cpos;
  for (let i = 0; i < encoder.bufs.length; i++) {
    len += encoder.bufs[i].length;
  }
  return len;
};
const toUint8Array$1 = (encoder) => {
  const uint8arr = new Uint8Array(length$2(encoder));
  let curPos = 0;
  for (let i = 0; i < encoder.bufs.length; i++) {
    const d = encoder.bufs[i];
    uint8arr.set(d, curPos);
    curPos += d.length;
  }
  uint8arr.set(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos), curPos);
  return uint8arr;
};
const write$1 = (encoder, num) => {
  const bufferLen = encoder.cbuf.length;
  if (encoder.cpos === bufferLen) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(bufferLen * 2);
    encoder.cpos = 0;
  }
  encoder.cbuf[encoder.cpos++] = num;
};
const writeVarUint$1 = (encoder, num) => {
  while (num > BITS7$1) {
    write$1(encoder, BIT8$1 | BITS7$1 & num);
    num = floor$1(num / 128);
  }
  write$1(encoder, BITS7$1 & num);
};
const _strBuffer$1 = new Uint8Array(3e4);
const _maxStrBSize$1 = _strBuffer$1.length / 3;
const _writeVarStringNative$1 = (encoder, str) => {
  if (str.length < _maxStrBSize$1) {
    const written = utf8TextEncoder$1.encodeInto(str, _strBuffer$1).written || 0;
    writeVarUint$1(encoder, written);
    for (let i = 0; i < written; i++) {
      write$1(encoder, _strBuffer$1[i]);
    }
  } else {
    writeVarUint8Array$1(encoder, encodeUtf8$1(str));
  }
};
const _writeVarStringPolyfill$1 = (encoder, str) => {
  const encodedString = unescape(encodeURIComponent(str));
  const len = encodedString.length;
  writeVarUint$1(encoder, len);
  for (let i = 0; i < len; i++) {
    write$1(
      encoder,
      /** @type {number} */
      encodedString.codePointAt(i)
    );
  }
};
const writeVarString = utf8TextEncoder$1 && /** @type {any} */
utf8TextEncoder$1.encodeInto ? _writeVarStringNative$1 : _writeVarStringPolyfill$1;
const writeUint8Array$1 = (encoder, uint8Array) => {
  const bufferLen = encoder.cbuf.length;
  const cpos = encoder.cpos;
  const leftCopyLen = min$1(bufferLen - cpos, uint8Array.length);
  const rightCopyLen = uint8Array.length - leftCopyLen;
  encoder.cbuf.set(uint8Array.subarray(0, leftCopyLen), cpos);
  encoder.cpos += leftCopyLen;
  if (rightCopyLen > 0) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(max$1(bufferLen * 2, rightCopyLen));
    encoder.cbuf.set(uint8Array.subarray(leftCopyLen));
    encoder.cpos = rightCopyLen;
  }
};
const writeVarUint8Array$1 = (encoder, uint8Array) => {
  writeVarUint$1(encoder, uint8Array.byteLength);
  writeUint8Array$1(encoder, uint8Array);
};
const errorUnexpectedEndOfArray$1 = create$3("Unexpected end of array");
const errorIntegerOutOfRange$1 = create$3("Integer out of Range");
let Decoder$1 = class Decoder {
  /**
   * @param {Uint8Array} uint8Array Binary data to decode
   */
  constructor(uint8Array) {
    this.arr = uint8Array;
    this.pos = 0;
  }
};
const createDecoder$1 = (uint8Array) => new Decoder$1(uint8Array);
const readUint8Array$1 = (decoder, len) => {
  const view = new Uint8Array(decoder.arr.buffer, decoder.pos + decoder.arr.byteOffset, len);
  decoder.pos += len;
  return view;
};
const readVarUint8Array$1 = (decoder) => readUint8Array$1(decoder, readVarUint$1(decoder));
const readUint8 = (decoder) => decoder.arr[decoder.pos++];
const readVarUint$1 = (decoder) => {
  let num = 0;
  let mult = 1;
  const len = decoder.arr.length;
  while (decoder.pos < len) {
    const r = decoder.arr[decoder.pos++];
    num = num + (r & BITS7$1) * mult;
    mult *= 128;
    if (r < BIT8$1) {
      return num;
    }
    if (num > MAX_SAFE_INTEGER$1) {
      throw errorIntegerOutOfRange$1;
    }
  }
  throw errorUnexpectedEndOfArray$1;
};
const _readVarStringPolyfill = (decoder) => {
  let remainingLen = readVarUint$1(decoder);
  if (remainingLen === 0) {
    return "";
  } else {
    let encodedString = String.fromCodePoint(readUint8(decoder));
    if (--remainingLen < 100) {
      while (remainingLen--) {
        encodedString += String.fromCodePoint(readUint8(decoder));
      }
    } else {
      while (remainingLen > 0) {
        const nextLen = remainingLen < 1e4 ? remainingLen : 1e4;
        const bytes = decoder.arr.subarray(decoder.pos, decoder.pos + nextLen);
        decoder.pos += nextLen;
        encodedString += String.fromCodePoint.apply(
          null,
          /** @type {any} */
          bytes
        );
        remainingLen -= nextLen;
      }
    }
    return decodeURIComponent(escape(encodedString));
  }
};
const _readVarStringNative = (decoder) => (
  /** @type any */
  utf8TextDecoder$1.decode(readVarUint8Array$1(decoder))
);
const readVarString = utf8TextDecoder$1 ? _readVarStringNative : _readVarStringPolyfill;
const messageYjsSyncStep1 = 0;
const messageYjsSyncStep2 = 1;
const messageYjsUpdate = 2;
const writeSyncStep1 = (encoder, doc) => {
  writeVarUint$1(encoder, messageYjsSyncStep1);
  const sv = Y.encodeStateVector(doc);
  writeVarUint8Array$1(encoder, sv);
};
const writeSyncStep2 = (encoder, doc, encodedStateVector) => {
  writeVarUint$1(encoder, messageYjsSyncStep2);
  writeVarUint8Array$1(encoder, Y.encodeStateAsUpdate(doc, encodedStateVector));
};
const readSyncStep1 = (decoder, encoder, doc) => writeSyncStep2(encoder, doc, readVarUint8Array$1(decoder));
const readSyncStep2 = (decoder, doc, transactionOrigin) => {
  try {
    Y.applyUpdate(doc, readVarUint8Array$1(decoder), transactionOrigin);
  } catch (error) {
    console.error("Caught error while handling a Yjs update", error);
  }
};
const writeUpdate = (encoder, update) => {
  writeVarUint$1(encoder, messageYjsUpdate);
  writeVarUint8Array$1(encoder, update);
};
const readUpdate = readSyncStep2;
const readSyncMessage = (decoder, encoder, doc, transactionOrigin) => {
  const messageType = readVarUint$1(decoder);
  switch (messageType) {
    case messageYjsSyncStep1:
      readSyncStep1(decoder, encoder, doc);
      break;
    case messageYjsSyncStep2:
      readSyncStep2(decoder, doc, transactionOrigin);
      break;
    case messageYjsUpdate:
      readUpdate(decoder, doc, transactionOrigin);
      break;
    default:
      throw new Error("Unknown message type");
  }
  return messageType;
};
const messagePermissionDenied = 0;
const readAuthMessage = (decoder, y, permissionDeniedHandler2) => {
  switch (readVarUint$1(decoder)) {
    case messagePermissionDenied:
      permissionDeniedHandler2(y, readVarString(decoder));
  }
};
const keys = Object.keys;
const length$1 = (obj) => keys(obj).length;
const hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const equalityStrict = (a, b) => a === b;
const equalityDeep = (a, b) => {
  if (a == null || b == null) {
    return equalityStrict(a, b);
  }
  if (a.constructor !== b.constructor) {
    return false;
  }
  if (a === b) {
    return true;
  }
  switch (a.constructor) {
    case ArrayBuffer:
      a = new Uint8Array(a);
      b = new Uint8Array(b);
    case Uint8Array: {
      if (a.byteLength !== b.byteLength) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      break;
    }
    case Set: {
      if (a.size !== b.size) {
        return false;
      }
      for (const value of a) {
        if (!b.has(value)) {
          return false;
        }
      }
      break;
    }
    case Map: {
      if (a.size !== b.size) {
        return false;
      }
      for (const key of a.keys()) {
        if (!b.has(key) || !equalityDeep(a.get(key), b.get(key))) {
          return false;
        }
      }
      break;
    }
    case Object:
      if (length$1(a) !== length$1(b)) {
        return false;
      }
      for (const key in a) {
        if (!hasProperty(a, key) || !equalityDeep(a[key], b[key])) {
          return false;
        }
      }
      break;
    case Array:
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!equalityDeep(a[i], b[i])) {
          return false;
        }
      }
      break;
    default:
      return false;
  }
  return true;
};
const outdatedTimeout = 3e4;
class Awareness extends Observable$1 {
  /**
   * @param {Y.Doc} doc
   */
  constructor(doc) {
    super();
    this.doc = doc;
    this.clientID = doc.clientID;
    this.states = /* @__PURE__ */ new Map();
    this.meta = /* @__PURE__ */ new Map();
    this._checkInterval = /** @type {any} */
    setInterval(() => {
      const now = getUnixTime$1();
      if (this.getLocalState() !== null && outdatedTimeout / 2 <= now - /** @type {{lastUpdated:number}} */
      this.meta.get(this.clientID).lastUpdated) {
        this.setLocalState(this.getLocalState());
      }
      const remove = [];
      this.meta.forEach((meta, clientid) => {
        if (clientid !== this.clientID && outdatedTimeout <= now - meta.lastUpdated && this.states.has(clientid)) {
          remove.push(clientid);
        }
      });
      if (remove.length > 0) {
        removeAwarenessStates(this, remove, "timeout");
      }
    }, floor$1(outdatedTimeout / 10));
    doc.on("destroy", () => {
      this.destroy();
    });
    this.setLocalState({});
  }
  destroy() {
    this.emit("destroy", [this]);
    this.setLocalState(null);
    super.destroy();
    clearInterval(this._checkInterval);
  }
  /**
   * @return {Object<string,any>|null}
   */
  getLocalState() {
    return this.states.get(this.clientID) || null;
  }
  /**
   * @param {Object<string,any>|null} state
   */
  setLocalState(state) {
    const clientID = this.clientID;
    const currLocalMeta = this.meta.get(clientID);
    const clock = currLocalMeta === void 0 ? 0 : currLocalMeta.clock + 1;
    const prevState = this.states.get(clientID);
    if (state === null) {
      this.states.delete(clientID);
    } else {
      this.states.set(clientID, state);
    }
    this.meta.set(clientID, {
      clock,
      lastUpdated: getUnixTime$1()
    });
    const added = [];
    const updated = [];
    const filteredUpdated = [];
    const removed = [];
    if (state === null) {
      removed.push(clientID);
    } else if (prevState == null) {
      if (state != null) {
        added.push(clientID);
      }
    } else {
      updated.push(clientID);
      if (!equalityDeep(prevState, state)) {
        filteredUpdated.push(clientID);
      }
    }
    if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
      this.emit("change", [{ added, updated: filteredUpdated, removed }, "local"]);
    }
    this.emit("update", [{ added, updated, removed }, "local"]);
  }
  /**
   * @param {string} field
   * @param {any} value
   */
  setLocalStateField(field, value) {
    const state = this.getLocalState();
    if (state !== null) {
      this.setLocalState({
        ...state,
        [field]: value
      });
    }
  }
  /**
   * @return {Map<number,Object<string,any>>}
   */
  getStates() {
    return this.states;
  }
}
const removeAwarenessStates = (awareness, clients, origin) => {
  const removed = [];
  for (let i = 0; i < clients.length; i++) {
    const clientID = clients[i];
    if (awareness.states.has(clientID)) {
      awareness.states.delete(clientID);
      if (clientID === awareness.clientID) {
        const curMeta = (
          /** @type {MetaClientState} */
          awareness.meta.get(clientID)
        );
        awareness.meta.set(clientID, {
          clock: curMeta.clock + 1,
          lastUpdated: getUnixTime$1()
        });
      }
      removed.push(clientID);
    }
  }
  if (removed.length > 0) {
    awareness.emit("change", [{ added: [], updated: [], removed }, origin]);
    awareness.emit("update", [{ added: [], updated: [], removed }, origin]);
  }
};
const encodeAwarenessUpdate = (awareness, clients, states = awareness.states) => {
  const len = clients.length;
  const encoder = createEncoder$1();
  writeVarUint$1(encoder, len);
  for (let i = 0; i < len; i++) {
    const clientID = clients[i];
    const state = states.get(clientID) || null;
    const clock = (
      /** @type {MetaClientState} */
      awareness.meta.get(clientID).clock
    );
    writeVarUint$1(encoder, clientID);
    writeVarUint$1(encoder, clock);
    writeVarString(encoder, JSON.stringify(state));
  }
  return toUint8Array$1(encoder);
};
const applyAwarenessUpdate = (awareness, update, origin) => {
  const decoder = createDecoder$1(update);
  const timestamp = getUnixTime$1();
  const added = [];
  const updated = [];
  const filteredUpdated = [];
  const removed = [];
  const len = readVarUint$1(decoder);
  for (let i = 0; i < len; i++) {
    const clientID = readVarUint$1(decoder);
    let clock = readVarUint$1(decoder);
    const state = JSON.parse(readVarString(decoder));
    const clientMeta = awareness.meta.get(clientID);
    const prevState = awareness.states.get(clientID);
    const currClock = clientMeta === void 0 ? 0 : clientMeta.clock;
    if (currClock < clock || currClock === clock && state === null && awareness.states.has(clientID)) {
      if (state === null) {
        if (clientID === awareness.clientID && awareness.getLocalState() != null) {
          clock++;
        } else {
          awareness.states.delete(clientID);
        }
      } else {
        awareness.states.set(clientID, state);
      }
      awareness.meta.set(clientID, {
        clock,
        lastUpdated: timestamp
      });
      if (clientMeta === void 0 && state !== null) {
        added.push(clientID);
      } else if (clientMeta !== void 0 && state === null) {
        removed.push(clientID);
      } else if (state !== null) {
        if (!equalityDeep(state, prevState)) {
          filteredUpdated.push(clientID);
        }
        updated.push(clientID);
      }
    }
  }
  if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
    awareness.emit("change", [{
      added,
      updated: filteredUpdated,
      removed
    }, origin]);
  }
  if (added.length > 0 || updated.length > 0 || removed.length > 0) {
    awareness.emit("update", [{
      added,
      updated,
      removed
    }, origin]);
  }
};
var create = () => /* @__PURE__ */ new Map();
var setIfUndefined = (map2, key, createT) => {
  let set = map2.get(key);
  if (set === void 0) {
    map2.set(key, set = createT());
  }
  return set;
};
var create2 = () => /* @__PURE__ */ new Set();
var from = Array.from;
var fromCharCode = String.fromCharCode;
var toLowerCase = (s) => s.toLowerCase();
var trimLeftRegex = /^\s*/g;
var trimLeft = (s) => s.replace(trimLeftRegex, "");
var fromCamelCaseRegex = /([A-Z])/g;
var fromCamelCase = (s, separator) => trimLeft(s.replace(fromCamelCaseRegex, (match) => `${separator}${toLowerCase(match)}`));
var _encodeUtf8Polyfill = (str) => {
  const encodedString = unescape(encodeURIComponent(str));
  const len = encodedString.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = /** @type {number} */
    encodedString.codePointAt(i);
  }
  return buf;
};
var utf8TextEncoder = (
  /** @type {TextEncoder} */
  typeof TextEncoder !== "undefined" ? new TextEncoder() : null
);
var _encodeUtf8Native = (str) => utf8TextEncoder.encode(str);
var encodeUtf8 = utf8TextEncoder ? _encodeUtf8Native : _encodeUtf8Polyfill;
var utf8TextDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
if (utf8TextDecoder && utf8TextDecoder.decode(new Uint8Array()).length === 1) {
  utf8TextDecoder = null;
}
var undefinedToNull = (v) => v === void 0 ? null : v;
var VarStoragePolyfill = class {
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  /**
   * @param {string} key
   * @param {any} newValue
   */
  setItem(key, newValue) {
    this.map.set(key, newValue);
  }
  /**
   * @param {string} key
   */
  getItem(key) {
    return this.map.get(key);
  }
};
var _localStorage = new VarStoragePolyfill();
var usePolyfill = true;
try {
  if (typeof localStorage !== "undefined" && localStorage) {
    _localStorage = localStorage;
    usePolyfill = false;
  }
} catch (e) {
}
var varStorage = _localStorage;
var onChange = (eventHandler) => usePolyfill || addEventListener(
  "storage",
  /** @type {any} */
  eventHandler
);
var offChange = (eventHandler) => usePolyfill || removeEventListener(
  "storage",
  /** @type {any} */
  eventHandler
);
var map = (obj, f) => {
  const results = [];
  for (const key in obj) {
    results.push(f(obj[key], key));
  }
  return results;
};
var isOneOf = (value, options) => options.includes(value);
var isNode = typeof process !== "undefined" && process.release && /node|io\.js/.test(process.release.name) && Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]";
var isBrowser = typeof window !== "undefined" && typeof document !== "undefined" && !isNode;
var params;
var computeParams = () => {
  if (params === void 0) {
    if (isNode) {
      params = create();
      const pargs = process.argv;
      let currParamName = null;
      for (let i = 0; i < pargs.length; i++) {
        const parg = pargs[i];
        if (parg[0] === "-") {
          if (currParamName !== null) {
            params.set(currParamName, "");
          }
          currParamName = parg;
        } else {
          if (currParamName !== null) {
            params.set(currParamName, parg);
            currParamName = null;
          }
        }
      }
      if (currParamName !== null) {
        params.set(currParamName, "");
      }
    } else if (typeof location === "object") {
      params = create();
      (location.search || "?").slice(1).split("&").forEach((kv) => {
        if (kv.length !== 0) {
          const [key, value] = kv.split("=");
          params.set(`--${fromCamelCase(key, "-")}`, value);
          params.set(`-${fromCamelCase(key, "-")}`, value);
        }
      });
    } else {
      params = create();
    }
  }
  return params;
};
var hasParam = (name) => computeParams().has(name);
var getVariable = (name) => isNode ? undefinedToNull(process.env[name.toUpperCase().replaceAll("-", "_")]) : undefinedToNull(varStorage.getItem(name));
var hasConf = (name) => hasParam("--" + name) || getVariable(name) !== null;
hasConf("production");
var forceColor = isNode && isOneOf(process.env.FORCE_COLOR, ["true", "1", "2"]);
!hasParam("no-colors") && (!isNode || process.stdout.isTTY || forceColor) && (!isNode || hasParam("color") || forceColor || getVariable("COLORTERM") !== null || (getVariable("TERM") || "").includes("color"));
var floor = Math.floor;
var min = (a, b) => a < b ? a : b;
var max = (a, b) => a > b ? a : b;
var pow = Math.pow;
var BIT8 = 128;
var BITS7 = 127;
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
var Encoder2 = class {
  constructor() {
    this.cpos = 0;
    this.cbuf = new Uint8Array(100);
    this.bufs = [];
  }
};
var createEncoder = () => new Encoder2();
var length = (encoder) => {
  let len = encoder.cpos;
  for (let i = 0; i < encoder.bufs.length; i++) {
    len += encoder.bufs[i].length;
  }
  return len;
};
var toUint8Array = (encoder) => {
  const uint8arr = new Uint8Array(length(encoder));
  let curPos = 0;
  for (let i = 0; i < encoder.bufs.length; i++) {
    const d = encoder.bufs[i];
    uint8arr.set(d, curPos);
    curPos += d.length;
  }
  uint8arr.set(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos), curPos);
  return uint8arr;
};
var write = (encoder, num) => {
  const bufferLen = encoder.cbuf.length;
  if (encoder.cpos === bufferLen) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(bufferLen * 2);
    encoder.cpos = 0;
  }
  encoder.cbuf[encoder.cpos++] = num;
};
var writeVarUint = (encoder, num) => {
  while (num > BITS7) {
    write(encoder, BIT8 | BITS7 & num);
    num = floor(num / 128);
  }
  write(encoder, BITS7 & num);
};
var _strBuffer = new Uint8Array(3e4);
var _maxStrBSize = _strBuffer.length / 3;
var _writeVarStringNative = (encoder, str) => {
  if (str.length < _maxStrBSize) {
    const written = utf8TextEncoder.encodeInto(str, _strBuffer).written || 0;
    writeVarUint(encoder, written);
    for (let i = 0; i < written; i++) {
      write(encoder, _strBuffer[i]);
    }
  } else {
    writeVarUint8Array(encoder, encodeUtf8(str));
  }
};
var _writeVarStringPolyfill = (encoder, str) => {
  const encodedString = unescape(encodeURIComponent(str));
  const len = encodedString.length;
  writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    write(
      encoder,
      /** @type {number} */
      encodedString.codePointAt(i)
    );
  }
};
utf8TextEncoder && /** @type {any} */
utf8TextEncoder.encodeInto ? _writeVarStringNative : _writeVarStringPolyfill;
var writeUint8Array = (encoder, uint8Array) => {
  const bufferLen = encoder.cbuf.length;
  const cpos = encoder.cpos;
  const leftCopyLen = min(bufferLen - cpos, uint8Array.length);
  const rightCopyLen = uint8Array.length - leftCopyLen;
  encoder.cbuf.set(uint8Array.subarray(0, leftCopyLen), cpos);
  encoder.cpos += leftCopyLen;
  if (rightCopyLen > 0) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(max(bufferLen * 2, rightCopyLen));
    encoder.cbuf.set(uint8Array.subarray(leftCopyLen));
    encoder.cpos = rightCopyLen;
  }
};
var writeVarUint8Array = (encoder, uint8Array) => {
  writeVarUint(encoder, uint8Array.byteLength);
  writeUint8Array(encoder, uint8Array);
};
var create3 = (s) => new Error(s);
var errorUnexpectedEndOfArray = create3("Unexpected end of array");
var errorIntegerOutOfRange = create3("Integer out of Range");
var Decoder2 = class {
  /**
   * @param {Uint8Array} uint8Array Binary data to decode
   */
  constructor(uint8Array) {
    this.arr = uint8Array;
    this.pos = 0;
  }
};
var createDecoder = (uint8Array) => new Decoder2(uint8Array);
var readUint8Array = (decoder, len) => {
  const view = new Uint8Array(decoder.arr.buffer, decoder.pos + decoder.arr.byteOffset, len);
  decoder.pos += len;
  return view;
};
var readVarUint8Array = (decoder) => readUint8Array(decoder, readVarUint(decoder));
var readVarUint = (decoder) => {
  let num = 0;
  let mult = 1;
  const len = decoder.arr.length;
  while (decoder.pos < len) {
    const r = decoder.arr[decoder.pos++];
    num = num + (r & BITS7) * mult;
    mult *= 128;
    if (r < BIT8) {
      return num;
    }
    if (num > MAX_SAFE_INTEGER) {
      throw errorIntegerOutOfRange;
    }
  }
  throw errorUnexpectedEndOfArray;
};
var createUint8ArrayFromLen = (len) => new Uint8Array(len);
var createUint8ArrayViewFromArrayBuffer = (buffer, byteOffset, length2) => new Uint8Array(buffer, byteOffset, length2);
var createUint8ArrayFromArrayBuffer = (buffer) => new Uint8Array(buffer);
var toBase64Browser = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    s += fromCharCode(bytes[i]);
  }
  return btoa(s);
};
var toBase64Node = (bytes) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
var fromBase64Browser = (s) => {
  const a = atob(s);
  const bytes = createUint8ArrayFromLen(a.length);
  for (let i = 0; i < a.length; i++) {
    bytes[i] = a.charCodeAt(i);
  }
  return bytes;
};
var fromBase64Node = (s) => {
  const buf = Buffer.from(s, "base64");
  return createUint8ArrayViewFromArrayBuffer(buf.buffer, buf.byteOffset, buf.byteLength);
};
var toBase64 = isBrowser ? toBase64Browser : toBase64Node;
var fromBase64 = isBrowser ? fromBase64Browser : fromBase64Node;
var channels = /* @__PURE__ */ new Map();
var LocalStoragePolyfill = class {
  /**
   * @param {string} room
   */
  constructor(room) {
    this.room = room;
    this.onmessage = null;
    this._onChange = (e) => e.key === room && this.onmessage !== null && this.onmessage({ data: fromBase64(e.newValue || "") });
    onChange(this._onChange);
  }
  /**
   * @param {ArrayBuffer} buf
   */
  postMessage(buf) {
    varStorage.setItem(this.room, toBase64(createUint8ArrayFromArrayBuffer(buf)));
  }
  close() {
    offChange(this._onChange);
  }
};
var BC = typeof BroadcastChannel === "undefined" ? LocalStoragePolyfill : BroadcastChannel;
var getChannel = (room) => setIfUndefined(channels, room, () => {
  const subs = create2();
  const bc = new BC(room);
  bc.onmessage = (e) => subs.forEach((sub) => sub(e.data, "broadcastchannel"));
  return {
    bc,
    subs
  };
});
var subscribe = (room, f) => {
  getChannel(room).subs.add(f);
  return f;
};
var unsubscribe = (room, f) => {
  const channel = getChannel(room);
  const unsubscribed = channel.subs.delete(f);
  if (unsubscribed && channel.subs.size === 0) {
    channel.bc.close();
    channels.delete(room);
  }
  return unsubscribed;
};
var publish = (room, data, origin = null) => {
  const c = getChannel(room);
  c.bc.postMessage(data);
  c.subs.forEach((sub) => sub(data, origin));
};
var getUnixTime = Date.now;
var Observable2 = class {
  constructor() {
    this._observers = create();
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  on(name, f) {
    setIfUndefined(this._observers, name, create2).add(f);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  once(name, f) {
    const _f = (...args2) => {
      this.off(name, _f);
      f(...args2);
    };
    this.on(name, _f);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  off(name, f) {
    const observers = this._observers.get(name);
    if (observers !== void 0) {
      observers.delete(f);
      if (observers.size === 0) {
        this._observers.delete(name);
      }
    }
  }
  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @param {N} name The event name.
   * @param {Array<any>} args The arguments that are applied to the event listener.
   */
  emit(name, args2) {
    return from((this._observers.get(name) || create()).values()).forEach((f) => f(...args2));
  }
  destroy() {
    this._observers = create();
  }
};
var encodeQueryParams = (params2) => map(params2, (val, key) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`).join("&");
var messageSync = 0;
var messageQueryAwareness = 3;
var messageAwareness = 1;
var messageAuth = 2;
var messageHandlers = [];
messageHandlers[messageSync] = (encoder, decoder, provider, emitSynced, _messageType) => {
  writeVarUint(encoder, messageSync);
  const syncMessageType = readSyncMessage(decoder, encoder, provider.doc, provider);
  if (emitSynced && syncMessageType === messageYjsSyncStep2 && !provider.synced) {
    provider.synced = true;
  }
};
messageHandlers[messageQueryAwareness] = (encoder, _decoder, provider, _emitSynced, _messageType) => {
  writeVarUint(encoder, messageAwareness);
  writeVarUint8Array(
    encoder,
    encodeAwarenessUpdate(
      provider.awareness,
      Array.from(provider.awareness.getStates().keys())
    )
  );
};
messageHandlers[messageAwareness] = (_encoder, decoder, provider, _emitSynced, _messageType) => {
  applyAwarenessUpdate(
    provider.awareness,
    readVarUint8Array(decoder),
    provider
  );
};
messageHandlers[messageAuth] = (_encoder, decoder, provider, _emitSynced, _messageType) => {
  readAuthMessage(
    decoder,
    provider.doc,
    (_ydoc, reason) => permissionDeniedHandler(provider, reason)
  );
};
var messageReconnectTimeout = 3e4;
var permissionDeniedHandler = (provider, reason) => console.warn(`Permission denied to access ${provider.url}.
${reason}`);
var readMessage = (provider, buf, emitSynced) => {
  const decoder = createDecoder(buf);
  const encoder = createEncoder();
  const messageType = readVarUint(decoder);
  const messageHandler = provider.messageHandlers[messageType];
  if (
    /** @type {any} */
    messageHandler
  ) {
    messageHandler(encoder, decoder, provider, emitSynced, messageType);
  } else {
    console.error("Unable to compute message");
  }
  return encoder;
};
var setupWS = (provider) => {
  if (provider.shouldConnect && provider.ws === null) {
    const websocket = new provider._WS(provider.url);
    websocket.binaryType = "arraybuffer";
    provider.ws = websocket;
    provider.wsconnecting = true;
    provider.wsconnected = false;
    provider.synced = false;
    websocket.onmessage = (event) => {
      provider.wsLastMessageReceived = getUnixTime();
      const encoder = readMessage(provider, new Uint8Array(event.data), true);
      if (length(encoder) > 1) {
        websocket.send(toUint8Array(encoder));
      }
    };
    websocket.onerror = (event) => {
      provider.emit("connection-error", [event, provider]);
    };
    websocket.onclose = (event) => {
      provider.emit("connection-close", [event, provider]);
      provider.ws = null;
      provider.wsconnecting = false;
      if (provider.wsconnected) {
        provider.wsconnected = false;
        provider.synced = false;
        removeAwarenessStates(
          provider.awareness,
          Array.from(provider.awareness.getStates().keys()).filter(
            (client) => client !== provider.doc.clientID
          ),
          provider
        );
        provider.emit("status", [
          {
            status: "disconnected"
          }
        ]);
      } else {
        provider.wsUnsuccessfulReconnects++;
      }
      setTimeout(
        setupWS,
        min(pow(2, provider.wsUnsuccessfulReconnects) * 100, provider.maxBackoffTime),
        provider
      );
    };
    websocket.onopen = () => {
      provider.wsLastMessageReceived = getUnixTime();
      provider.wsconnecting = false;
      provider.wsconnected = true;
      provider.wsUnsuccessfulReconnects = 0;
      provider.emit("status", [
        {
          status: "connected"
        }
      ]);
      const encoder = createEncoder();
      writeVarUint(encoder, messageSync);
      writeSyncStep1(encoder, provider.doc);
      websocket.send(toUint8Array(encoder));
      if (provider.awareness.getLocalState() !== null) {
        const encoderAwarenessState = createEncoder();
        writeVarUint(encoderAwarenessState, messageAwareness);
        writeVarUint8Array(
          encoderAwarenessState,
          encodeAwarenessUpdate(provider.awareness, [provider.doc.clientID])
        );
        websocket.send(toUint8Array(encoderAwarenessState));
      }
    };
    provider.emit("status", [
      {
        status: "connecting"
      }
    ]);
  }
};
var broadcastMessage = (provider, buf) => {
  const ws = provider.ws;
  if (provider.wsconnected && ws && ws.readyState === ws.OPEN) {
    ws.send(buf);
  }
  if (provider.bcconnected) {
    publish(provider.bcChannel, buf, provider);
  }
};
var YSweetProvider = class extends Observable2 {
  /**
   * @param serverUrl - server url
   * @param roomname - room name
   * @param doc - Y.Doc instance
   * @param opts - options
   * @param opts.connect - connect option
   * @param opts.awareness - awareness protocol instance
   * @param opts.params - parameters
   * @param opts.WebSocketPolyfill - WebSocket polyfill
   * @param opts.resyncInterval - resync interval
   * @param opts.maxBackoffTime - maximum backoff time
   * @param opts.disableBc - disable broadcast channel
   */
  constructor(serverUrl, roomname, doc, {
    connect = true,
    awareness = new Awareness(doc),
    params: params2 = {},
    WebSocketPolyfill = WebSocket,
    resyncInterval = -1,
    maxBackoffTime = 2500,
    disableBc = false
  } = {}) {
    super();
    while (serverUrl[serverUrl.length - 1] === "/") {
      serverUrl = serverUrl.slice(0, serverUrl.length - 1);
    }
    const encodedParams = encodeQueryParams(params2);
    this.maxBackoffTime = maxBackoffTime;
    this.bcChannel = serverUrl + "/" + roomname;
    this.url = serverUrl + "/" + roomname + (encodedParams.length === 0 ? "" : "?" + encodedParams);
    this.roomname = roomname;
    this.doc = doc;
    this._WS = WebSocketPolyfill;
    this.awareness = awareness;
    this.wsconnected = false;
    this.wsconnecting = false;
    this.bcconnected = false;
    this.disableBc = disableBc;
    this.wsUnsuccessfulReconnects = 0;
    this.messageHandlers = messageHandlers.slice();
    this._synced = false;
    this.ws = null;
    this.wsLastMessageReceived = 0;
    this.shouldConnect = connect;
    this._resyncInterval = 0;
    if (resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const encoder = createEncoder();
          writeVarUint(encoder, messageSync);
          writeSyncStep1(encoder, doc);
          this.ws.send(toUint8Array(encoder));
        }
      }, resyncInterval);
    }
    this._bcSubscriber = (data, origin) => {
      if (origin !== this) {
        const encoder = readMessage(this, new Uint8Array(data), false);
        if (length(encoder) > 1) {
          publish(this.bcChannel, toUint8Array(encoder), this);
        }
      }
    };
    this._updateHandler = (update, origin) => {
      if (origin !== this) {
        const encoder = createEncoder();
        writeVarUint(encoder, messageSync);
        writeUpdate(encoder, update);
        broadcastMessage(this, toUint8Array(encoder));
      }
    };
    this.doc.on("update", this._updateHandler);
    this._awarenessUpdateHandler = ({ added, updated, removed }, _origin) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = createEncoder();
      writeVarUint(encoder, messageAwareness);
      writeVarUint8Array(
        encoder,
        encodeAwarenessUpdate(awareness, changedClients)
      );
      broadcastMessage(this, toUint8Array(encoder));
    };
    this._unloadHandler = () => {
      removeAwarenessStates(this.awareness, [doc.clientID], "window unload");
    };
    if (typeof window !== "undefined") {
      window.addEventListener("unload", this._unloadHandler);
    } else if (typeof process !== "undefined") {
      process.on("exit", this._unloadHandler);
    }
    awareness.on("update", this._awarenessUpdateHandler);
    this._checkInterval = setInterval(() => {
      var _a;
      if (this.wsconnected && messageReconnectTimeout < getUnixTime() - this.wsLastMessageReceived) {
        (_a = this.ws) == null ? void 0 : _a.close();
      }
    }, messageReconnectTimeout / 10);
    if (connect) {
      this.connect();
    }
  }
  /**
   * @type {boolean}
   */
  get synced() {
    return this._synced;
  }
  set synced(state) {
    if (this._synced !== state) {
      this._synced = state;
      this.emit("synced", [state]);
      this.emit("sync", [state]);
    }
  }
  destroy() {
    if (this._resyncInterval !== 0) {
      clearInterval(this._resyncInterval);
    }
    clearInterval(this._checkInterval);
    this.disconnect();
    if (typeof window !== "undefined") {
      window.removeEventListener("unload", this._unloadHandler);
    } else if (typeof process !== "undefined") {
      process.off("exit", this._unloadHandler);
    }
    this.awareness.off("update", this._awarenessUpdateHandler);
    this.doc.off("update", this._updateHandler);
    super.destroy();
  }
  connectBc() {
    if (this.disableBc) {
      return;
    }
    if (!this.bcconnected) {
      subscribe(this.bcChannel, this._bcSubscriber);
      this.bcconnected = true;
    }
    const encoderSync = createEncoder();
    writeVarUint(encoderSync, messageSync);
    writeSyncStep1(encoderSync, this.doc);
    publish(this.bcChannel, toUint8Array(encoderSync), this);
    const encoderState = createEncoder();
    writeVarUint(encoderState, messageSync);
    writeSyncStep2(encoderState, this.doc);
    publish(this.bcChannel, toUint8Array(encoderState), this);
    const encoderAwarenessQuery = createEncoder();
    writeVarUint(encoderAwarenessQuery, messageQueryAwareness);
    publish(this.bcChannel, toUint8Array(encoderAwarenessQuery), this);
    const encoderAwarenessState = createEncoder();
    writeVarUint(encoderAwarenessState, messageAwareness);
    writeVarUint8Array(
      encoderAwarenessState,
      encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
    );
    publish(this.bcChannel, toUint8Array(encoderAwarenessState), this);
  }
  disconnectBc() {
    const encoder = createEncoder();
    writeVarUint(encoder, messageAwareness);
    writeVarUint8Array(
      encoder,
      encodeAwarenessUpdate(this.awareness, [this.doc.clientID], /* @__PURE__ */ new Map())
    );
    broadcastMessage(this, toUint8Array(encoder));
    if (this.bcconnected) {
      unsubscribe(this.bcChannel, this._bcSubscriber);
      this.bcconnected = false;
    }
  }
  disconnect() {
    this.shouldConnect = false;
    this.disconnectBc();
    if (this.ws !== null) {
      this.ws.close();
    }
  }
  connect() {
    this.shouldConnect = true;
    if (!this.wsconnected && this.ws === null) {
      setupWS(this);
      this.connectBc();
    }
  }
};
function createYjsProvider(doc, clientToken, extraOptions = {}) {
  const params2 = clientToken.token ? { token: clientToken.token } : void 0;
  const provider = new YSweetProvider(clientToken.url, clientToken.docId, doc, {
    params: params2,
    ...extraOptions
  });
  return provider;
}
function validate(room) {
  if (!room) {
    throw new Error("room is required");
  }
  const { id: roomId, collectionKey } = room;
  if (!roomId) {
    throw new Error("roomId is required");
  }
  if (!collectionKey) {
    throw new Error("collectionKey is required");
  }
  return { roomId, collectionKey };
}
function checkLoadedState(db) {
  return (room, token) => {
    const localLoaded = !!room && !!room.ydoc && !!room.indexedDbProvider;
    const shouldLoadYSweet = db.useYSweet && token && (room == null ? void 0 : room.ySweetUrl);
    const ySweetLoaded = token && (room == null ? void 0 : room.ySweetProvider) && room.token === token && room.tokenExpiry && !isTokenExpired(room.tokenExpiry);
    return { localLoaded, ySweetLoaded, shouldLoadYSweet };
  };
}
async function loadLocal(db, room) {
  const { yDoc: ydoc, localProvider } = await initializeDocAndLocalProvider(
    room.id,
    room.ydoc,
    db.indexedDBProviderPolyfill
  );
  room.ydoc = ydoc;
  room.indexedDbProvider = localProvider;
  db.debug(
    "initialized ydoc and localProvider",
    room.ydoc,
    room.indexedDbProvider
  );
}
async function loadYSweet(db, room, withAwareness = true) {
  function emitConnectionChange(status) {
    if (status === "connected") {
      room.connectionRetries = 0;
    }
    room.emit("roomConnectionChange", status, room);
    db.emit("roomConnectionChange", status, room);
  }
  const handleStatusChange = ({ status }) => emitConnectionChange(status);
  function handleSync(synced) {
    emitConnectionChange(synced ? "connected" : "disconnected");
    db.debug("ySweetProvider synced", synced);
  }
  async function handleConnectionError(error) {
    db.error("ySweetProvider error", error);
    emitConnectionChange("disconnected");
    if (room.connectionRetries < 3) {
      await wait(1e3);
      room.connectionRetries++;
      checkTokenAndConnectProvider(withAwareness);
    }
  }
  async function checkTokenAndConnectProvider(withAwareness2 = true) {
    emitConnectionChange("connecting");
    if (room.tokenExpiry && isTokenExpired(room.tokenExpiry)) {
      const refreshed = await db.refreshYSweetToken(room);
      db.debug(
        "refreshed token. success: ",
        (refreshed == null ? void 0 : refreshed.ySweetUrl) && refreshed.tokenExpiry
      );
      if ((refreshed == null ? void 0 : refreshed.ySweetUrl) && refreshed.tokenExpiry) {
        room.tokenExpiry = refreshed.tokenExpiry;
        room.ySweetUrl = refreshed.ySweetUrl;
      }
    }
    const awareness = new Awareness(room.ydoc);
    room.ySweetProvider = createYjsProvider(
      room.ydoc,
      {
        url: room.ySweetUrl ?? "",
        token: room.token ?? "",
        docId: room.id
      },
      withAwareness2 ? { awareness } : {}
    );
    room.ydoc = room.ySweetProvider.doc;
    room.ySweetProvider.on("status", handleStatusChange);
    room.ySweetProvider.on("sync", handleSync);
    room.ySweetProvider.on("connection-error", handleConnectionError);
    room.ySweetProvider.connect();
  }
  await checkTokenAndConnectProvider();
  db.debug("created ySweetProvider", room.ySweetProvider);
  room.disconnect = () => {
    var _a, _b, _c, _d, _e;
    (_a = room.ySweetProvider) == null ? void 0 : _a.off("status", handleStatusChange);
    (_b = room.ySweetProvider) == null ? void 0 : _b.off("sync", handleSync);
    (_c = room.ySweetProvider) == null ? void 0 : _c.off("connection-error", handleConnectionError);
    (_d = room.ySweetProvider) == null ? void 0 : _d.disconnect();
    (_e = room.webRtcProvider) == null ? void 0 : _e.disconnect();
    emitConnectionChange("disconnected");
  };
}
const loadRoom = (db) => async (serverRoom) => {
  const { roomId, collectionKey } = validate(serverRoom);
  const room = db.collections[collectionKey][roomId] ?? new Room({ db, ...serverRoom });
  db.info("loading room", { room, serverRoom });
  const { localLoaded, ySweetLoaded, shouldLoadYSweet } = checkLoadedState(db)(
    room,
    serverRoom.token
  );
  db.debug("loadedState", {
    localLoaded,
    ySweetLoaded,
    shouldLoadYSweet
  });
  if (localLoaded && (!shouldLoadYSweet || ySweetLoaded)) {
    db.debug("room already loaded", room);
    return room;
  }
  if (!localLoaded) {
    await loadLocal(db, room);
  }
  if (shouldLoadYSweet && !ySweetLoaded) {
    await loadYSweet(db, room);
  }
  db.collections[collectionKey][roomId] = room;
  db.emit("roomLoaded", room);
  return room;
};
const refreshYSweetToken = (db) => async (room) => {
  const { data: refreshed } = await db.serverFetch(
    `/access-grant/refresh-y-sweet-token/${room.id}`
  );
  return refreshed;
};
const syncRegistry = (db) => (
  /** sends the registry to the server to check for additions/subtractions on either side */
  async () => {
    const body = {
      token: db.getToken() ?? "",
      rooms: db.registry
    };
    if (!body.token) {
      return false;
    }
    const { data: syncResult } = await db.serverFetch(
      "/access-grant/sync-registry",
      { method: "POST", body }
    );
    db.info("syncResult", syncResult);
    const { rooms, token } = syncResult ?? {};
    if (token && typeof token === "string") {
      db.debug("setting new token", token);
      setLocalAccessGrantToken(db)(token);
      db.accessGrantToken = token;
    } else {
      return false;
    }
    if (rooms && typeof rooms === "object" && Array.isArray(rooms) && rooms.length >= 2) {
      db.debug("setting new rooms", rooms);
      setLocalRegistry(db)(rooms);
      db.registry = rooms;
    } else {
      return false;
    }
    return true;
  }
);
const loadRooms = (db) => async (rooms) => {
  const loadedRooms = [];
  db.debug("loading rooms", rooms);
  for (const room of rooms) {
    const loadedRoom = await db.loadRoom(room);
    loadedRooms.push(loadedRoom);
  }
  db.debug("loaded rooms", loadedRooms);
  db.emit("roomsLoaded", loadedRooms);
};
const generateShareRoomLink = (db) => async ({
  roomId,
  invitees,
  redirectUrl,
  redirectQueries,
  expiry,
  accessType,
  appName,
  domain,
  collections: collections2
}) => {
  const body = {
    roomId,
    invitees: invitees || [],
    redirectQueries,
    expiry: expiry || new Date(Date.now() + 1e3 * 60 * 60 * 24).toISOString(),
    accessType,
    ...loginOptionsToQueryParams({
      name: appName,
      domain: domain || window.location.host,
      collections: collections2 ?? ["all"],
      redirect: redirectUrl || window.location.href.split("?")[0]
    })
  };
  const { error, data } = await db.serverFetch(
    "/access-grant/create-room-invite",
    {
      body,
      method: "POST"
    }
  );
  if (error) {
    db.error("Error creating room invite", error);
    return JSON.stringify(error);
  }
  if (!(data == null ? void 0 : data.link)) {
    return "Error creating room invite";
  }
  return data.link;
};
const pingServer = (db) => async () => {
  const { data, error } = await db.serverFetch(
    "/access-grant/ping"
  );
  if (error) {
    db.error("Error pinging server", error);
    return false;
  } else {
    db.debug("Server pinged", data);
    return (data == null ? void 0 : data.reply) && data.reply === "pong";
  }
};
const defaultRtcPeers = [
  "wss://signaling.yjs.debv",
  "wss://y-webrtc-signaling-eu.herokuapp.com",
  "wss://y-webrtc-signaling-us.herokuapp.com"
];
class Database extends TypedEventEmitter {
  constructor(optionsPassed) {
    var _a, _b;
    super();
    __publicField(this, "userId", "");
    /* default to the eweser auth server https://www.eweser.com */
    __publicField(this, "authServer", "https://www.eweser.com");
    __publicField(this, "online", false);
    __publicField(this, "isPolling", false);
    __publicField(this, "offlineOnly", false);
    /** set to false before `db.loginWithToken()` so that offline-first mode is the default, and it upgrades to online sync after login with token */
    __publicField(this, "useYSweet", false);
    __publicField(this, "useWebRTC", true);
    __publicField(this, "useIndexedDB", true);
    __publicField(this, "indexedDBProviderPolyfill");
    __publicField(this, "collectionKeys", collectionKeys);
    __publicField(this, "collections", collections);
    __publicField(this, "registry", []);
    __publicField(this, "accessGrantToken", "");
    __publicField(this, "webRtcPeers", defaultRtcPeers);
    // METHODS
    // logger/event emitter
    __publicField(this, "logLevel", 2);
    __publicField(this, "log", log(this));
    __publicField(this, "debug", (...message) => this.log(0, ...message));
    __publicField(this, "info", (...message) => this.log(1, ...message));
    __publicField(this, "warn", (...message) => this.log(2, ...message));
    __publicField(this, "error", (...message) => this.log(3, message));
    // CONNECT METHODS
    __publicField(this, "serverFetch", serverFetch(this));
    __publicField(this, "generateLoginUrl", generateLoginUrl(this));
    __publicField(this, "login", login(this));
    __publicField(this, "logout", logout(this));
    __publicField(this, "logoutAndClear", logoutAndClear(this));
    __publicField(this, "getAccessGrantTokenFromUrl", getAccessGrantTokenFromUrl(this));
    __publicField(this, "getToken", getToken(this));
    __publicField(this, "refreshYSweetToken", refreshYSweetToken(this));
    __publicField(this, "loadRoom", loadRoom(this));
    __publicField(this, "loadRooms", loadRooms(this));
    __publicField(this, "syncRegistry", syncRegistry(this));
    // util methods
    __publicField(this, "getRegistry", getRegistry(this));
    __publicField(this, "localStoragePolyfill");
    __publicField(this, "localStorageService", {
      setItem: localStorageSet(this),
      getItem: localStorageGet(this),
      removeItem: localStorageRemove(this)
    });
    // collection methods
    __publicField(this, "getDocuments", getDocuments(this));
    __publicField(this, "getRoom", (collectionKey, roomId) => {
      return this.collections[collectionKey][roomId];
    });
    /**
     * new rooms must be added to the registry and then synced with the auth server
     * Note: If your app does not have access privileges to the collection, the room won't be synced server-side.
     */
    __publicField(this, "newRoom", (options) => {
      const room = new Room(options);
      this.collections[room.collectionKey][room.id] = room;
      const serverRoom = roomToServerRoom(room);
      this.registry.push(serverRoom);
      setLocalRegistry(this)(this.registry);
      if (this.online) {
        this.syncRegistry();
      }
      return room;
    });
    __publicField(this, "renameRoom", async (room, newName) => {
      const body = {
        newName
      };
      const { data, error } = await this.serverFetch(
        `/access-grant/update-room/${room.id}`,
        {
          method: "POST",
          body
        }
      );
      if (error) {
        this.error("Error renaming room", error);
      } else if (data == null ? void 0 : data.name) {
        room.name = data.name;
        this.debug("Room renamed", data);
        const registryEntry = this.registry.find((r) => r.id === room.id);
        if (registryEntry) {
          registryEntry.name = data.name;
          setLocalRegistry(this)(this.registry);
        } else {
          this.error("Error renaming room, registry entry not found");
        }
      }
      return data;
    });
    __publicField(this, "generateShareRoomLink", generateShareRoomLink(this));
    __publicField(this, "pingServer", pingServer(this));
    // Temp docs. These are used for collaborative editing, or for rich-text editors that require a full yDoc passed to the editor. It is recommended in these cases to use a temporary yDoc only used for the session (if that document is open in both apps), then have debounced updates to the actual (ex. Notes) document, saved in cross platform compatible markdown.
    __publicField(this, "tempDocs", {});
    const options = optionsPassed || {};
    this.localStoragePolyfill = options.localStoragePolyfill || localStorage;
    if (options.authServer) {
      this.authServer = options.authServer;
    }
    if (options.providers) {
      if (!options.providers.includes("WebRTC")) {
        this.webRtcPeers = [];
        this.useWebRTC = false;
      }
      if (options.providers.includes("YSweet")) {
        this.useYSweet = true;
      }
      if (!options.providers.includes("IndexedDB")) {
        throw new Error("IndexedDB provider is required");
      }
    }
    if (((_a = options.providers) == null ? void 0 : _a.length) && ((_b = options.providers) == null ? void 0 : _b.length) === 1 && options.providers[0] === "IndexedDB") {
      this.offlineOnly = true;
    } else {
      pollConnection(this);
      if (options == null ? void 0 : options.webRTCPeers) {
        this.webRtcPeers = options == null ? void 0 : options.webRTCPeers;
      }
    }
    setupLogger(this, options.logLevel);
    this.debug("Database created with options", options);
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
    this.loadRooms(this.registry);
  }
  getRooms(collectionKey) {
    return Object.values(this.collections[collectionKey]);
  }
}
export {
  Database,
  buildRef,
  collections,
  getRoom,
  getRoomDocuments,
  newDocument,
  randomString,
  wait$1 as wait
};
