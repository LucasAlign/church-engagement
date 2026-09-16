import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDatabase } from './database.js';
import { createAuthMiddleware } from './security.js';

const port = Number(process.env.PORT || 3000);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const database = createDatabase();
await database.initialize();

const server = createApp(database, { staticRoot: path.join(root, 'dist'), auth: createAuthMiddleware() })
  .listen(port, '0.0.0.0', () => console.log(`Engage listening on port ${port}`));

const shutdown = () => server.close(async () => { await database.close(); process.exit(0); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
