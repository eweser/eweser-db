"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLogger = exports.TypedEventEmitter = void 0;
const events_1 = require("events");
class TypedEventEmitter extends events_1.EventEmitter {
    on(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
}
exports.TypedEventEmitter = TypedEventEmitter;
const setupLogger = (db) => {
    db.on('log', (level, ...message) => {
        switch (level) {
            case 0:
                // eslint-disable-next-line no-console
                return console.info(...message);
            case 1:
                // eslint-disable-next-line no-console
                return console.log(...message);
            case 2:
                // eslint-disable-next-line no-console
                return console.warn(...message);
            case 3:
                // eslint-disable-next-line no-console
                return console.error(...message);
        }
    });
};
exports.setupLogger = setupLogger;
//# sourceMappingURL=events.js.map