import express from 'express';
import path from 'node:path';
import compression from 'compression';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { COLLECTIONS } from './database.js';
import { createAuthMiddleware, validateRecord } from './security.js';

/** @param {any} database @param {{ staticRoot?: string, auth?: Function }} [options] */
export function createApp(database, { staticRoot, auth = createAuthMiddleware() } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.use(pinoHttp());
  app.use(helmet({ contentSecurityPolicy: { directives: { imgSrc: ["'self'", 'data:'] } } }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_request, response) => response.json({ ok: true }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api', auth);
  app.get('/api/data', async (_request, response, next) => {
    try {
      response.json(await database.readAll());
    } catch (error) {
      next(error);
    }
  });
  app.put('/api/data/:collection/:id', async (request, response, next) => {
    try {
      const { collection, id } = request.params;
      if (!COLLECTIONS.has(collection)) return response.status(404).json({ error: 'Unknown collection' });
      const validation = validateRecord(collection, id, request.body?.data);
      if (!validation.ok) return response.status(400).json({ error: validation.error });
      await database.upsert(collection, id, validation.data);
      return response.status(204).end();
    } catch (error) {
      return next(error);
    }
  });
  app.delete('/api/data/:collection/:id', async (request, response, next) => {
    try {
      const { collection, id } = request.params;
      if (!COLLECTIONS.has(collection)) return response.status(404).json({ error: 'Unknown collection' });
      await database.delete(collection, id);
      return response.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  if (staticRoot) {
    app.use(express.static(staticRoot));
    app.get('*path', (_request, response) => response.sendFile(path.join(staticRoot, 'index.html')));
  }

  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && /** @type {any} */ (error).status === 400) {
      return response.status(400).json({ error: 'Malformed JSON request' });
    }
    console.error(error);
    response.status(500).json({ error: 'Database request failed' });
  });
  return app;
}
