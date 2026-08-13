// helpers.js — derived values over the mock db.
// When moving to a real backend, replace each with a Supabase query or SQL view.
import db from './db.js';
import { saveRecord } from './backend.js';

// Frozen "today" so the prototype renders deterministically.
export const TODAY = '2026-06-09';

// --- engagement status migration -------------------------------------------
// Old taxonomy -> new taxonomy. active_partner->partnering, strategic_partner
// and the early-funnel statuses -> potential, not_contacted/dormant -> unreached.
// "unable_to_sign" is new and starts empty.
const STATUS_MIGRATION = {
  active_partner: 'partnering',
  strategic_partner: 'potential',
  interested: 'potential',
  initial_contact: 'potential',
  not_contacted: 'unreached',
  dormant: 'unreached',
};

export function normalizeEngagementStatus(status) {
  return STATUS_MIGRATION[status] || status;
}

// Rewrite any legacy engagementStatus values in the in-memory db to the new
// taxonomy. Safe to call repeatedly; runs after the backend hydrates db.
export function migrateEngagementStatuses() {
  for (const church of db.churches) {
    const next = normalizeEngagementStatus(church.engagementStatus);
    if (next !== church.engagementStatus) church.engagementStatus = next;
  }
}

// Church profile — aggregate giving summary
export function getChurchGivingSummary(churchId) {
  const records = db.givingRecords.filter(g => g.churchId === churchId);
  const thisYear = records.filter(g => g.date >= '2026-01-01');
  const lastYear = records.filter(g => g.date >= '2025-01-01' && g.date < '2026-01-01');
  const total = records.reduce((s, g) => s + g.amount, 0);
  const thisYearTotal = thisYear.reduce((s, g) => s + g.amount, 0);
  const lastYearTotal = lastYear.reduce((s, g) => s + g.amount, 0);
  const avg = records.length ? Math.round(total / records.length) : 0;
  const monthly = records.some(g => g.type === 'monthly');
  const annual = records.some(g => g.type === 'annual');
  let givingStatus = 'none';
  if (total > 10000) givingStatus = 'major_partner';
  else if (annual) givingStatus = 'annual_partner';
  else if (monthly) givingStatus = 'monthly_partner';
  else if (records.length > 0) givingStatus = 'occasional';
  return { total, thisYearTotal, lastYearTotal, avg, givingStatus, records };
}

// Contact freshness — green < 90 days, red >= 90 days or never
export function contactStatus(dateStr) {
  if (!dateStr) return 'red';
  const days = (new Date() - new Date(dateStr)) / 864e5;
  return days <= 90 ? 'green' : 'red';
}

