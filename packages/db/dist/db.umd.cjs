(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("yjs")) : typeof define === "function" && define.amd ? define(["exports", "yjs"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global["eweser-db"] = {}, global.Y));
})(this, function(exports2, Y) {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

  function _interopNamespaceDefault(e) {
    const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
    if (e) {
      for (const k in e) {
        if (k !== "default") {
          const d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: () => e[k]
          });
        }
      }
    }
    n.default = e;
    return Object.freeze(n);
  }
  const Y__namespace = /* @__PURE__ */ _interopNamespaceDefault(Y);
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
  events.exports.once = once;
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
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        ReflectApply(listeners[i], this, args);
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
  EventEmitter.prototype.once = function once2(type, listener) {
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
    var listeners, events2, i;
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
    listeners = events2[type];
    if (typeof listeners === "function") {
      this.removeListener(type, listeners);
    } else if (listeners !== void 0) {
      for (i = listeners.length - 1; i >= 0; i--) {
        this.removeListener(type, listeners[i]);
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
  function once(emitter, name) {
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
  const buildRef = (params) => {
    Object.entries(params).forEach(([key, param]) => {
      if (!param)
        throw new Error(`${key} is required`);
      if (typeof param !== "string")
        throw new Error(`${key} must be a string`);
      if (param.includes("|"))
        throw new Error(`${key} cannot include |`);
    });
    const { collectionKey, roomId, documentId, authServer } = params;
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
  const floor$1 = Math.floor;
  const min$1 = (a, b) => a < b ? a : b;
  const max$1 = (a, b) => a > b ? a : b;
  const getUnixTime = Date.now;
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
  const setIfUndefined = (map, key, createT) => {
    let set = map.get(key);
    if (set === void 0) {
      map.set(key, set = createT());
    }
    return set;
  };
  const create$1 = () => /* @__PURE__ */ new Set();
  const from = Array.from;
  class Observable {
    constructor() {
      this._observers = create$2();
    }
    /**
     * @param {N} name
     * @param {function} f
     */
    on(name, f) {
      setIfUndefined(this._observers, name, create$1).add(f);
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
      return from((this._observers.get(name) || create$2()).values()).forEach((f) => f(...args));
    }
    destroy() {
      this._observers = create$2();
    }
  }
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
        Y__namespace.transact(idbPersistence.doc, () => {
          updates.forEach((val) => Y__namespace.applyUpdate(idbPersistence.doc, val));
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
      addAutoKey(updatesStore, Y__namespace.encodeStateAsUpdate(idbPersistence.doc)).then(() => del(updatesStore, createIDBKeyRangeUpperBound(idbPersistence._dbref, true))).then(() => count(updatesStore).then((cnt) => {
        idbPersistence._dbsize = cnt;
      }));
    }
  });
  class IndexeddbPersistence extends Observable {
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
        const beforeApplyUpdatesCallback = (updatesStore) => addAutoKey(updatesStore, Y__namespace.encodeStateAsUpdate(doc));
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
  const Doc = Y.Doc;
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
  class Awareness extends Observable {
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
        const now = getUnixTime();
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
        lastUpdated: getUnixTime()
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
            lastUpdated: getUnixTime()
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
    const timestamp = getUnixTime();
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
  const messageYjsSyncStep1 = 0;
  const messageYjsSyncStep2 = 1;
  const messageYjsUpdate = 2;
  const writeSyncStep1 = (encoder, doc) => {
    writeVarUint$1(encoder, messageYjsSyncStep1);
    const sv = Y__namespace.encodeStateVector(doc);
    writeVarUint8Array$1(encoder, sv);
  };
  const writeSyncStep2 = (encoder, doc, encodedStateVector) => {
    writeVarUint$1(encoder, messageYjsSyncStep2);
    writeVarUint8Array$1(encoder, Y__namespace.encodeStateAsUpdate(doc, encodedStateVector));
  };
  const readSyncStep1 = (decoder, encoder, doc) => writeSyncStep2(encoder, doc, readVarUint8Array$1(decoder));
  const readSyncStep2 = (decoder, doc, transactionOrigin) => {
    try {
      Y__namespace.applyUpdate(doc, readVarUint8Array$1(decoder), transactionOrigin);
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
  var BIT8 = 128;
  var BITS7 = 127;
  var floor = Math.floor;
  var min = (a, b) => a < b ? a : b;
  var max = (a, b) => a > b ? a : b;
  var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
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
  var create = (s) => new Error(s);
  var Encoder = class {
    constructor() {
      this.cpos = 0;
      this.cbuf = new Uint8Array(100);
      this.bufs = [];
    }
  };
  var createEncoder = () => new Encoder();
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
  var errorUnexpectedEndOfArray = create("Unexpected end of array");
  var errorIntegerOutOfRange = create("Integer out of Range");
  var Decoder = class {
    /**
     * @param {Uint8Array} uint8Array Binary data to decode
     */
    constructor(uint8Array) {
      this.arr = uint8Array;
      this.pos = 0;
    }
  };
  var createDecoder = (uint8Array) => new Decoder(uint8Array);
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
  var EVENT_STATUS = "status";
  var EVENT_SYNC = "sync";
  var EVENT_CONNECTION_CLOSE = "connection-close";
  var EVENT_CONNECTION_ERROR = "connection-error";
  var EVENT_SYNCED = "synced";
  var WEBSOCKET_STATUS_CONNECTED = "connected";
  var WEBSOCKET_STATUS_DISCONNECTED = "disconnected";
  var WEBSOCKET_STATUS_CONNECTING = "connecting";
  function translateStatus(status) {
    if (status === STATUS_CONNECTED) {
      return WEBSOCKET_STATUS_CONNECTED;
    } else if ([STATUS_CONNECTING, STATUS_HANDSHAKING].includes(status)) {
      return WEBSOCKET_STATUS_CONNECTING;
    } else {
      return WEBSOCKET_STATUS_DISCONNECTED;
    }
  }
  var WebSocketCompatLayer = class {
    constructor(provider) {
      this.provider = provider;
      this.lastStatus = WEBSOCKET_STATUS_DISCONNECTED;
      this.lastSyncStatus = false;
      this.provider.on(EVENT_CONNECTION_STATUS, this.updateStatus.bind(this));
    }
    updateStatus(status) {
      const newStatus = translateStatus(status);
      const syncStatus = status === STATUS_CONNECTED;
      if (this.lastSyncStatus !== syncStatus) {
        this.lastSyncStatus = syncStatus;
        this.provider.emit(EVENT_SYNC, syncStatus);
        this.provider.emit(EVENT_SYNCED, syncStatus);
      }
      if (this.lastStatus !== newStatus) {
        this.lastStatus = newStatus;
        this.provider.emit(EVENT_STATUS, { status: newStatus });
      }
    }
  };
  var MESSAGE_SYNC = 0;
  var MESSAGE_QUERY_AWARENESS = 3;
  var MESSAGE_AWARENESS = 1;
  var MESSAGE_SYNC_STATUS = 102;
  var RETRIES_BEFORE_TOKEN_REFRESH = 3;
  var DELAY_MS_BEFORE_RECONNECT = 500;
  var DELAY_MS_BEFORE_RETRY_TOKEN_REFRESH = 3e3;
  var EVENT_LOCAL_CHANGES = "local-changes";
  var EVENT_CONNECTION_STATUS = "connection-status";
  var STATUS_OFFLINE = "offline";
  var STATUS_CONNECTING = "connecting";
  var STATUS_ERROR = "error";
  var STATUS_HANDSHAKING = "handshaking";
  var STATUS_CONNECTED = "connected";
  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function getClientToken(authEndpoint, roomname) {
    if (typeof authEndpoint === "function") {
      return await authEndpoint();
    }
    const body = JSON.stringify({ docId: roomname });
    const res = await fetch(authEndpoint, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) {
      throw new Error(`Failed to get client token: ${res.status} ${res.statusText}`);
    }
    const clientToken = await res.json();
    if (clientToken.docId !== roomname) {
      throw new Error(
        `Client token docId does not match roomname: ${clientToken.docId} !== ${roomname}`
      );
    }
    return clientToken;
  }
  var YSweetProvider2 = class {
    constructor(authEndpoint, docId, doc, extraOptions = {}) {
      this.authEndpoint = authEndpoint;
      this.docId = docId;
      this.doc = doc;
      this.clientToken = null;
      this.hasLocalChanges = true;
      this.status = STATUS_OFFLINE;
      this.websocket = null;
      this.listeners = /* @__PURE__ */ new Map();
      this.lastSyncSent = 0;
      this.lastSyncAcked = -1;
      this.isConnecting = false;
      if (extraOptions.initialClientToken) {
        this.clientToken = extraOptions.initialClientToken;
      }
      new WebSocketCompatLayer(this);
      this.awareness = extraOptions.awareness ?? new Awareness(doc);
      this.awareness.on("update", this.handleAwarenessUpdate.bind(this));
      this.WebSocketPolyfill = extraOptions.WebSocketPolyfill || WebSocket;
      doc.on("update", this.update.bind(this));
      if (extraOptions.connect !== false) {
        this.connect();
      }
    }
    send(message) {
      var _a;
      if (((_a = this.websocket) == null ? void 0 : _a.readyState) === this.WebSocketPolyfill.OPEN) {
        this.websocket.send(message);
      }
    }
    updateSyncedState() {
      let hasLocalChanges = this.lastSyncAcked !== this.lastSyncSent;
      if (hasLocalChanges === this.hasLocalChanges) {
        return;
      }
      this.hasLocalChanges = hasLocalChanges;
      this.emit(EVENT_LOCAL_CHANGES, hasLocalChanges);
    }
    setStatus(status) {
      if (this.status === status) {
        return;
      }
      this.status = status;
      this.emit(EVENT_CONNECTION_STATUS, status);
    }
    update(update, origin) {
      if (origin !== this) {
        const encoder = createEncoder();
        writeVarUint(encoder, MESSAGE_SYNC);
        writeUpdate(encoder, update);
        this.send(toUint8Array(encoder));
        this.checkSync();
      }
    }
    checkSync() {
      this.lastSyncSent += 1;
      const encoder = createEncoder();
      writeVarUint(encoder, MESSAGE_SYNC_STATUS);
      const versionEncoder = createEncoder();
      writeVarUint(versionEncoder, this.lastSyncSent);
      writeVarUint8Array(encoder, toUint8Array(versionEncoder));
      this.send(toUint8Array(encoder));
      this.updateSyncedState();
    }
    async ensureClientToken() {
      if (this.clientToken) {
        return this.clientToken;
      }
      if (typeof this.authEndpoint === "string") {
        this.clientToken = await getClientToken(this.authEndpoint, this.docId);
        return this.clientToken;
      } else {
        this.clientToken = await this.authEndpoint();
        return this.clientToken;
      }
    }
    /**
     * Attempts to connect to the websocket.
     * Returns a promise that resolves to true if the connection was successful, or false if the connection failed.
     */
    attemptToConnect(clientToken) {
      let promise = new Promise((resolve) => {
        let statusListener = (event) => {
          if (event === STATUS_CONNECTED) {
            this.off(EVENT_CONNECTION_STATUS, statusListener);
            resolve(true);
          } else if (event === STATUS_ERROR) {
            this.off(EVENT_CONNECTION_STATUS, statusListener);
            resolve(false);
          }
        };
        this.on(EVENT_CONNECTION_STATUS, statusListener);
      });
      let url = this.generateUrl(clientToken);
      this.setStatus(STATUS_CONNECTING);
      const websocket = new (this.WebSocketPolyfill || WebSocket)(url);
      this.bindWebsocket(websocket);
      return promise;
    }
    async connect() {
      if (this.isConnecting) {
        console.warn("connect() called while a connect loop is already running.");
        return;
      }
      this.isConnecting = true;
      this.setStatus(STATUS_CONNECTING);
      while (![STATUS_OFFLINE, STATUS_CONNECTED].includes(this.status)) {
        this.setStatus(STATUS_CONNECTING);
        let clientToken;
        try {
          clientToken = await this.ensureClientToken();
        } catch (e) {
          console.warn("Failed to get client token", e);
          this.setStatus(STATUS_ERROR);
          await sleep(DELAY_MS_BEFORE_RETRY_TOKEN_REFRESH);
          continue;
        }
        for (let i = 0; i < RETRIES_BEFORE_TOKEN_REFRESH; i++) {
          if (await this.attemptToConnect(clientToken)) {
            break;
          }
          await sleep(DELAY_MS_BEFORE_RECONNECT);
        }
        this.clientToken = null;
      }
      this.isConnecting = false;
    }
    disconnect() {
      if (this.websocket) {
        this.websocket.close();
      }
      this.setStatus(STATUS_OFFLINE);
    }
    bindWebsocket(websocket) {
      if (this.websocket) {
        this.websocket.close();
        this.websocket.onopen = null;
        this.websocket.onmessage = null;
        this.websocket.onclose = null;
        this.websocket.onerror = null;
      }
      this.websocket = websocket;
      this.websocket.binaryType = "arraybuffer";
      this.websocket.onopen = this.websocketOpen.bind(this);
      this.websocket.onmessage = this.receiveMessage.bind(this);
      this.websocket.onclose = this.websocketClose.bind(this);
      this.websocket.onerror = this.websocketError.bind(this);
    }
    generateUrl(clientToken) {
      const url = clientToken.url + `/${clientToken.docId}`;
      if (clientToken.token) {
        return `${url}?token=${clientToken.token}`;
      }
      return url;
    }
    syncStep1() {
      const encoder = createEncoder();
      writeVarUint(encoder, MESSAGE_SYNC);
      writeSyncStep1(encoder, this.doc);
      this.send(toUint8Array(encoder));
    }
    receiveSyncMessage(decoder) {
      const encoder = createEncoder();
      writeVarUint(encoder, MESSAGE_SYNC);
      const syncMessageType = readSyncMessage(decoder, encoder, this.doc, this);
      if (syncMessageType === messageYjsSyncStep2) {
        this.setStatus(STATUS_CONNECTED);
      }
      if (length(encoder) > 1) {
        this.send(toUint8Array(encoder));
      }
    }
    queryAwareness() {
      const encoder = createEncoder();
      writeVarUint(encoder, MESSAGE_QUERY_AWARENESS);
      writeVarUint8Array(
        encoder,
        encodeAwarenessUpdate(
          this.awareness,
          Array.from(this.awareness.getStates().keys())
        )
      );
      this.send(toUint8Array(encoder));
    }
    broadcastAwareness() {
      if (this.awareness.getLocalState() !== null) {
        const encoderAwarenessState = createEncoder();
        writeVarUint(encoderAwarenessState, MESSAGE_AWARENESS);
        writeVarUint8Array(
          encoderAwarenessState,
          encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
        );
        this.send(toUint8Array(encoderAwarenessState));
      }
    }
    updateAwareness(decoder) {
      applyAwarenessUpdate(
        this.awareness,
        readVarUint8Array(decoder),
        this
      );
    }
    websocketOpen() {
      this.setStatus(STATUS_HANDSHAKING);
      this.syncStep1();
      this.checkSync();
      this.broadcastAwareness();
    }
    receiveMessage(event) {
      let message = new Uint8Array(event.data);
      const decoder = createDecoder(message);
      const messageType = readVarUint(decoder);
      switch (messageType) {
        case MESSAGE_SYNC:
          this.receiveSyncMessage(decoder);
          break;
        case MESSAGE_AWARENESS:
          this.updateAwareness(decoder);
          break;
        case MESSAGE_QUERY_AWARENESS:
          this.queryAwareness();
          break;
        case MESSAGE_SYNC_STATUS:
          let lastSyncBytes = readVarUint8Array(decoder);
          let d2 = createDecoder(lastSyncBytes);
          this.lastSyncAcked = readVarUint(d2);
          this.updateSyncedState();
          break;
      }
    }
    websocketClose(event) {
      this.emit(EVENT_CONNECTION_CLOSE, event);
      this.setStatus(STATUS_ERROR);
      this.connect();
      removeAwarenessStates(
        this.awareness,
        Array.from(this.awareness.getStates().keys()).filter(
          (client) => client !== this.doc.clientID
        ),
        this
      );
    }
    websocketError(event) {
      this.emit(EVENT_CONNECTION_ERROR, event);
      this.setStatus(STATUS_ERROR);
      this.connect();
    }
    emit(eventName, data = null) {
      const listeners = this.listeners.get(eventName) || /* @__PURE__ */ new Set();
      for (const listener of listeners) {
        listener(data);
      }
    }
    handleAwarenessUpdate({ added, updated, removed }, _origin) {
      var _a;
      const changedClients = added.concat(updated).concat(removed);
      const encoder = createEncoder();
      writeVarUint(encoder, MESSAGE_AWARENESS);
      writeVarUint8Array(
        encoder,
        encodeAwarenessUpdate(this.awareness, changedClients)
      );
      (_a = this.websocket) == null ? void 0 : _a.send(toUint8Array(encoder));
    }
    destroy() {
      if (this.websocket) {
        this.websocket.close();
      }
      removeAwarenessStates(this.awareness, [this.doc.clientID], "window unload");
    }
    _on(type, listener, once2) {
      var _a, _b;
      if (!this.listeners.has(type)) {
        this.listeners.set(type, /* @__PURE__ */ new Set());
      }
      if (once2) {
        let listenerOnce = (d) => {
          var _a2;
          listener(d);
          (_a2 = this.listeners.get(type)) == null ? void 0 : _a2.delete(listenerOnce);
        };
        (_a = this.listeners.get(type)) == null ? void 0 : _a.add(listenerOnce);
      } else {
        (_b = this.listeners.get(type)) == null ? void 0 : _b.add(listener);
      }
    }
    on(type, listener) {
      this._on(type, listener);
    }
    once(type, listener) {
      this._on(type, listener, true);
    }
    off(type, listener) {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(listener);
      }
    }
    /**
     * Whether the provider should attempt to connect.
     *
     * @deprecated use provider.status !== 'offline' instead, or call `provider.connect()` / `provider.disconnect()` to set.
     */
    get shouldConnect() {
      return this.status !== STATUS_OFFLINE;
    }
    /**
     * Whether the underlying websocket is connected.
     *
     * @deprecated use provider.status === 'connected' || provider.status === 'handshaking' instead.
     */
    get wsconnected() {
      return this.status === STATUS_CONNECTED || this.status === STATUS_HANDSHAKING;
    }
    /**
     * Whether the underlying websocket is connecting.
     *
     * @deprecated use provider.status === 'connecting' instead.
     */
    get wsconnecting() {
      return this.status === STATUS_CONNECTING;
    }
    /**
     * Whether the document is synced. (For compatibility with y-websocket.)
     *
     * @deprecated use provider.status === 'connected' instead.
     * */
    get synced() {
      return this.status === STATUS_CONNECTED;
    }
  };
  function createYjsProvider(doc, docId, authEndpoint, extraOptions = {}) {
    return new YSweetProvider2(authEndpoint, docId, doc, extraOptions);
  }
  const COLLECTION_KEYS = ["notes", "flashcards", "profiles"];
  const collectionKeys = COLLECTION_KEYS.map((key) => key);
  function loginOptionsToQueryParams({ collections: collections2, ...rest }) {
    const _collections = collections2.length === 0 ? "all" : collections2.length === 1 ? collections2[0] : collections2.join("|");
    const params = {
      collections: _collections,
      ...rest
    };
    return params;
  }
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
    return (room, ySweetUrl) => {
      const localLoaded = !!room && !!room.ydoc && !!room.indexedDbProvider;
      const ySweet = room.ySweetProvider;
      const shouldLoadYSweet = !!db.getToken() && db.useYSweet && !!(room == null ? void 0 : room.ySweetUrl) && (ySweet == null ? void 0 : ySweet.status) !== "connecting" && (ySweet == null ? void 0 : ySweet.status) !== "handshaking";
      const ySweetLoaded = ySweetUrl && ySweet && room.ySweetUrl === ySweetUrl && ySweet.status === "connected";
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
  async function loadYSweet(db, room, withAwareness = true, awaitConnection = false, maxWait = 1e4) {
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
    async function pollForYSweetConnectionAndAwait() {
      let waited = 0;
      return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
          var _a;
          if (((_a = room.ySweetProvider) == null ? void 0 : _a.status) === "connected") {
            clearInterval(poll);
            resolve();
          } else {
            waited += 1e3;
            if (waited >= maxWait) {
              clearInterval(poll);
              reject(new Error("timed out waiting for ySweet connection"));
            }
          }
        }, 1e3);
      });
    }
    async function checkTokenAndConnectProvider(withAwareness2 = true) {
      emitConnectionChange("connecting");
      room.ySweetProvider = createYjsProvider(
        room.ydoc,
        room.id,
        async () => {
          const refreshed = await db.refreshYSweetToken(room);
          db.debug(
            "refreshed token. success: ",
            (refreshed == null ? void 0 : refreshed.ySweetUrl) && refreshed.tokenExpiry
          );
          if ((refreshed == null ? void 0 : refreshed.ySweetUrl) && refreshed.tokenExpiry && refreshed.ySweetBaseUrl) {
            room.tokenExpiry = refreshed.tokenExpiry;
            room.ySweetUrl = refreshed.ySweetUrl;
            room.ySweetBaseUrl = refreshed.ySweetBaseUrl;
            return {
              url: refreshed.ySweetUrl,
              baseUrl: refreshed.ySweetBaseUrl,
              docId: room.id
            };
          } else {
            throw new Error("No ySweetUrl found");
          }
        },
        withAwareness2 ? { awareness: new Awareness(room.ydoc) } : {}
      );
      room.ySweetProvider.on("status", handleStatusChange);
      room.ySweetProvider.on("sync", handleSync);
      room.ySweetProvider.on("connection-error", handleConnectionError);
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
    if (awaitConnection) {
      try {
        await pollForYSweetConnectionAndAwait();
      } catch (e) {
        db.error(e);
      }
    }
    db.emit("roomRemoteLoaded", room);
  }
  const loadRoom = (db) => async (serverRoom, remoteLoadOptions) => {
    const loadRemote = (remoteLoadOptions == null ? void 0 : remoteLoadOptions.loadRemote) ?? true;
    const awaitLoadRemote = (remoteLoadOptions == null ? void 0 : remoteLoadOptions.awaitLoadRemote) ?? true;
    const loadRemoteMaxWait = (remoteLoadOptions == null ? void 0 : remoteLoadOptions.loadRemoteMaxWait) ?? 1e4;
    const withAwareness = (remoteLoadOptions == null ? void 0 : remoteLoadOptions.withAwareness) ?? false;
    const { roomId, collectionKey } = validate(serverRoom);
    const room = db.collections[collectionKey][roomId] ?? new Room({ db, ...serverRoom });
    db.info("loading room", { room, serverRoom });
    const { localLoaded, ySweetLoaded, shouldLoadYSweet } = checkLoadedState(
      db
    )(room, serverRoom.ySweetUrl);
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
    if (loadRemote && shouldLoadYSweet && !ySweetLoaded) {
      if (awaitLoadRemote) {
        await loadYSweet(db, room, withAwareness, true, loadRemoteMaxWait);
      } else {
        loadYSweet(db, room, withAwareness, false);
      }
    }
    db.collections[collectionKey][roomId] = room;
    db.emit("roomLoaded", room);
    return room;
  };
  class Room extends TypedEventEmitter {
    constructor(options) {
      super();
      __publicField(this, "db");
      __publicField(this, "name");
      __publicField(this, "collectionKey");
      __publicField(this, "id");
      __publicField(this, "tokenExpiry");
      __publicField(this, "ySweetUrl");
      __publicField(this, "ySweetBaseUrl");
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
      __publicField(this, "load");
      __publicField(this, "addingAwareness", false);
      /** disconnect and reconnect the existing ySweetProvider, this time with awareness on */
      __publicField(this, "addAwareness", async () => {
        var _a, _b, _c;
        if (this.addingAwareness || ((_a = this.ySweetProvider) == null ? void 0 : _a.awareness)) {
          return;
        }
        this.addingAwareness = true;
        (_b = this.ySweetProvider) == null ? void 0 : _b.disconnect();
        (_c = this.ySweetProvider) == null ? void 0 : _c.destroy();
        this.ySweetProvider = null;
        await loadYSweet(this.db, this, true, true);
        this.addingAwareness = false;
      });
      this.db = options.db;
      this.name = options.name;
      this.collectionKey = options.collectionKey;
      this.id = options.id || crypto.randomUUID();
      this.tokenExpiry = options.tokenExpiry ?? null;
      this.ySweetUrl = options.ySweetUrl ?? null;
      this.ySweetBaseUrl = options.ySweetBaseUrl ?? null;
      this.publicAccess = options.publicAccess ?? "private";
      this.readAccess = options.readAccess ?? [];
      this.writeAccess = options.writeAccess ?? [];
      this.adminAccess = options.adminAccess ?? [];
      this.createdAt = options.createdAt ?? (/* @__PURE__ */ new Date()).toISOString();
      this.updatedAt = options.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
      this._deleted = options._deleted ?? false;
      this._ttl = options._ttl ?? null;
      if (options.indexedDbProvider) {
        this.indexedDbProvider = options.indexedDbProvider;
      }
      if (options.webRtcProvider) {
        this.webRtcProvider = options.webRtcProvider;
      }
      if (options.ySweetProvider) {
        this.ySweetProvider = options.ySweetProvider;
      }
      if (options.ydoc) {
        this.ydoc = options.ydoc;
      }
      this.getDocuments = () => getDocuments(this.db)(this);
      this.load = () => this.db.loadRoom(this);
    }
  }
  function roomToServerRoom(room) {
    return {
      id: room.id,
      name: room.name,
      collectionKey: room.collectionKey,
      tokenExpiry: room.tokenExpiry,
      ySweetUrl: room.ySweetUrl,
      ySweetBaseUrl: room.ySweetBaseUrl,
      publicAccess: room.publicAccess,
      readAccess: room.readAccess,
      writeAccess: room.writeAccess,
      adminAccess: room.adminAccess,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      _deleted: room._deleted,
      _ttl: room._ttl
    };
  }
  const collections = {
    notes: {},
    flashcards: {},
    profiles: {}
  };
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
    if (level >= db.logLevel) {
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
      const params = loginOptionsToQueryParams({
        redirect: (options == null ? void 0 : options.redirect) || window.location.href.split("?")[0],
        domain: (options == null ? void 0 : options.domain) || window.location.host,
        collections: (options == null ? void 0 : options.collections) ?? ["all"],
        name: options.name
      });
      Object.entries(params).forEach(([key, value]) => {
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
      const urlToken = db.getAccessGrantTokenFromUrl();
      if (urlToken) {
        db.accessGrantToken = urlToken;
        return urlToken;
      }
      if (db.accessGrantToken) {
        return db.accessGrantToken;
      }
      const savedToken = getLocalAccessGrantToken(db)();
      if (savedToken) {
        db.accessGrantToken = savedToken;
        return savedToken;
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
      const { rooms, token, userId } = syncResult ?? {};
      if (userId && typeof userId === "string") {
        db.debug("setting new userId", userId);
        db.userId = userId;
      }
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
  const loadRooms = (db) => async (rooms, staggerMs = 1e3) => {
    const loadedRooms = [];
    db.debug("loading rooms", rooms);
    for (const room of rooms) {
      const loadedRoom = await db.loadRoom(room, { loadRemote: false });
      loadedRooms.push(loadedRoom);
    }
    db.debug("loaded rooms", loadedRooms);
    db.emit("roomsLoaded", loadedRooms);
    const remoteLoadedRooms = [];
    for (const room of rooms) {
      await new Promise((resolve) => setTimeout(resolve, staggerMs));
      const remoteLoadedRoom = await db.loadRoom(room, { loadRemote: true });
      remoteLoadedRooms.push(remoteLoadedRoom);
    }
    db.debug("loaded remotes for rooms", remoteLoadedRooms);
    db.emit("roomsRemotesLoaded", remoteLoadedRooms);
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
  const newRoom = (db) => (
    /**
     * new rooms must be added to the registry and then synced with the auth server
     * Note: If your app does not have access privileges to the collection, the room won't be synced server-side.
     */
    (options) => {
      const room = new Room({ db, ...options });
      db.debug("new room", room);
      db.collections[options.collectionKey][room.id] = room;
      const registryRoom = roomToServerRoom(room);
      db.registry.push(registryRoom);
      setLocalRegistry(db)(db.registry);
      db.loadRoom(room);
      if (db.online) {
        db.syncRegistry();
      }
      return room;
    }
  );
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
      /** first loads the local indexedDB ydoc for the room. if this.useYSweet is true and ySweetTokens are available will also connect to remote.
       * @param {RemoteLoadOptions} RemoteLoadOptions - options for loading the remote ydoc
       */
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
      __publicField(this, "newRoom", newRoom(this));
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
          if (room.id && registryRoomIds.includes(room.id)) {
            continue;
          }
          const registryRoom = roomToServerRoom(this.newRoom(room));
          this.registry.push(registryRoom);
        }
      }
      this.loadRooms(this.registry);
    }
    getRooms(collectionKey) {
      return Object.values(this.collections[collectionKey]);
    }
  }
  exports2.Database = Database;
  exports2.buildRef = buildRef;
  exports2.collections = collections;
  exports2.getRoom = getRoom;
  exports2.getRoomDocuments = getRoomDocuments;
  exports2.newDocument = newDocument;
  exports2.randomString = randomString;
  exports2.wait = wait$1;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
