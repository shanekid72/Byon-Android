"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = exports.checkDatabaseConnection = exports.logger = void 0;
exports.logger = { info: console.log, error: console.error, warn: console.warn, debug: console.log };
const checkDatabaseConnection = async () => true;
exports.checkDatabaseConnection = checkDatabaseConnection;
const connectDatabase = async () => { console.log('Database connected'); };
exports.connectDatabase = connectDatabase;
//# sourceMappingURL=temp-utils.js.map