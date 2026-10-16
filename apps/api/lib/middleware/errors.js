"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.ApiError = void 0;
/** Typed error with an HTTP status — how endpoints say "your fault" (400) vs "mine" (500). */
class ApiError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
exports.ApiError = ApiError;
/** Wraps async routes so thrown errors land in one error handler instead of hanging the request. */
const asyncHandler = (fn) => (req, res, next) => {
    fn(req, res, next).catch(next);
};
exports.asyncHandler = asyncHandler;
