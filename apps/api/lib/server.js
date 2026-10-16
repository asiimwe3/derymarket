"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const accounts_js_1 = require("./modules/accounts.js");
const listings_js_1 = require("./modules/listings.js");
const config_js_1 = require("./config.js");
/** The Express app — mounted on one Cloud Function. */
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'derymarket-api', ts: Date.now() }));
app.use(`${config_js_1.config.apiPrefix}/accounts`, accounts_js_1.accountsRouter);
app.use(`${config_js_1.config.apiPrefix}/listings`, listings_js_1.listingsRouter);
app.use((_req, res) => res.status(404).json({ error: 'route_not_found' }));
app.use((err, _req, res, _next) => {
    const status = typeof err === 'object' && err && 'status' in err ? Number(err.status) : 500;
    const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : 'internal_error';
    const message = err instanceof Error ? err.message : 'Something broke on our side.';
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: code, message });
});
