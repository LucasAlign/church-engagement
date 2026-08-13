# Engage — Church Engagement Dashboard

Ministry CRM module for Keystone Family Alliance county coordinators.
React/Vite frontend backed by an Express API and Postgres.

## Run it

```sh
npm install
npm run dev
```

Runs the Vite dev server (port 5000) and the Express API (port 3001,
proxied through `/api`) together.

For a single-process production run (serves the built frontend + API on one
port):

```sh
npm run build
npm start
```

## Structure

```
server/
  index.js       Express API — GET /api/db, POST /api/interactions,
                 POST /api/notes, PATCH /api/tasks/:id/toggle
  db.js          Postgres connection pool
  transform.js   snake_case rows -> camelCase shapes the frontend expects
src/
  data/
    db.js          shared client-side cache, populated from GET /api/db
    helpers.js     derived values + mutations (persist via the API)
    labels.js      enum → display label/badge-variant maps, formatters
    store.jsx      fetches /api/db on load; change-notification layer over db
  components/
    layout.jsx     AppShell, Sidebar, Header
    shared.jsx     Badge, MetricCard, DataTable bits, SearchBar, FilterPills,
                   CSSBarChart, AvatarInitials, EmptyState, Modal
    LogInteractionModal.jsx
  pages/           Dashboard, Churches, ChurchProfile (7 tabs), Interactions,
                   FollowUps, Giving, ImpactReports, Analytics, Settings
  styles.css       Engage design system (matches Wraparound Admin module)
```

## Notes

- Log Interaction, Add Note, and task checkboxes write through to Postgres
  and re-render live.
- `DATABASE_URL` (and the other `PG*` vars) are provided by Replit's
  built-in Postgres — no manual configuration needed.
