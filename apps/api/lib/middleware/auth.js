"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = requireUser;
const auth_1 = require("firebase-admin/auth");
const errors_js_1 = require("./errors.js");
/**
 * HABIT 1 (authorize). Clients send their Firebase ID token:
 *   Authorization: Bearer <idToken>
 * The API verifies the signature cryptographically — never trusts the token's
 * contents without verifying it. 401 = bad/missing token, 403 = valid token,
 * wrong permission (checked later per-route).
 */
async function requireUser(req, _res, next) {
    try {
        const header = req.headers.authorization ?? '';
        if (!header.startsWith('Bearer '))
            throw new errors_js_1.ApiError(401, 'no_token', 'Sign in first (missing Bearer token).');
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(header.slice(7));
        req.user = { uid: decoded.uid, phone: decoded.phone_number };
        next();
    }
    catch (e) {
        if (e instanceof errors_js_1.ApiError)
            return next(e);
        next(new errors_js_1.ApiError(401, 'invalid_token', 'Sign-in token is invalid or expired — sign in again.'));
    }
}
