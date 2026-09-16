// helpers.js — derived values over the mock db.
// Mutations update this cache and write through to the Replit API.
import db from './db.js';
import { deleteRecord, saveRecord } from './backend.js';

export const TODAY = new Date().toISOString().slice(0, 10);

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
  const year = Number(TODAY.slice(0, 4));
  const thisYearStart = `${year}-01-01`;
  const lastYearStart = `${year - 1}-01-01`;
  const thisYear = records.filter(g => g.date >= thisYearStart);
  const lastYear = records.filter(g => g.date >= lastYearStart && g.date < thisYearStart);
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

export function getImpactReport(churchId, year) {
  return db.impactReports
    .filter(report => report.churchId === churchId && Number(report.year) === Number(year))
    .sort((a, b) => String(b.updatedAt || b.uploadedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.uploadedAt || a.createdAt || '')))[0] || null;
}

export function getMissingReports(year) {
  return db.churches.filter(church => !getImpactReport(church.id, year));
}

export function getAnnualImpactSnapshot(churchId, year) {
  const numericYear = Number(year);
  const start = `${numericYear}-01-01`;
  const end = `${numericYear}-12-31`;
  const inYear = date => Boolean(date && date >= start && date <= end);
  const activeByYearEnd = item => item.status === 'active' && (!item.startDate || item.startDate <= end);
  const giving = db.givingRecords.filter(item => item.churchId === churchId && inYear(item.date));

  return {
    church: getChurchById(churchId),
    year: numericYear,
    report: getImpactReport(churchId, numericYear),
    interactions: db.interactions.filter(item => item.churchId === churchId && inYear(item.date)).length,
    giving: giving.reduce((total, item) => total + (Number(item.amount) || 0), 0),
    ministries: db.ministryEngagements.filter(item => item.churchId === churchId && activeByYearEnd(item)).length,
    careCommunities: db.careCommunities.filter(item => item.churchId === churchId && activeByYearEnd(item)).length,
    advocates: db.advocates.filter(item => item.churchId === churchId && item.status === 'active').length,
  };
}

