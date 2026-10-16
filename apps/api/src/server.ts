import express from 'express';
import { accountsRouter } from './modules/accounts.js';
import { listingsRouter } from './modules/listings.js';
import { config } from './config.js';

/** The Express app — mounted on one Cloud Function. */
const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'derymarket-api', ts: Date.now() }));

app.use(`${config.apiPrefix}/accounts`, accountsRouter);
app.use(`${config.apiPrefix}/listings`, listingsRouter);

app.use((_req: express.Request, res: express.Response) => res.status(404).json({ error: 'route_not_found' }));
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status: unknown }).status) : 500;
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : 'internal_error';
  const message = err instanceof Error ? err.message : 'Something broke on our side.';
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: code, message });
});

export { app };