// Last interaction date for a specific contact person
export function getLastContactForContact(contactId) {
  const hits = db.interactions
    .filter(i => i.contactId === contactId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return hits[0]?.date || null;
}

// Lookup helpers
export function getChurchById(id) {
  return db.churches.find(c => c.id === id);
}
export function getContactsByChurch(churchId) {
  return db.contacts.filter(c => c.churchId === churchId && !c.archived);
}
export function getInteractionsByChurch(churchId) {
  return db.interactions.filter(i => i.churchId === churchId).sort((a, b) => b.date.localeCompare(a.date));
}
export function getTasksByChurch(churchId) {
  return db.tasks.filter(t => t.churchId === churchId);
}
export function getNotesByChurch(churchId) {
  return db.churchNotes.filter(n => n.churchId === churchId).sort((a, b) => b.pinned - a.pinned || b.createdAt.localeCompare(a.createdAt));
}
export function getMinistryByChurch(churchId) {
  return db.ministryEngagements.filter(m => m.churchId === churchId);
}
export function getUserById(id) {
  return db.users.find(u => u.id === id);
}
export function getContactById(id) {
  return db.contacts.find(c => c.id === id);
}
export function getCongregantsByChurch(churchId) {
  return db.notableCongregants.filter(c => c.churchId === churchId);
}
export function addCongregant({ churchId, name, title, category, email, phone, notes, lastContactDate }) {
  const rec = {
    id: genId('cng'), churchId, name, title, category, email: email || null,
    phone: phone || null, notes: notes || null,
    lastContactDate: lastContactDate || null, createdAt: TODAY,
  };
  db.notableCongregants.push(rec); saveRecord('notableCongregants', rec);
}
export function updateCongregantContact(id) {
  const c = db.notableCongregants.find(x => x.id === id);
  if (c) { c.lastContactDate = new Date().toISOString().slice(0, 10); saveRecord('notableCongregants', c); }
}

// A task counts as overdue if flagged, or still open/in progress past its due date.
export function isTaskOverdue(task) {
  if (task.status === 'completed') return false;
  return task.status === 'overdue' || task.dueDate < TODAY;
}

// Engagement pipeline counts, in stage order
export const PIPELINE_STAGES = ['partnering', 'potential', 'unreached', 'unable_to_sign'];
export function getPipelineCounts() {
  return PIPELINE_STAGES.map(stage => ({
    stage,
    count: db.churches.filter(c => c.engagementStatus === stage).length,
  }));
}

// --- prototype-only mutations; swap for Supabase inserts/updates later ---
let seq = 100;
let _dbListeners = [];
function notifyDb() { _dbListeners.forEach(fn => fn()); }
export function subscribeDb(fn) { _dbListeners.push(fn); return () => { _dbListeners = _dbListeners.filter(f => f !== fn); }; }

// ID generator for new records (prefix-based)
export function genId(prefix) {
  return `${prefix}_${++seq}`;
}

export function addContact({ churchId, name, position, email, phone, kfaRole, preferredContact, notes }) {
  const rec = { id: genId('con'), churchId, name, title: position || '', role: 'staff', kfaRole: kfaRole || null, email: email || null, phone: phone || null, archived: false, createdAt: TODAY };
  db.contacts.push(rec); saveRecord('contacts', rec);
  notifyDb(); return rec.id;
}
export function updateContact(id, fields) {
  const c = db.contacts.find(x => x.id === id); if (c) { Object.assign(c, fields); saveRecord('contacts', c); } notifyDb();
}
export function addCareCommunity({ churchId, name, status, startDate, notes }) {
  if (!db.careCommunities) db.careCommunities = [];
  const rec = { id: genId('cc'), churchId, name, status: status || 'forming', startDate: startDate || null, notes: notes || null, createdAt: TODAY };
  db.careCommunities.push(rec); saveRecord('careCommunities', rec); notifyDb();
}
export function updateCareCommunity(id, fields) {
  if (!db.careCommunities) return; const c = db.careCommunities.find(x => x.id === id); if (c) { Object.assign(c, fields); saveRecord('careCommunities', c); } notifyDb();
}
export function getAdvocatesByChurch(churchId) {
  return (db.advocates || []).filter(a => a.churchId === churchId);
}
export function addAdvocate({ churchId, name, email, phone, status, role, notes }) {
  if (!db.advocates) db.advocates = [];
  const adv = { id: genId('adv'), churchId, name, email: email || null, phone: phone || null, status: status || 'prospect', role: role || null, notes: notes || null, createdAt: TODAY };
  db.advocates.push(adv); saveRecord('advocates', adv); notifyDb(); return adv.id;
}
export function updateAdvocate(id, fields) {
  if (!db.advocates) return; const a = db.advocates.find(x => x.id === id); if (a) { Object.assign(a, fields); saveRecord('advocates', a); } notifyDb();
}
export function addConnection({ churchId, name, type, status, notes }) {
  if (!db.connections) db.connections = [];
  const rec = { id: genId('conn'), churchId, name, type: type || 'other', status: status || 'active', notes: notes || null, createdAt: TODAY };
  db.connections.push(rec); saveRecord('connections', rec); notifyDb();
}
export function updateConnection(id, fields) {
  if (!db.connections) return; const c = db.connections.find(x => x.id === id); if (c) { Object.assign(c, fields); saveRecord('connections', c); } notifyDb();
}
export function addChurch({ name, address, city, state, zip, phone, email, website, denomination, attendanceMin, attendanceMax, engagementStatus, notes }) {
  const rec = { id: genId('ch'), name, address: address || null, city: city || '', state: state || 'PA', zip: zip || null, phone: phone || null, email: email || null, website: website || null, denomination: denomination || null, attendanceMin: parseInt(attendanceMin) || 0, attendanceMax: parseInt(attendanceMax) || 0, engagementStatus: normalizeEngagementStatus(engagementStatus) || 'unreached', lastInteractionDate: null, firstContactDate: null, assignedCoordinatorId: null, notes: notes || null };
  db.churches.push(rec); saveRecord('churches', rec);
  notifyDb(); return rec.id;
}
export function updateChurch(id, fields) {
  const c = db.churches.find(x => x.id === id); if (c) { Object.assign(c, fields); saveRecord('churches', c); } notifyDb();
}
export function addMinistryEngagement({ churchId, ministry, status, startDate, notes }) {
  const rec = { id: genId('min'), churchId, ministry, status: status || 'exploring', startDate: startDate || null, notes: notes || null };
  db.ministryEngagements.push(rec); saveRecord('ministryEngagements', rec); notifyDb();
}
export function updateMinistryEngagement(id, fields) {
  const m = db.ministryEngagements.find(x => x.id === id); if (m) { Object.assign(m, fields); saveRecord('ministryEngagements', m); } notifyDb();
}
export function addGivingRecord({ churchId, date, amount, type, notes }) {
  const rec = { id: genId('giv'), churchId, date, amount: parseFloat(amount) || 0, type: type || 'one_time', notes: notes || null };
  db.givingRecords.push(rec); saveRecord('givingRecords', rec); notifyDb();
}
export function updateGivingRecord(id, fields) {
  const g = db.givingRecords.find(x => x.id === id); if (g) { Object.assign(g, fields); saveRecord('givingRecords', g); } notifyDb();
}
export function addTask({ churchId, title, dueDate, priority, status, assignedTo, notes }) {
  const rec = { id: genId('tsk'), churchId: churchId || null, title, dueDate: dueDate || null, priority: priority || 'medium', status: status || 'open', assignedTo: assignedTo || null, notes: notes || null };
  db.tasks.push(rec); saveRecord('tasks', rec); notifyDb();
}
export function updateTask(id, fields) {
  const t = db.tasks.find(x => x.id === id); if (t) { Object.assign(t, fields); saveRecord('tasks', t); } notifyDb();
}
export function deleteTask(id) {
  const index = db.tasks.findIndex(task => task.id === id);
  if (index < 0) return;
  db.tasks.splice(index, 1);
  localStorage.removeItem("task-completed-" + id);
  fetch("/api/tasks/" + id, { method: "DELETE" }).catch(error => console.error("Deleting task failed:", error));
  notifyDb();
}
export function getTaskCompletedAt(task) {
  return task.completedAt || localStorage.getItem("task-completed-" + task.id);
}
export function addImpactReport({ churchId, year, fileUrl, notes }) {
  const rec = { id: genId('rpt'), churchId, year, fileUrl: fileUrl || null, notes: notes || null, createdAt: TODAY };
  db.impactReports.push(rec); saveRecord('impactReports', rec); notifyDb();
}
export function replaceImpactReport(id, fields) {
  const r = db.impactReports.find(x => x.id === id); if (r) { Object.assign(r, fields); saveRecord('impactReports', r); } notifyDb();
}
export function updateUser(id, fields) {
  const u = db.users.find(x => x.id === id); if (u) { Object.assign(u, fields); saveRecord('users', u); } notifyDb();
}

export function addInteraction({ churchId, type, date, notes }) {
  const rec = {
    id: genId('int'), churchId, contactId: null, type, date, userId: db.users[0]?.id || null, notes, attendeeCount: null,
  };
  db.interactions.unshift(rec); saveRecord('interactions', rec);
  const church = getChurchById(churchId);
  if (church && date > church.lastInteractionDate) { church.lastInteractionDate = date; saveRecord('churches', church); }
}
export function addNote({ churchId, body, pinned, internalOnly }) {
  const rec = {
    id: genId('note'), churchId, body, authorId: db.users[0]?.id || null, pinned, internalOnly, createdAt: TODAY,
  };
  db.churchNotes.unshift(rec); saveRecord('churchNotes', rec);
}
export function toggleTaskCompleted(taskId) {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = task.status === 'completed' ? 'open' : 'completed';
  if (task.status === 'completed') {
    task.completedAt = new Date().toISOString();
    localStorage.setItem("task-completed-" + task.id, task.completedAt);
  } else {
    task.completedAt = null;
    localStorage.removeItem("task-completed-" + task.id);
  }
  saveRecord('tasks', task);
}
