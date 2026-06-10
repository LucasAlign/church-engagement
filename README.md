# KeyFam1 — Church Engagement Dashboard

Ministry CRM module for Keystone Family Alliance county coordinators. React
frontend with an optional Supabase backend: without configuration it runs in
demo mode on bundled sample data; with Supabase connected, all edits persist
for everyone.

## Run it

```sh
npm install
npm run dev
```

Without Supabase configured the app shows a "Demo mode" banner and changes
are lost on reload.

## Connect Supabase (persistent storage)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor → New query**, paste the
   contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. Grab your **Project URL** and **anon public key** from
   **Project Settings → API**.
4. For local dev: copy `.env.example` to `.env.local` and fill in both values.
5. For Vercel: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under
   **Project Settings → Environment Variables**, then redeploy.

On its first load against an empty database the app seeds the bundled sample
data automatically. From then on, every edit made in the UI (churches,
contacts, interactions, tasks, giving, notes, imports, …) is written through
to Supabase and shared by all visitors.

> **Security note:** the app has no login yet, so the schema's RLS policies
> allow anyone holding the anon key (i.e. anyone who can open the site) to
> read and write all data. Add Supabase Auth and tighten the policies before
> storing anything sensitive.

## Structure

```
src/
  data/
    db.js          in-memory data model + bundled sample data
    backend.js     Supabase persistence (hydrate on load, write-through saves)
    helpers.js     derived values and mutations over the in-memory db
    labels.js      enum → display label/badge-variant maps, formatters
    store.jsx      change-notification layer + backend init/status
    transfer.js    CSV/Excel export and import
  components/
    layout.jsx     AppShell, Sidebar, Header, backend status banner
    shared.jsx     Badge, MetricCard, DataTable bits, SearchBar, FilterPills,
                   CSSBarChart, AvatarInitials, EmptyState, Modal
    LogInteractionModal.jsx
  pages/           Dashboard, Churches, ChurchProfile (7 tabs), Interactions,
                   FollowUps, Giving, ImpactReports, Analytics, Settings
  styles.css       KeyFam1 design system (matches Wraparound Admin module)
supabase/
  schema.sql       table + RLS policy setup, run once in the SQL Editor
```

## Notes

- Each collection is stored in Supabase as a `(id text primary key, data jsonb)`
  table, so the document shapes in `db.js` stay the source of truth.
- Saves are fire-and-forget upserts; the UI updates instantly from the
  in-memory copy and failures are logged to the browser console.
- `TODAY` in `helpers.js` is the real current date; year/month rollups on the
  Dashboard and Giving pages derive from it.
