# Handoff: porting claude/fervent-cannon-gcebg2 into this Replit project

Picking up a port that's roughly **60% done**. This doc has everything needed
to finish it without re-deriving context. Read it fully before touching code.

## What this project is

`Engage` (repo name `LucasAlign/church-engagement` on GitHub, `origin` remote)
is a church-engagement CRM. It was originally a Vite+React static app on
Vercel, backed by a mock in-memory `db.js`. It's being run on Replit now,
with Replit's built-in Postgres as the real database and a small Express
server providing the API.

Partway through getting it running, the user pointed out that GitHub has a
much newer branch — `origin/claude/fervent-cannon-gcebg2` — with a
near-total rewrite of the frontend, and asked for **that exact branch**
(not `main`, which is one commit further) to be ported in on top of the
Postgres+Express backend already built here (not the Supabase backend that
branch actually uses). That port is in progress; this doc says exactly
where it stopped and what's left.

## Environment facts (Replit-specific, don't relitigate these)

- **Database**: Replit's built-in Postgres. `DATABASE_URL`, `PGHOST`,
  `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` are already in the
  environment — no setup needed. Use `psql "$DATABASE_URL"` directly, or
  `pg` from Node. There is no Supabase project in play for this Replit
  copy — the `.env`/`.env.example` on the source branch reference a real
  external Supabase project and must **not** be copied in.
- **One process, one port.** `server/index.js` is a single Express server
  that in dev mode mounts Vite as middleware (`vite`'s `createServer` with
  `middlewareMode: true`) and in production serves the built `dist/`
  static files — both on the **same port**, `process.env.PORT || 5000`,
  bound to `0.0.0.0`. This was hard-won: Replit's port-forwarder auto-picks
  a "primary" port from whatever's open, and when this app briefly ran two
  ports (Vite dev server + a separate API server), the forwarder kept
  routing external traffic to the wrong one, breaking the preview. Do not
  reintroduce a second port. If you touch the Vite `createServer` call,
  keep `server.hmr.server` pointed at the same `http.Server` instance (see
  current `server/index.js`) — otherwise Vite silently opens a *third*,
  separate port just for its HMR websocket, which causes the same class of
  bug.
- **`.replit` config** already has the right shape — don't need to touch
  it again: `run = "npm run dev"`, a single `[[ports]] localPort = 5000
  externalPort = 80`, and a `[deployment]` block (`autoscale`, build =
  `npm run build`, run = `npm run start`).
- **Never leave a background dev server running when you're done verifying.**
  If you start `npm run dev` (or anything bound to port 5000) to test
  something, kill it before ending your turn. A leftover process holding
  the port causes the *user's own* Run click to fail with `EADDRINUSE`,
  which looks like "the app is broken" from their side even though it
  isn't. This bug bit the previous session twice.
- No headless browser is available in this sandbox — verification has to
  be done via `curl` + reading server logs + `npm run build` (catches
  import/syntax errors), not screenshots.

## Current state — what's already done

Confirmed via `git status --short` in the working tree right now:

**Pulled from `origin/claude/fervent-cannon-gcebg2` as-is** (via
`git show origin/claude/fervent-cannon-gcebg2:<path> > <path>`, so these
are byte-identical to the source branch — do not re-pull, just use them):
`src/data/db.js`, `src/data/helpers.js`, `src/data/labels.js`,
`src/data/validation.js`, `src/data/transfer.js`, `src/data/store.jsx`,
`src/App.jsx`, `src/components/ChurchForm.jsx`, `src/components/FormModal.jsx`,
`src/components/ImportExportModals.jsx`, `src/components/LogInteractionModal.jsx`,
`src/components/shared.jsx`, `src/pages/Dashboard.jsx`,
`src/pages/ChurchProfile.jsx`, `src/pages/Analytics.jsx`,
`src/pages/Settings.jsx`, `src/styles.css`, `public/background.jpg`,
`berks-county-churches.csv` (141-row sample church list, for later import —
not loaded into the DB).

Note: the source branch's `VALIDATION_COMPONENTS_UPDATED.md` mentions a
`src/components/EntityModals.jsx` — **it does not actually exist on this
branch** (confirmed: `git show` 404s on that path, and it's absent from
`git diff --stat HEAD origin/claude/fervent-cannon-gcebg2`). That doc is
stale relative to the branch's actual final state. Don't waste time looking
for it — the validated add/edit forms it describes live inline in
`ChurchProfile.jsx` and in `ChurchForm.jsx`/`FormModal.jsx` instead.

