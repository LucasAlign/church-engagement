import express from 'express';
import path from 'node:path';
import { COLLECTIONS } from './database.js';

export function createApp(database, { staticRoot } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_request, response) => response.json({ ok: true }));
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
      if (!request.body?.data || request.body.data.id !== id) {
        return response.status(400).json({ error: 'Record body and URL id must match' });
      }
      await database.upsert(collection, id, request.body.data);
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
    console.error(error);
    response.status(500).json({ error: 'Database request failed', code: error.code || null });
  });
  return app;
}
