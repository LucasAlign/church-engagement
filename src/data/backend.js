// backend.js — persistence behind the in-memory db, backed by our own
// Express+Postgres API (server/index.js), not Supabase. Reads stay
// synchronous against db; initBackend() hydrates db from the API at startup
// and saveRecord() writes mutations through. Every other file only calls
// into this module's three exports, so this is the only file that knows
// about the network.
import db from './db.js';

// Collection -> matches the keys server/index.js's GET /api/db returns
// and the allowlist PUT /api/collections/:collection/:id validates against.
const COLLECTIONS = [
  'churches', 'contacts', 'interactions', 'tasks', 'givingRecords',
  'ministryEngagements', 'careCommunities', 'advocates', 'connections',
  'impactReports', 'churchNotes', 'notableCongregants', 'users',
];

// We always have a live API in this environment — no demo-mode fallback.
export function isRemote() {
  return true;
}

// Fetch every collection and replace db's contents in place.
export async function initBackend() {
  const res = await fetch('/api/db');
  if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
  const data = await res.json();
  for (const collection of COLLECTIONS) {
    db[collection].length = 0;
    db[collection].push(...(data[collection] || []));
  }
}

// Fire-and-forget upsert; the in-memory db is already updated, so the UI
// never waits on the network.
export function saveRecord(collection, record) {
  fetch(`/api/collections/${collection}/${record.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(record),
  }).then(res => {
    if (!res.ok) console.error(`Saving ${collection}/${record.id} failed: ${res.status}`);
  }).catch(err => {
    console.error(`Saving ${collection}/${record.id} failed:`, err.message);
  });
}