**Deleted** (superseded by the new branch — the AI assistant feature and
these pages don't exist there; functionality moved into Dashboard/ChurchProfile):
`src/ai/arlo.js`, `src/ai/client.js`, `src/ai/context.js`,
`src/components/ArloDrawer.jsx`, `src/pages/Churches.jsx`,
`src/pages/FollowUps.jsx`, `src/pages/Giving.jsx`,
`src/pages/ImpactReports.jsx`, `src/pages/Interactions.jsx`,
`server/transform.js`.

**Written fresh** (not a straight pull — these adapt the branch to our own
backend instead of Supabase):
- `src/data/backend.js` — rewritten to keep the exact same three exports
  the rest of the app expects (`isRemote()`, `initBackend()`,
  `saveRecord(collection, record)`), but implemented with plain `fetch()`
  against **an API that doesn't exist yet** (see "Not done" below):
  `GET /api/db` and `PUT /api/collections/:collection/:id`.
  `isRemote()` always returns `true` (we always have a live DB here, so the
  source branch's demo-mode fallback isn't needed).
- `index.html` — kept the title as "Engage" (the user explicitly renamed
  this project earlier in the session; the source branch calls itself
  "Flock" — deliberately not reverting that).
- `src/components/layout.jsx` — pulled from the branch, then hand-edited:
  `FlockLogo` → `EngageLogo`, wordmark text "Flock" → "Engage". Everything
  else (nav structure, avatar menu, backend status banner) is unchanged
  from the source.
- `package.json` — added `"xlsx": "^0.18.5"` (required by `transfer.js`
  for CSV/Excel import-export). Deliberately did **not** add
  `@supabase/supabase-js` (unused now), or `puppeteer`/`playwright` (the
  source branch's E2E test scripts — out of scope, not requested, and they
  assume a dev-server shape that doesn't match this project's merged
  single-port server).

**Intentionally not ported** (docs/test scaffolding, not app
functionality — skip these, don't go looking for them):
the source branch's own `HANDOFF.md`, the six `VALIDATION_*.md` files,
`test-transfer.mjs`, `verify-ui.mjs`, `verify-ui2.mjs`. The validation
*code* (`validation.js` + its use in the forms) is already ported; just not
its standalone docs.

## Not done yet — exactly what's left

### 1. Rewrite `server/index.js`

Current state: still has the **old** bespoke REST API (`GET /api/db`,
`POST /api/interactions`, `POST /api/notes`,
`PATCH /api/tasks/:id/toggle`) and still imports from the now-deleted
`server/transform.js` — **this means the app cannot start right now**
(`npm run dev` will crash on that import). This is the first thing to fix.

Replace those routes with two generic ones (matching `backend.js`'s
expectations and the source branch's `TABLES` map — see step 2):

- `GET /api/db` → run `SELECT id, data FROM <table>` for all 13 tables in
  parallel, return `{ churches: [...], contacts: [...], ... }` — the
  camelCase collection name as the key, value is just the array of `data`
  values (no unwrapping/remapping needed, since each `data` cell already
  *is* the camelCase record — that's the whole point of the JSONB schema).
- `PUT /api/collections/:collection/:id` → **validate `:collection`
  against a hardcoded allowlist** of the 13 known collection keys mapped to
  real table names (it's used as a SQL identifier, so this is a required
  injection guard, not optional). Then:
  ```sql
  INSERT INTO <table> (id, data) VALUES ($1, $2)
  ON CONFLICT (id) DO UPDATE SET data = excluded.data
  RETURNING data
  ```
  Body is the full record; the client already generates IDs
  (`genId(prefix)` in `helpers.js`, or `` `ch_${Date.now()}` `` in
  `ChurchForm.jsx`) — no server-side ID generation needed anymore.

Keep everything else in `server/index.js` exactly as it is: the
Vite-middleware-in-dev / static-in-prod branching, the merged single-port
setup, the `httpServer`/`hmr.server` wiring, the error-handling middleware
registered last. None of that is changing.

`server/db.js` (the `pg` Pool) is unchanged, still needed.

### 2. Migrate the Postgres schema

Current tables (old, normalized, 9 of them — check with `psql "$DATABASE_URL" -c "\dt"`):
`church_notes, churches, contacts, giving_records, impact_reports,
interactions, ministry_engagements, tasks, users` (plus an `app_seq`
sequence, no longer needed since ID generation moved client-side).

Target: **13 tables**, each shaped `(id TEXT PRIMARY KEY, data JSONB NOT
NULL)` — this mirrors the source branch's own Supabase schema exactly
(see `backend.js`'s `TABLES` map for the collection→table names):

```
churches, contacts, interactions, tasks, giving_records,
ministry_engagements, care_communities, advocates, connections,
impact_reports, church_notes, notable_congregants, app_users
```

Note `users` → `app_users` (rename) and four brand-new empty tables:
`care_communities`, `advocates`, `connections`, `notable_congregants`.

**Don't just drop and recreate empty** — the existing 9 seeded dev churches
(plus their contacts/interactions/tasks/giving/ministry/notes/reports) are
real working data from earlier in this session and should be carried
forward, not thrown away:

1. Read out the current normalized rows (there's already camelCase mapping
   logic to reuse — check git history / the deleted `server/transform.js`
   via `git show HEAD -- server/transform.js` if useful as a reference for
   the old column→camelCase field names).
2. Remap `engagementStatus` on churches to the new taxonomy — this exact
   mapping is already implemented in the ported `src/data/helpers.js` as
   `STATUS_MIGRATION` / `normalizeEngagementStatus()`:
   - `active_partner` → `partnering`
   - `strategic_partner`, `interested`, `initial_contact` → `potential`
   - `not_contacted`, `dormant` → `unreached`
   - (`unable_to_sign` is new in this taxonomy and starts empty — nothing
     maps to it)
3. Insert each record as a JSONB row (`id`, full camelCase object) into the
   corresponding new table.
4. Leave `care_communities`, `advocates`, `connections`,
   `notable_congregants` empty — this matches the source branch's own
   fresh-install state (its `db.js` ships with these as empty arrays too;
   real data only shows up via manual entry or the CSV import feature).

Then drop the old 9 normalized tables and `app_seq`.

### 3. Verify end-to-end

1. `npm install` (picks up `xlsx`).
2. `npm run build` — cheap, high-signal: catches any import/syntax error
   across the whole newly-ported file tree before you even start the server.
3. Run the schema migration against Postgres, confirm row counts per table
   with `psql`.
4. Start the dev server **in the background**, poll until it responds
   (`curl -sf http://localhost:5000` in a `until` loop), then:
   - `curl http://localhost:5000/api/db` → confirm all 13 collections come
     back, with the migrated churches showing new-taxonomy
     `engagementStatus` values and the 4 new collections present as empty
     arrays.
   - `curl -X PUT http://localhost:5000/api/collections/churches/<id> -d '...'`
     with a modified record, then confirm via `psql` that it actually
     persisted (round-trip test — this exact pattern was used earlier in
     the session for the old API and should be repeated here).
   - `curl http://localhost:5000/` and `curl http://localhost:5000/analytics`
     (well, these are client-routed paths under `HashRouter` most likely —
     check `App.jsx`/`main.jsx` for whether routing is hash-based or
     browser-based before assuming a bare path resolves; either way, at
     minimum confirm `curl http://localhost:5000/` returns the HTML shell
     with no server-side 500).
   - Check the server's stdout/stderr log for anything unexpected.
5. **Kill the server and confirm port 5000 is free again** before ending —
   see the port-conflict warning above. Don't skip this.

## Reference: the original approved plan

The full plan this port is following (written and approved via Claude
Code's plan-mode flow earlier in the session) is more verbose than this
doc but covers the same ground plus the original rationale for the JSONB-
over-normalized-schema decision. It's local to that session's environment
at `/home/runner/.claude/plans/witty-riding-pascal.md` and won't be
reachable from a different environment/agent — this HANDOFF.md is the
portable version. If something here seems ambiguous, the reasoning
(not the instructions) is: the source app's data model is still evolving
fast (4 new collections appeared in one branch alone), every mutation
already funnels through one generic `saveRecord(collection, record)` call,
and a JSONB-blob-per-row store means the API and schema never need another
migration just because a new field or collection shows up — which a
normalized-columns schema would require every time.
