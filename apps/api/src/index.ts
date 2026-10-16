import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { config } from './config.js';
import { app } from './server.js';

setGlobalOptions({ region: config.region, maxInstances: 10 });

/** One HTTP function hosts the whole Express API (modular monolith). */
export const api = onRequest({ cors: true }, app);
