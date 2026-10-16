"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const config_js_1 = require("./config.js");
const server_js_1 = require("./server.js");
(0, v2_1.setGlobalOptions)({ region: config_js_1.config.region, maxInstances: 10 });
/** One HTTP function hosts the whole Express API (modular monolith). */
exports.api = (0, https_1.onRequest)({ cors: true }, server_js_1.app);
