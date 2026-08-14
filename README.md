# Flock — Church Engagement CRM

React/Vite frontend with an Express API and Replit-managed PostgreSQL backend.
The browser keeps a synchronous in-memory cache for fast UI updates; every
mutation writes through to the API and failed saves appear in the UI with a
Retry action.

## Local frontend demo

```sh
npm install
npm run dev
```

Demo mode does not persist changes. To exercise the full stack locally, create
a PostgreSQL database, copy `.env.example` to `.env.local`, and run:

```sh
npm run dev:full
```

## Replit setup

1. Import this GitHub repository into Replit.
2. Add a PostgreSQL database from the Database tool. Replit supplies
   `DATABASE_URL` to the development and production environments.
3. Run `npm run dev:full` during development.
4. Publish as an Autoscale deployment with:
   - Build command: `npm run build`
   - Run command: `npm start`
5. In Replit Agent, request: `Add Replit Auth and protect every /api route.`
   Replit Auth is provisioned by Agent and cannot be configured manually.

The server creates the `records` table and index automatically. Each record is
stored as JSONB under a `(collection, id)` primary key, preserving the existing
frontend data model.

## Commands

```sh
npm run dev          # frontend demo
npm run dev:server   # API only (requires DATABASE_URL)
npm run dev:full     # frontend + API
npm run check        # regression tests + production build
npm start            # serve API and built frontend
```

To remove every persisted application record while preserving the schema:

```sh
CONFIRM_WIPE=WIPE_FLOCK_DATA npm run db:wipe
```

Run that command once in the Replit Shell before importing replacement data.
The bundled `berks-county-churches.csv` import source is not deleted.

## Structure

```text
server/
  index.js       Express entry point and static production hosting
  database.js    PostgreSQL repository and schema initialization
src/
  data/
    db.js        in-memory client cache
    backend.js   API hydration and write-through persistence
    helpers.js   queries and mutations
  components/    shared UI and forms
  pages/         dashboard, profiles, analytics, settings
```

## Security

Do not publish the API without authentication. Replit Auth must be provisioned
inside Replit and enforced server-side on every `/api` route. Never expose
`DATABASE_URL` or connect to PostgreSQL directly from browser code.
