// server/index.js — single process for Engage: the API, plus the frontend
// (Vite dev middleware in development, static dist/ in production). One
// process, one port — Replit's port-forwarder only ever sees port 5000.
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import {
  mapUser, mapChurch, mapContact, mapInteraction, mapTask,
  mapGivingRecord, mapMinistryEngagement, mapImpactReport, mapChurchNote,
} from './transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';
const app = express();
app.use(express.json());

// Full dataset, shaped exactly like the old src/data/db.js mock object.
app.get('/api/db', async (req, res, next) => {
  try {
    const [users, churches, contacts, interactions, tasks, givingRecords, ministryEngagements, impactReports, churchNotes] =
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

const PROFILE_RECORD_TABLES = {
  contacts: 'contacts', interactions: 'interactions',
  ministryEngagements: 'ministry_engagements', churchNotes: 'church_notes', tasks: 'tasks',
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