export function compileAnnualImpactReport(year) {
  const churches = db.churches
    .map(church => getAnnualImpactSnapshot(church.id, year))
    .sort((a, b) => a.church.name.localeCompare(b.church.name));
  return {
    year: Number(year),
    churches,
    completed: churches.filter(item => item.report).length,
    missing: churches.filter(item => !item.report).length,
    interactions: churches.reduce((total, item) => total + item.interactions, 0),
    giving: churches.reduce((total, item) => total + item.giving, 0),
    ministries: churches.reduce((total, item) => total + item.ministries, 0),
    careCommunities: churches.reduce((total, item) => total + item.careCommunities, 0),
    advocates: churches.reduce((total, item) => total + item.advocates, 0),
  };
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
export function removeProfileRecord(collection, id) {
  const allowed = ['contacts', 'interactions', 'ministryEngagements', 'churchNotes', 'tasks', 'notableCongregants', 'advocates', 'careCommunities', 'givingRecords'];
  if (!allowed.includes(collection)) return;
  const index = db[collection].findIndex(record => record.id === id);
  if (index < 0) return;
  db[collection].splice(index, 1);
  void deleteRecord(collection, id);
  notifyDb();
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

// Explainable portfolio flags used by the assistant's coaching context.
export function getAttentionFlags() {
  const ninetyDaysAgo = new Date(new Date(`${TODAY}T12:00:00`) - 90 * 864e5).toISOString().slice(0, 10);
  const currentYear = TODAY.slice(0, 4);
  const flags = [];
  for (const church of db.churches) {
    if (!church.lastInteractionDate || church.lastInteractionDate < ninetyDaysAgo) {
      flags.push({ churchId: church.id, reason: 'no_recent_contact', label: 'No contact in the last 90 days' });
    }
    if (!db.contacts.some(contact => contact.churchId === church.id && !contact.archived)) {
      flags.push({ churchId: church.id, reason: 'no_leadership', label: 'Missing leadership information' });
    }
    const hasCurrentReport = db.impactReports.some(report => report.churchId === church.id && String(report.year) === currentYear);
    if (!hasCurrentReport && church.engagementStatus === 'partnering') {
      flags.push({ churchId: church.id, reason: 'missing_report', label: `${Number(currentYear) - 1} impact report not uploaded` });
    }
    if (!church.assignedCoordinatorId) {
      flags.push({ churchId: church.id, reason: 'no_coordinator', label: 'No assigned coordinator' });
    }
  }
  return flags;
}

// --- mutations -------------------------------------------------------------
let _dbListeners = [];
function notifyDb() { _dbListeners.forEach(fn => fn()); }
export function subscribeDb(fn) { _dbListeners.push(fn); return () => { _dbListeners = _dbListeners.filter(f => f !== fn); }; }

// ID generator for new records (prefix-based)
export function genId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${uuid}`;
}

export function addContact({ churchId, name, position, email, phone, kfaRole, preferredContact, notes }) {
  const rec = { id: genId('con'), churchId, name, title: position || '', role: 'staff', kfaRole: kfaRole || null, preferredContact: preferredContact || null, notes: notes || null, email: email || null, phone: phone || null, archived: false, createdAt: TODAY };
  db.contacts.push(rec); saveRecord('contacts', rec);
  notifyDb(); return rec.id;
}
export function updateContact(id, fields) {
  const c = db.contacts.find(x => x.id === id); if (c) { Object.assign(c, fields); saveRecord('contacts', c); } notifyDb();
}
export function getCareCommunitiesByChurch(churchId) {
  return (db.careCommunities || []).filter(community => community.churchId === churchId);
}
export function addCareCommunity({ churchId, name, status, lead, familyServed, startDate, members, notes }) {
  if (!db.careCommunities) db.careCommunities = [];
  const rec = { id: genId('cc'), churchId, name, status: status || 'forming', lead: lead || null,
    familyServed: familyServed || null, startDate: startDate || null, members: members || [],
    notes: notes || null, createdAt: TODAY };
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
  const rec = { id: genId('conn'), churchId, name, connectionType: type || 'other', status: status || 'active', notes: notes || null, createdAt: TODAY };
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
// Delete a church and every record that hangs off it from both the local cache
// and the generic records API.
export function removeChurch(id) {
  const idx = db.churches.findIndex(c => c.id === id);
  if (idx < 0) return;
  db.churches.splice(idx, 1);
  const deletes = [deleteRecord('churches', id)];
  const children = [
    'contacts', 'interactions', 'tasks', 'givingRecords', 'ministryEngagements',
    'careCommunities', 'advocates', 'connections', 'impactReports', 'churchNotes',
    'notableCongregants',
  ];
  for (const collection of children) {
    const rows = db[collection];
    if (!rows) continue;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].churchId === id) {
        deletes.push(deleteRecord(collection, rows[i].id));
        rows.splice(i, 1);
      }
    }
  }
  void Promise.all(deletes);
  notifyDb();
}
export function addMinistryEngagement({ churchId, ministry, status, startDate, notes }) {
  const rec = { id: genId('min'), churchId, ministry, status: status || 'exploring', startDate: startDate || null, notes: notes || null };
  db.ministryEngagements.push(rec); saveRecord('ministryEngagements', rec); notifyDb();
}
export function updateMinistryEngagement(id, fields) {
  const m = db.ministryEngagements.find(x => x.id === id); if (m) { Object.assign(m, fields); saveRecord('ministryEngagements', m); } notifyDb();
}
export function addGivingRecord({ churchId, date, amount, type, fund }) {
  const rec = { id: genId('giv'), churchId, date, amount: parseFloat(amount) || 0, type: type || 'one_time', fund: fund || null };
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
  removeProfileRecord('tasks', id);
}
export function getTaskCompletedAt(task) {
  return task.completedAt || null;
}
export function addImpactReport({ churchId, year, fileUrl, notes, summary, highlights }) {
  const rec = { id: genId('rpt'), churchId, year: Number(year), fileUrl: fileUrl || null, notes: notes || null, summary: summary || null, highlights: highlights || null, createdAt: TODAY, updatedAt: TODAY };
  db.impactReports.push(rec); saveRecord('impactReports', rec); notifyDb();
  return rec.id;
}
export function replaceImpactReport(id, fields) {
  const r = db.impactReports.find(x => x.id === id); if (r) { Object.assign(r, fields, { updatedAt: TODAY }); saveRecord('impactReports', r); } notifyDb();
}
export function saveAnnualImpactReport({ churchId, year, summary, highlights }) {
  const existing = getImpactReport(churchId, year);
  if (existing) {
    replaceImpactReport(existing.id, { summary: summary || null, highlights: highlights || null });
    return existing.id;
  }
  return addImpactReport({ churchId, year, summary, highlights });
}
export function updateUser(id, fields) {
  const u = db.users.find(x => x.id === id); if (u) { Object.assign(u, fields); saveRecord('users', u); } notifyDb();
}

export function addInteraction({ churchId, type, date, notes }) {
  const rec = {
    id: genId('int'), churchId, contactId: null, type, date, userId: 'usr_001', notes, attendeeCount: null,
  };
  db.interactions.unshift(rec); saveRecord('interactions', rec);
  const church = getChurchById(churchId);
  if (church && (!church.lastInteractionDate || date > church.lastInteractionDate)) {
    church.lastInteractionDate = date;
    saveRecord('churches', church);
  }
}
export function addNote({ churchId, body, pinned, internalOnly }) {
  const rec = {
    id: genId('note'), churchId, body, authorId: 'usr_001', pinned, internalOnly, createdAt: TODAY,
  };
  db.churchNotes.unshift(rec); saveRecord('churchNotes', rec);
}
export function toggleTaskCompleted(taskId) {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = task.status === 'completed' ? 'open' : 'completed';
  task.completedAt = task.status === 'completed' ? new Date().toISOString() : null;
  saveRecord('tasks', task);
}
