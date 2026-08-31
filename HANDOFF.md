# Flock — Current Handoff

Flock is a React/Vite church engagement CRM backed by an Express API and
Replit-managed PostgreSQL.

## Current architecture

- `src/data/db.js`: synchronous browser-side cache
- `src/data/backend.js`: hydration and write-through API client
- `server/index.js`: Express API and production static hosting
- `server/database.js`: PostgreSQL schema and repository
- `test-data.mjs`: data-layer regression coverage
- `test-transfer.mjs`: spreadsheet import/export regression coverage

The API stores JSONB records in one `records` table keyed by collection and ID.
The UI updates optimistically; persistence errors appear in a banner with Retry
and Dismiss actions.

## Replit deployment

1. Add a PostgreSQL database so Replit provides `DATABASE_URL`.
2. Run `npm run dev:full` for development.
3. Build with `npm run build` and serve with `npm start`.
4. Provision Replit Auth through Replit Agent and require authentication on
   every `/api` endpoint before publishing.

See `README.md` and `replit.md` for complete setup details.
