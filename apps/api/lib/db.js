"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldValue = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
/** The Admin SDK — server-side only, bypasses security rules. Never ship to a client. */
(0, app_1.initializeApp)();
exports.db = (0, firestore_1.getFirestore)();
