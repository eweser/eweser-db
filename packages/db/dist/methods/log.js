"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const log = (db) => (level, ...message) => {
    if (level >= db.logLevel) {
        db.emit('log', level, ...message);
    }
};
exports.log = log;
//# sourceMappingURL=log.js.map