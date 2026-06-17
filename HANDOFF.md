# Flock — Church Engagement CRM
## Handoff Document

**Project:** Flock  
**Client:** Mary Jo Lucas, Berks County Coordinator, Keystone Family Alliance  
**Repo:** `LucasAlign/church-engagement`  
**Dev branch:** `claude/zealous-cerf-ev0f8d`  
**Build status:** ✅ Clean (`vite build` — 237 kB JS, 20 kB CSS)

---

## What Was Built

Flock is a church relationship management tool for tracking churches, staff, notable congregants, interactions, follow-ups, giving, and ministry engagement across Berks County, PA.

### Pages

| Route | Description |
|---|---|
| `/` | Dashboard — Directory stats widget, Prayer Spotlight, Database search, To-Do |
| `/churches` | Church list — table + card views, status filter, search |
| `/churches/:id` | Church profile — tabbed (Overview, Staff, Notable Congregants, Timeline, Ministry, Giving, Notes, Tasks) |
| `/interactions` | Interaction log |
| `/follow-ups` | Task/follow-up tracker |
| `/giving` | Giving records |
| `/reports` | Impact reports |
| `/analytics` | Analytics |
| `/settings` | Settings |
| `/import` | CSV import (drag-and-drop, preview, bulk import) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Routing | React Router v6 (HashRouter — required for Vercel static deploy) |
| Build | Vite 5 |
| Icons | @tabler/icons-react |
| Styling | Plain CSS with custom properties (no CSS framework) |
| Data | In-memory mock db (`src/data/db.js`) — shaped for Supabase migration |

---

## Key Files

```
src/
  App.jsx                  — Routes
  components/
    layout.jsx             — FlockLogo, TopNav, Header, AppShell
    shared.jsx             — Badge, SearchBar, FilterPills, AvatarInitials,
                             EmptyState, ContactDot
  data/
    db.js                  — In-memory collections (replace with Supabase)
    helpers.js             — All derived queries + mutation helpers
    labels.js              — Display labels, badge variants, status maps
  pages/
    Dashboard.jsx          — Overview page
    Churches.jsx           — Church list
    ChurchProfile.jsx      — Church detail (tabs)
    Import.jsx             — CSV import flow
    Interactions.jsx
    FollowUps.jsx
    Giving.jsx
    ImpactReports.jsx
    Analytics.jsx
    Settings.jsx
  styles.css               — Full design system

berks-county-churches.csv  — 141 Berks County churches, ready to import
```

---

## Data Model

All collections live in `src/data/db.js`. Each maps 1:1 to a future Supabase table.

### `churches`
```js
{
  id, name, address, city, state, zip,
  phone, email, website, denomination,
  attendanceMin, attendanceMax,
  engagementStatus,       // 'not_contacted' | 'initial_contact' | 'interested'
                          // | 'active_partner' | 'strategic_partner' | 'dormant'
  lastInteractionDate,    // ISO date string
  firstContactDate,
  assignedCoordinatorId,  // → users.id
  notes,
}
```

### `contacts` (staff / pastors)
```js
{ id, churchId, name, title, role, kfaRole, email, phone, archived, createdAt }
```

### `notableCongregants`
```js
{ id, churchId, name, title, category, email, phone, notes, lastContactDate, createdAt }
// categories: business | political | community | media | education | healthcare | other
```

### `interactions`
```js
{ id, churchId, contactId, type, date, userId, notes, attendeeCount }
```

### `tasks`
```js
{ id, churchId, title, dueDate, status, assignedTo, notes }
// status: 'open' | 'in_progress' | 'completed' | 'overdue'
```

### `givingRecords`
```js
{ id, churchId, date, amount, type, notes }
```

### `ministryEngagements`
```js
{ id, churchId, ministry, status, startDate, notes }
```

### `churchNotes`
```js
{ id, churchId, body, authorId, pinned, internalOnly, createdAt }
```

### `users`
```js
{ id, name, role, email, county, initials }
```

---

## Contact Freshness System

Every church and contact shows a color dot:

- 🟢 **Green** — contacted within the last 90 days
- 🔴 **Red** — not contacted in 90+ days, or never contacted

Implemented via `contactStatus(dateStr)` in `helpers.js` and the `<ContactDot>` component in `shared.jsx`. Appears on the Dashboard database widget, the Churches list (table + cards), and church profile Staff/Congregants tabs.

---

## CSV Import

Drag-and-drop any CSV at `/import` (or click "Import CSV" on the Churches page).

**Expected columns** (matches `berks-county-churches.csv`):

```
name, address, city, state, zip, phone, email, website, denomination,
lead_pastor, other_staff, attendance_min, attendance_max,
engagement_status, notes
```

- `lead_pastor` → creates one contact record (role: `pastor`)
- `other_staff` → semicolon-separated; creates one contact record per name (role: `staff`)
- `engagement_status` must match a valid key or defaults to `not_contacted`

The 141-church CSV (`berks-county-churches.csv`) in the repo root is pre-formatted for this importer.

---

## Deployment (Vercel)

The app is deployed as a **static site** on Vercel. To redeploy after pulling latest changes:

```powershell
npm run build
npx vercel --prod
```

> **Important:** `vite.config.js` must NOT have a `base` option set. The HashRouter (`#/`) handles all client-side routing without server config.

---

## Migrating to Supabase

Each collection in `db.js` corresponds to a Supabase table. Migration path:

1. Create tables in Supabase matching the schemas above.
2. Replace each helper function in `helpers.js` with a `supabase.from('table').select(...)` call.
3. Replace mutation helpers (`addInteraction`, `addNote`, `importChurches`, etc.) with `supabase.from('table').insert(...)`.
4. Add Supabase auth to gate the app to KFA coordinators.
5. Remove `db.js` entirely.

The UI and routing require zero changes — all data access is already isolated in `helpers.js`.

---

## Outstanding / Not Yet Built

- **Add Church form** — "Add church" button exists but has no form behind it
- **Add Staff form** — Staff tab shows staff but no add UI
- **Prayer Spotlight widget** — placeholder only
- **To-Do widget** — placeholder only
- **Real auth** — currently no login; anyone with the URL can access
- **Supabase backend** — all data is in-memory and resets on page refresh
- **Interaction log form** — log entry exists but no create UI on the Interactions page
- **Giving entry form** — same
- **Reports upload** — placeholder
