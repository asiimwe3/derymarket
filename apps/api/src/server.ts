import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorMiddleware } from './middleware/errors.js';
import { accountsRouter } from './modules/accounts.js';
import { listingsRouter } from './modules/listings.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' })); // parse JSON bodies BEFORE routes

// ── routes: /api/v1/<resource> — version the API from day one ──
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/listings', listingsRouter);

// health check: what load balancers and uptime monitors watch
app.get('/health', (_req, res) => res.json({ ok: true, name: 'derymarket-api', version: '0.1.0' }));

// your Lesson 1 goes HERE: add GET /api/v1/listings/:id (single listing
// with 404 handling) by following the pattern in modules/listings.ts.

app.use(errorMiddleware); // ALWAYS last: it turns thrown errors into responses

app.listen(config.port, () => console.log(`DeryMarket API listening on :${config.port}`));
