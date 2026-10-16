"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
/** Central config. Cloud Functions injects most of this automatically. */
exports.config = {
    region: 'europe-west1', // close to Uganda, cheaper than us-central
    apiPrefix: '/api/v1',
    pageSizeDefault: 20,
    pageSizeMax: 50,
};
