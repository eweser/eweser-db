"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedEventEmitter = exports.collections = void 0;
const events_1 = require("events");
exports.collections = {
    notes: {},
    flashcards: {},
    profiles: {},
};
class TypedEventEmitter extends events_1.EventEmitter {
    on(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
}
exports.TypedEventEmitter = TypedEventEmitter;
//# sourceMappingURL=types.js.map