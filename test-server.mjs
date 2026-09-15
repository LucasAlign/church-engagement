import { createApp } from './server/app.js';
import { createAuthMiddleware } from './server/security.js';
import { migrateLegacyData } from './server/legacy-data.js';

const writes = [];
const database = {
  readAll: async () => ({ churches: [{ id: 'ch_1', name: 'Test Church' }] }),
  upsert: async (...args) => { writes.push(args); },
};
const server = createApp(database).listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

let failures = 0;
const check = (condition, message) => {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${message}`);
  if (!condition) failures += 1;
};

const migratedRecords = [];
const legacyRows = {
  churches: [{
    id: 'ch_legacy', name: 'Updated Legacy Church', attendance_min: 75,
    engagement_status: 'potential', last_interaction_date: '2026-09-14',
    has_care_community: true, kfa_associations: ['mentoring'],
  }],
  contacts: [{ id: 'con_legacy', church_id: 'ch_legacy', name: 'Updated Contact', position: 'Pastor' }],
  users: [{ id: 'usr_legacy', name: 'Coordinator', email: 'coordinator@example.test' }],
};
const migrationPool = {
  async query(sql, params = []) {
    const normalized = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
    if (normalized.includes('select count(*)::int as count from records')) return { rows: [{ count: 0 }] };
    if (normalized.includes('from information_schema.tables')) {
      return { rows: Object.keys(legacyRows).map(table_name => ({ table_name })) };
    }
    const tableMatch = normalized.match(/^select \* from "([a-z_]+)"/);
    if (tableMatch) return { rows: legacyRows[tableMatch[1]] || [] };
    if (normalized.startsWith('insert into records')) {
      migratedRecords.push({ collection: params[0], id: params[1], data: JSON.parse(params[2]) });
    }
    return { rows: [] };
  },
};

const migrated = await migrateLegacyData(migrationPool);
const migratedChurch = migratedRecords.find(record => record.collection === 'churches')?.data;
check(migrated === 3, 'empty records store imports every legacy row');
check(
  migratedChurch?.name === 'Updated Legacy Church'
    && migratedChurch.attendanceMin === 75
    && migratedChurch.lastInteractionDate === '2026-09-14',
  'legacy database columns are mapped to the frontend record shape',
);

let queriedLegacyTables = false;
const skipped = await migrateLegacyData({
  async query(sql) {
    const normalized = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
    if (normalized.includes('select count(*)::int as count from records')) return { rows: [{ count: 1 }] };
    if (normalized.includes('from information_schema.tables')) queriedLegacyTables = true;
    return { rows: [] };
  },
});
check(skipped === 0 && !queriedLegacyTables, 'existing records are never overwritten by the legacy import');

try {
  let response = await fetch(`${base}/api/health`);
  check(response.ok && (await response.json()).ok === true, 'health endpoint responds');

  response = await fetch(`${base}/api/data`);
  const payload = await response.json();
  check(response.ok && payload.churches[0].id === 'ch_1', 'data endpoint returns repository records');

  response = await fetch(`${base}/api/data/churches/ch_2`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { id: 'ch_2', name: 'Saved Church' } }),
  });
  check(response.status === 204 && writes[0][0] === 'churches' && writes[0][1] === 'ch_2', 'valid record is persisted');

  response = await fetch(`${base}/api/data/unknown/id`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { id: 'id' } }),
  });
  check(response.status === 404, 'unknown collections are rejected');

  response = await fetch(`${base}/api/data/churches/ch_3`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { id: 'different' } }),
  });
  check(response.status === 400, 'mismatched record IDs are rejected');

  response = await fetch(`${base}/api/data/churches/ch_4`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { id: 'ch_4', name: '' } }),
  });
  check(response.status === 400, 'required server-side fields are enforced');

  response = await fetch(`${base}/api/data/churches/ch_5`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: '{not-json',
  });
  check(response.status === 400, 'malformed JSON is rejected');

  const protectedServer = createApp(database, {
    auth: createAuthMiddleware({ AUTH_MODE: 'bearer', API_AUTH_TOKEN: 'a-secure-test-token-with-32-characters' }),
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => protectedServer.once('listening', resolve));
  const protectedBase = `http://127.0.0.1:${protectedServer.address().port}`;
  response = await fetch(`${protectedBase}/api/data`);
  check(response.status === 401, 'protected API rejects anonymous requests');
  response = await fetch(`${protectedBase}/api/data`, { headers: { Authorization: 'Bearer a-secure-test-token-with-32-characters' } });
  check(response.status === 200, 'protected API accepts a valid bearer token');
  await new Promise(resolve => protectedServer.close(resolve));
} finally {
  await new Promise(resolve => server.close(resolve));
}

process.exitCode = failures ? 1 : 0;
