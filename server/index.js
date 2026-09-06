// server/index.js — single process for Engage: the API, plus the frontend
// (Vite dev middleware in development, static dist/ in production). One
// process, one port — Replit's port-forwarder only ever sees port 5000.
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { pool } from './db.js';
import {
  mapUser, mapChurch, mapContact, mapInteraction, mapTask,
  mapGivingRecord, mapMinistryEngagement, mapImpactReport, mapChurchNote,
  mapAdvocate, mapCareCommunity,
} from './transform.js';

// OpenAI client for the AI features. Created lazily so the app still boots
// (and every non-AI route works) when no key is configured. The model is
// configurable via AI_MODEL — set it to whatever your key can access.
const AI_MODEL = process.env.AI_MODEL || 'gpt-5.4-mini';
let openai = null;
function getAI() {
  if (openai) return openai;
  if (!process.env.OPENAI_API_KEY) return null;
  openai = new OpenAI();
  return openai;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';
const app = express();
app.use(express.json());

// Full dataset, shaped exactly like the old src/data/db.js mock object.
app.get('/api/db', async (req, res, next) => {
  try {
    const [users, churches, contacts, interactions, tasks, givingRecords, ministryEngagements, impactReports, churchNotes, advocates, careCommunities] =
      await Promise.all([
        pool.query('SELECT * FROM users ORDER BY id'),
        pool.query('SELECT * FROM churches ORDER BY id'),
        pool.query('SELECT * FROM contacts ORDER BY id'),
        pool.query('SELECT * FROM interactions ORDER BY date DESC, id'),
        pool.query('SELECT * FROM tasks ORDER BY id'),
        pool.query('SELECT * FROM giving_records ORDER BY id'),
        pool.query('SELECT * FROM ministry_engagements ORDER BY id'),
        pool.query('SELECT * FROM impact_reports ORDER BY id'),
        pool.query('SELECT * FROM church_notes ORDER BY id'),
        pool.query('SELECT * FROM advocates ORDER BY id'),
        pool.query('SELECT * FROM care_communities ORDER BY id'),
      ]);
    res.json({
      users: users.rows.map(mapUser),
      churches: churches.rows.map(mapChurch),
      contacts: contacts.rows.map(mapContact),
      interactions: interactions.rows.map(mapInteraction),
      tasks: tasks.rows.map(mapTask),
      givingRecords: givingRecords.rows.map(mapGivingRecord),
      ministryEngagements: ministryEngagements.rows.map(mapMinistryEngagement),
      impactReports: impactReports.rows.map(mapImpactReport),
      churchNotes: churchNotes.rows.map(mapChurchNote),
      advocates: advocates.rows.map(mapAdvocate),
      careCommunities: careCommunities.rows.map(mapCareCommunity),
    });
  } catch (err) {
    next(err);
  }
});

// Log Interaction modal — mirrors the old helpers.js addInteraction().
app.post('/api/interactions', async (req, res, next) => {
  const { churchId, type, date, notes } = req.body;
  if (!churchId || !type || !date || !notes) {
    return res.status(400).json({ error: 'churchId, type, date, and notes are required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO interactions (id, church_id, contact_id, type, date, user_id, notes, attendee_count)
       VALUES ('int_' || nextval('app_seq'), $1, NULL, $2, $3, NULL, $4, NULL)
       RETURNING *`,
      [churchId, type, date, notes]
    );
    await client.query(
      `UPDATE churches SET last_interaction_date = $1
       WHERE id = $2 AND $1 > last_interaction_date`,
      [date, churchId]
    );
    await client.query('COMMIT');
    res.status(201).json(mapInteraction(inserted.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Church notes — mirrors the old helpers.js addNote().
app.post('/api/notes', async (req, res, next) => {
  const { churchId, body, pinned, internalOnly } = req.body;
  if (!churchId || !body) {
    return res.status(400).json({ error: 'churchId and body are required' });
  }
  try {
    const inserted = await pool.query(
      `INSERT INTO church_notes (id, church_id, body, author_id, pinned, internal_only, created_at)
       VALUES ('note_' || nextval('app_seq'), $1, $2, NULL, $3, $4, CURRENT_DATE)
       RETURNING *`,
      [churchId, body, Boolean(pinned), Boolean(internalOnly)]
    );
    res.status(201).json(mapChurchNote(inserted.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Church upsert, including its multi-select KeyFam associations.
app.put('/api/collections/churches/:id', async (req, res, next) => {
  const church = req.body;
  if (!church.name) return res.status(400).json({ error: 'name is required' });
  try {
    await pool.query(
      `INSERT INTO churches (
         id, name, address, city, state, zip, county, phone, email, website, denomination,
         attendance_min, attendance_max, engagement_status, first_contact_date,
         last_interaction_date, assigned_coordinator_id, has_care_community, notes,
         created_at, updated_at, kfa_associations
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
         $16, $17, $18, $19, $20, $21, $22
       ) ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
         state = EXCLUDED.state, zip = EXCLUDED.zip, county = EXCLUDED.county,
         phone = EXCLUDED.phone, email = EXCLUDED.email, website = EXCLUDED.website,
         denomination = EXCLUDED.denomination, attendance_min = EXCLUDED.attendance_min,
         attendance_max = EXCLUDED.attendance_max, engagement_status = EXCLUDED.engagement_status,
         first_contact_date = EXCLUDED.first_contact_date,
         last_interaction_date = EXCLUDED.last_interaction_date,
         assigned_coordinator_id = EXCLUDED.assigned_coordinator_id,
         has_care_community = EXCLUDED.has_care_community, notes = EXCLUDED.notes,
         updated_at = EXCLUDED.updated_at, kfa_associations = EXCLUDED.kfa_associations`,
      [church.id, church.name, church.address || null, church.city || '', church.state || 'PA',
       church.zip || null, church.county || null, church.phone || null, church.email || null,
       church.website || null, church.denomination || null, church.attendanceMin ?? null,
       church.attendanceMax ?? null, church.engagementStatus || 'unreached',
       church.firstContactDate || null, church.lastInteractionDate || null,
       church.assignedCoordinatorId || null, Boolean(church.hasCareCommunity), church.notes || null,
       church.createdAt || null, church.updatedAt || null, church.kfaAssociations || []]
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Contact (church staff) upsert — used by the church profile staff editor
// and by the data importer's Staff sheet. The frontend carries the role in
// `title` (mapped to the `position` column) while the importer sends
// `position`, so accept either.
app.put('/api/collections/contacts/:id', async (req, res, next) => {
  const contact = req.body;
  if (!contact.churchId) return res.status(400).json({ error: 'churchId is required' });
  if (!contact.name) return res.status(400).json({ error: 'name is required' });
  try {
    await pool.query(
      `INSERT INTO contacts (
         id, church_id, name, position, email, phone,
         preferred_contact, kfa_role, notes, archived
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         church_id = EXCLUDED.church_id, name = EXCLUDED.name, position = EXCLUDED.position,
         email = EXCLUDED.email, phone = EXCLUDED.phone,
         preferred_contact = EXCLUDED.preferred_contact, kfa_role = EXCLUDED.kfa_role,
         notes = EXCLUDED.notes, archived = EXCLUDED.archived`,
      [contact.id, contact.churchId, contact.name, contact.position || contact.title || null,
       contact.email || null, contact.phone || null, contact.preferredContact || null,
       contact.kfaRole || null, contact.notes || null, Boolean(contact.archived)]
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Advocate upsert — church-profile Advocate tab and the importer's Advocates sheet.
app.put('/api/collections/advocates/:id', async (req, res, next) => {
  const adv = req.body;
  if (!adv.churchId) return res.status(400).json({ error: 'churchId is required' });
  if (!adv.name) return res.status(400).json({ error: 'name is required' });
  try {
    await pool.query(
      `INSERT INTO advocates (id, church_id, name, email, phone, role, status, trained_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         church_id = EXCLUDED.church_id, name = EXCLUDED.name, email = EXCLUDED.email,
         phone = EXCLUDED.phone, role = EXCLUDED.role, status = EXCLUDED.status,
         trained_date = EXCLUDED.trained_date, notes = EXCLUDED.notes`,
      [adv.id, adv.churchId, adv.name, adv.email || null, adv.phone || null,
       adv.role || null, adv.status || null, adv.trainedDate || null, adv.notes || null]
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Care community upsert — created by the church form and the importer's Care
// Communities sheet. `members` is a JSON array of { name, role }.
app.put('/api/collections/careCommunities/:id', async (req, res, next) => {
  const cc = req.body;
  if (!cc.churchId) return res.status(400).json({ error: 'churchId is required' });
  if (!cc.name) return res.status(400).json({ error: 'name is required' });
  try {
    await pool.query(
      `INSERT INTO care_communities (id, church_id, name, status, lead, family_served, start_date, members, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         church_id = EXCLUDED.church_id, name = EXCLUDED.name, status = EXCLUDED.status,
         lead = EXCLUDED.lead, family_served = EXCLUDED.family_served,
         start_date = EXCLUDED.start_date, members = EXCLUDED.members, notes = EXCLUDED.notes`,
      [cc.id, cc.churchId, cc.name, cc.status || null, cc.lead || null, cc.familyServed || null,
       cc.startDate || null, JSON.stringify(cc.members || []), cc.notes || null]
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Giving record upsert — church-profile Giving tab. Mirrors the giving_records
// columns the mapGivingRecord() reader expects.
app.put('/api/collections/givingRecords/:id', async (req, res, next) => {
  const giving = req.body;
  if (!giving.churchId) return res.status(400).json({ error: 'churchId is required' });
  if (!giving.date) return res.status(400).json({ error: 'date is required' });
  try {
    await pool.query(
      `INSERT INTO giving_records (id, church_id, date, amount, fund, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         church_id = EXCLUDED.church_id, date = EXCLUDED.date, amount = EXCLUDED.amount,
         fund = EXCLUDED.fund, type = EXCLUDED.type`,
      [giving.id, giving.churchId, giving.date, giving.amount ?? 0,
       giving.fund || null, giving.type || 'one_time']
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Task upsert used by the dashboard add/edit/complete actions.
app.put('/api/collections/tasks/:id', async (req, res, next) => {
  const task = req.body;
  if (!task.title) return res.status(400).json({ error: 'title is required' });
  try {
    await pool.query(
      `INSERT INTO tasks (id, church_id, title, assigned_to, due_date, priority, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE))
       ON CONFLICT (id) DO UPDATE SET
         church_id = EXCLUDED.church_id, title = EXCLUDED.title, assigned_to = EXCLUDED.assigned_to,
         due_date = EXCLUDED.due_date, priority = EXCLUDED.priority, status = EXCLUDED.status`,
      [task.id, task.churchId || null, task.title, task.assignedTo || null, task.dueDate || null,
       task.priority || 'medium', task.status || 'open', task.createdAt || null]
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Follow-up task checkbox — mirrors the old helpers.js toggleTaskCompleted().
app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    const deleted = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (!deleted.rows.length) return res.status(404).json({ error: 'task not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// AI: turn a free-text interaction note into structured, actionable
// suggestions (a recap, follow-up tasks, a possible engagement-status change,
// and any people mentioned). Nothing here writes to the DB — the client
// decides which suggestions to apply.
app.post('/api/ai/interaction-actions', async (req, res, next) => {
  const client = getAI();
  if (!client) {
    return res.status(503).json({ error: 'AI is not configured. Set OPENAI_API_KEY in the environment.' });
  }
  const { churchId, notes, type, date } = req.body || {};
  if (!notes || !notes.trim()) {
    return res.status(400).json({ error: 'notes are required' });
  }

  // Pull light church context so the model reasons about the right record.
  let churchName = 'this church';
  let currentStatus = 'unknown';
  try {
    if (churchId) {
      const r = await pool.query('SELECT name, engagement_status FROM churches WHERE id = $1', [churchId]);
      if (r.rows.length) { churchName = r.rows[0].name; currentStatus = r.rows[0].engagement_status; }
    }
  } catch { /* non-fatal — proceed with defaults */ }

  const system = [
    'You are an assistant inside a church-engagement CRM used by ministry coordinators.',
    'Given a coordinator\'s free-text note about an interaction with a church, extract structured, useful follow-ups.',
    'Be concise and practical. Only suggest tasks that the note actually implies — do not invent work.',
    'Respond with ONLY a single JSON object (no markdown, no code fences) matching exactly this shape:',
    '{',
    '  "summary": string,                         // one or two sentence recap of what happened',
    '  "tasks": [{ "title": string, "priority": "low"|"medium"|"high"|"critical", "dueInDays": number|null }],',
    '  "statusSuggestion": { "value": "partnering"|"potential"|"unreached"|"unable_to_sign", "reason": string } | null,',
    '  "people": [{ "name": string, "role": string|null }]  // people mentioned who might be church staff/contacts',
    '}',
    'Rules: tasks is [] if none are implied. statusSuggestion is null unless the note clearly signals the relationship changed from its current state. people is [] if none are named. dueInDays is null when no timing is implied.',
  ].join('\n');

  const userMsg = [
    `Church: ${churchName}`,
    `Current engagement status: ${currentStatus}`,
    type ? `Interaction type: ${type}` : null,
    date ? `Date: ${date}` : null,
    '',
    'Note:',
    notes.trim(),
  ].filter(Boolean).join('\n');

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg },
      ],
    });
    const text = (completion.choices?.[0]?.message?.content || '').trim();
    // JSON mode should return clean JSON, but stay forgiving just in case.
    const jsonStr = extractJson(text);
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.status(502).json({ error: 'Could not parse AI response.' });
    }
    res.json({
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      statusSuggestion: parsed.statusSuggestion || null,
      people: Array.isArray(parsed.people) ? parsed.people : [],
    });
  } catch (err) {
    next(err);
  }
});

// Pull the first balanced JSON object out of a string (handles code fences or
// stray prose around it). Falls back to the trimmed input.
function extractJson(text) {
  const start = text.indexOf('{');
  if (start < 0) return text;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return text.slice(start);
}

// Delete a church and everything that references it. Children first, church
// last, all in one transaction so a failure can't orphan rows.
app.delete('/api/churches/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const childTables = [
      'contacts', 'interactions', 'tasks', 'giving_records', 'ministry_engagements',
      'care_communities', 'advocates', 'impact_reports', 'church_notes',
    ];
    for (const table of childTables) {
      await client.query('DELETE FROM ' + table + ' WHERE church_id = $1', [req.params.id]);
    }
    const deleted = await client.query('DELETE FROM churches WHERE id = $1 RETURNING id', [req.params.id]);
    await client.query('COMMIT');
    if (!deleted.rows.length) return res.status(404).json({ error: 'church not found' });
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

const PROFILE_RECORD_TABLES = {
  contacts: 'contacts', interactions: 'interactions',
  ministryEngagements: 'ministry_engagements', churchNotes: 'church_notes', tasks: 'tasks',
  advocates: 'advocates', careCommunities: 'care_communities',
  givingRecords: 'giving_records',
};
app.delete('/api/profile-records/:collection/:id', async (req, res, next) => {
  const table = PROFILE_RECORD_TABLES[req.params.collection];
  if (!table) return res.status(400).json({ error: 'unsupported profile record' });
  try {
    const deleted = await pool.query('DELETE FROM ' + table + ' WHERE id = $1 RETURNING id', [req.params.id]);
    if (!deleted.rows.length) return res.status(404).json({ error: 'record not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.patch('/api/tasks/:id/toggle', async (req, res, next) => {
  try {
    const updated = await pool.query(
      `UPDATE tasks SET status = CASE WHEN status = 'completed' THEN 'open' ELSE 'completed' END
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'task not found' });
    res.json(mapTask(updated.rows[0]));
  } catch (err) {
    next(err);
  }
});

async function start() {
  const PORT = process.env.PORT || 5000;
  await pool.query("ALTER TABLE churches ADD COLUMN IF NOT EXISTS kfa_associations text[] NOT NULL DEFAULT '{}'");
  // Advocates and care communities were UI-only until now; create their tables
  // (idempotently, matching the app's other startup DDL) so both persist.
  await pool.query(`CREATE TABLE IF NOT EXISTS advocates (
    id text PRIMARY KEY,
    church_id text,
    name text NOT NULL,
    email text,
    phone text,
    role text,
    status text,
    trained_date date,
    notes text
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS care_communities (
    id text PRIMARY KEY,
    church_id text,
    name text NOT NULL,
    status text,
    lead text,
    family_served text,
    start_date date,
    members jsonb NOT NULL DEFAULT '[]'::jsonb,
    notes text
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS giving_records (
    id text PRIMARY KEY,
    church_id text,
    date date,
    amount numeric,
    fund text,
    type text
  )`);
  await pool.query(
    `UPDATE users SET name = 'Admin', role = 'Administrator', email = 'admin@keyfam.org', initials = 'A'
     WHERE id = 'usr_001' AND name = 'Sarah Chen'`
  );
  const httpServer = http.createServer(app);

  if (isProd) {
    const distDir = path.join(root, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    // Mount Vite as middleware so the dev server and the API share one port.
    // Pointing hmr.server at our own httpServer stops Vite from opening a
    // second port for its HMR websocket.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true, hmr: { server: httpServer }, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Registered last so it can catch errors from any route above.
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Engage listening on 0.0.0.0:${PORT}`);
  });
}

start();
