# KeyFam1 — Church Engagement Dashboard

Ministry CRM module for Keystone Family Alliance county coordinators. Frontend
prototype with an in-memory mock database designed for drop-in replacement
with Supabase/Postgres.

## Run it

```sh
npm install
npm run dev
```

## Structure

```
src/
  data/
    db.js          mock in-memory database (1:1 with future Postgres tables)
    helpers.js     derived values — replace with Supabase queries/views later
    labels.js      enum → display label/badge-variant maps, formatters
    store.jsx      change-notification layer over the mock db
  components/
    layout.jsx     AppShell, Sidebar, Header
    shared.jsx     Badge, MetricCard, DataTable bits, SearchBar, FilterPills,
                   CSSBarChart, AvatarInitials, EmptyState, Modal
    LogInteractionModal.jsx
  pages/           Dashboard, Churches, ChurchProfile (7 tabs), Interactions,
                   FollowUps, Giving, ImpactReports, Analytics, Settings
  styles.css       KeyFam1 design system (matches Wraparound Admin module)
```

## Notes

- All dates are pinned to `2026-06-09` (`TODAY` in `helpers.js`) so the
  prototype renders deterministically.
- Log Interaction, Add Note, and task checkboxes mutate the in-memory db and
  re-render live; state resets on page reload.
- See the master build prompt for the Supabase replacement guide
  (camelCase → snake_case happens in a single transform layer).
