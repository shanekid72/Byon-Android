"use strict";
// Build System Type Definitions
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildError = exports.BuildStatus = void 0;
/**
 * Build status enum
 */
var BuildStatus;
(function (BuildStatus) {
    BuildStatus["QUEUED"] = "queued";
    BuildStatus["RUNNING"] = "running";
    BuildStatus["COMPLETED"] = "completed";
    BuildStatus["FAILED"] = "failed";
    BuildStatus["CANCELLED"] = "cancelled";
})(BuildStatus || (exports.BuildStatus = BuildStatus = {}));
// Error Types
class BuildError extends Error {
    code;
    buildId;
    stage;
    details;
    constructor(message, code, buildId, stage, details) {
        super(message);
        this.name = 'BuildError';
        this.code = code;
        this.buildId = buildId;
        this.stage = stage;
        this.details = details;
    }
}
exports.BuildError = BuildError;
//# sourceMappingURL=build.types.js.map