// backend.js — optional Supabase persistence behind the in-memory db.
// Each collection maps to a table of shape (id text primary key, data jsonb);
// see supabase/schema.sql. Reads stay synchronous against db; initBackend()
// hydrates db from Supabase at startup and saveRecord() writes mutations
// through. Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY the app runs
// in demo mode and nothing is persisted.
import { createClient } from '@supabase/supabase-js';
import db from './db.js';

const TABLES = {
  churches: 'churches',
  contacts: 'contacts',
  interactions: 'interactions',
  tasks: 'tasks',
  givingRecords: 'giving_records',
  ministryEngagements: 'ministry_engagements',
  careCommunities: 'care_communities',
  advocates: 'advocates',
  connections: 'connections',
  impactReports: 'impact_reports',
  churchNotes: 'church_notes',
  notableCongregants: 'notable_congregants',
  users: 'app_users',
};

// Optional chaining keeps this importable under plain node (test scripts),
// where import.meta.env does not exist.
const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
const supabase = (url && anonKey && typeof url === 'string' && url.length > 0) ? createClient(url, anonKey) : null;

export function isRemote() {
  return !!supabase;
}

// Fetch every collection. On a brand-new project (all tables empty) seed it
// with the bundled sample data; otherwise replace db's contents in place.
export async function initBackend() {
  if (!supabase) return;
  const results = await Promise.all(Object.entries(TABLES).map(async ([collection, table]) => {
    const { data, error } = await supabase.from(table).select('id, data');
    if (error) {
      // A single missing/inaccessible table must NOT take down the whole
      // backend (which would drop the app to demo mode). Skip this collection
      // and keep every other table in remote mode.
      console.warn(`Loading ${table} failed — skipping this table: ${error.message}`);
      return [collection, null];
    }
    return [collection, data];
  }));
  // Seed only a genuinely empty project: every table present (no errors) and empty.
  if (results.every(([, rows]) => rows && rows.length === 0)) {
    for (const [collection, table] of Object.entries(TABLES)) {
      const rows = db[collection].map(r => ({ id: r.id, data: r }));
      if (!rows.length) continue;
      const { error } = await supabase.from(table).upsert(rows);
      if (error) console.warn(`Seeding ${table} failed — skipping: ${error.message}`);
    }
    return;
  }
  for (const [collection, rows] of results) {
    if (!rows) continue; // table errored above — leave in-memory contents as-is
    db[collection].length = 0;
    db[collection].push(...rows.map(r => r.data));
  }
}

// Fire-and-forget upsert; the in-memory db is already updated, so the UI
// never waits on the network.
export function saveRecord(collection, record) {
  if (!supabase) return;
  supabase.from(TABLES[collection]).upsert({ id: record.id, data: record }).then(({ error }) => {
    if (error) console.error(`Saving ${collection}/${record.id} failed:`, error.message);
  });
}
