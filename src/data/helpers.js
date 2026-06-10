// helpers.js — derived values over the in-memory db.
// Mutations write through to Supabase when configured (see backend.js).
import db from './db.js';
import { saveRecord } from './backend.js';

// Today's date in the user's local timezone, as YYYY-MM-DD.
const _now = new Date();
export const TODAY = new Date(_now.getTime() - _now.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const THIS_YEAR = TODAY.slice(0, 4);
const THIS_YEAR_START = `${THIS_YEAR}-01-01`;
const THIS_MONTH_START = `${TODAY.slice(0, 7)}-01`;
const LAST_YEAR_START = `${parseInt(THIS_YEAR) - 1}-01-01`;

// Dashboard summary cards
export function getDashboardStats() {
  const now = new Date(TODAY);
  const ninetyDaysAgo = new Date(now - 90 * 864e5).toISOString().slice(0, 10);
  const thisYearStart = THIS_YEAR_START;
  const thisMonthStart = THIS_MONTH_START;
  return {
    totalChurches: db.churches.length,
    activePartners: db.churches.filter(c =>
      ['active_partner', 'strategic_partner'].includes(c.engagementStatus)).length,
    contactedThisMonth: db.interactions
      .filter(i => i.date >= thisMonthStart)
      .map(i => i.churchId)
      .filter((v, i, a) => a.indexOf(v) === i).length,
    needFollowUp: db.tasks.filter(t =>
      ['open', 'overdue'].includes(t.status)).length,
    givingThisYear: db.givingRecords
      .filter(g => g.date >= thisYearStart)
      .map(g => g.churchId)
      .filter((v, i, a) => a.indexOf(v) === i).length,
    totalGivingThisYear: db.givingRecords
      .filter(g => g.date >= thisYearStart)
      .reduce((sum, g) => sum + g.amount, 0),
    careCommunitiesActive: db.ministryEngagements
      .filter(m => m.ministry === 'care_community' && m.status === 'active').length,
    newRelationships: db.churches
      .filter(c => c.firstContactDate >= ninetyDaysAgo).length,
    upcomingMeetings: db.tasks
      .filter(t => t.status === 'open' && t.dueDate >= TODAY).length,
  };
}

// Church profile — aggregate giving summary
export function getChurchGivingSummary(churchId) {
  const records = db.givingRecords.filter(g => g.churchId === churchId);
  const thisYear = records.filter(g => g.date >= THIS_YEAR_START);
  const lastYear = records.filter(g => g.date >= LAST_YEAR_START && g.date < THIS_YEAR_START);
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

// Churches needing attention flags
export function getAttentionFlags() {
  const ninetyDaysAgo = new Date(new Date(TODAY) - 90 * 864e5).toISOString().slice(0, 10);
  const currentYear = THIS_YEAR;
  const flags = [];
  for (const church of db.churches) {
    if (church.lastInteractionDate < ninetyDaysAgo)
      flags.push({ churchId: church.id, reason: 'no_recent_contact', label: `No contact in ${Math.floor((new Date(TODAY) - new Date(church.lastInteractionDate)) / 864e5)} days` });
    const contacts = db.contacts.filter(c => c.churchId === church.id && !c.archived);
    if (!contacts.length)
      flags.push({ churchId: church.id, reason: 'no_leadership', label: 'Missing leadership information' });
    const hasCurrentReport = db.impactReports.some(r => r.churchId === church.id && String(r.year) === currentYear);
    if (!hasCurrentReport && ['active_partner', 'strategic_partner'].includes(church.engagementStatus))
      flags.push({ churchId: church.id, reason: 'missing_report', label: `${parseInt(currentYear) - 1} impact report not uploaded` });
    if (!church.assignedCoordinatorId)
      flags.push({ churchId: church.id, reason: 'no_coordinator', label: 'No assigned coordinator' });
  }
  return flags;
}

// Recent activity feed
export function getRecentActivity(limit = 10) {
  return [...db.interactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map(i => ({
      ...i,
      church: db.churches.find(c => c.id === i.churchId),
      user: db.users.find(u => u.id === i.userId),
    }));
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
export function getCareCommunitiesByChurch(churchId) {
  return db.careCommunities.filter(c => c.churchId === churchId);
}
export function getAdvocatesByChurch(churchId) {
  return db.advocates.filter(a => a.churchId === churchId);
}
export function getConnectionsByChurch(churchId) {
  return db.connections.filter(c => c.churchId === churchId);
}

// A task counts as overdue if flagged, or still open/in progress past its due date.
export function isTaskOverdue(task) {
  if (task.status === 'completed') return false;
  return task.status === 'overdue' || task.dueDate < TODAY;
}

// Sidebar badge — open overdue tasks
export function getOverdueTaskCount() {
  return db.tasks.filter(isTaskOverdue).length;
}

// Engagement pipeline counts, in stage order
export const PIPELINE_STAGES = ['not_contacted', 'initial_contact', 'interested', 'active_partner', 'strategic_partner', 'dormant'];
export function getPipelineCounts() {
  return PIPELINE_STAGES.map(stage => ({
    stage,
    count: db.churches.filter(c => c.engagementStatus === stage).length,
  }));
}

// Top giving partners (year-to-date), descending
export function getTopGivingPartners(limit = 6) {
  const totals = {};
  for (const g of db.givingRecords.filter(g => g.date >= THIS_YEAR_START)) {
    totals[g.churchId] = (totals[g.churchId] || 0) + g.amount;
  }
  return Object.entries(totals)
    .map(([churchId, total]) => ({ church: getChurchById(churchId), total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// Giving page summary
export function getGivingStats() {
  const ytd = db.givingRecords.filter(g => g.date >= THIS_YEAR_START);
  const priorYear = db.givingRecords.filter(g => g.date >= LAST_YEAR_START && g.date < THIS_YEAR_START);
  const thisMonth = db.givingRecords.filter(g => g.date >= THIS_MONTH_START);
  const ytdTotal = ytd.reduce((s, g) => s + g.amount, 0);
  const priorTotal = priorYear.reduce((s, g) => s + g.amount, 0);
  return {
    ytdTotal,
    thisMonthTotal: thisMonth.reduce((s, g) => s + g.amount, 0),
    vsPriorYearPct: priorTotal ? Math.round(((ytdTotal - priorTotal) / priorTotal) * 100) : null,
    avgGift: ytd.length ? Math.round(ytdTotal / ytd.length) : 0,
  };
}

// Count of churches per giving status tier
export function getGivingStatusBreakdown() {
  const counts = { major_partner: 0, annual_partner: 0, monthly_partner: 0, occasional: 0, none: 0 };
  for (const church of db.churches) {
    counts[getChurchGivingSummary(church.id).givingStatus] += 1;
  }
  return counts;
}

// Active/strategic partners missing the current-cycle impact report
export function getMissingReports(year = parseInt(THIS_YEAR) - 1) {
  return db.churches.filter(c =>
    ['active_partner', 'strategic_partner'].includes(c.engagementStatus) &&
    !db.impactReports.some(r => r.churchId === c.id && r.year === year));
}

// --- mutations; each writes through to Supabase when configured ---

// Timestamp + randomness so ids never collide across devices or sessions.
export function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function insert(collection, record, atFront = false) {
  if (atFront) db[collection].unshift(record);
  else db[collection].push(record);
  saveRecord(collection, record);
  return record;
}
function update(collection, id, ...patches) {
  const record = db[collection].find(r => r.id === id);
  if (!record) return null;
  Object.assign(record, ...patches);
  saveRecord(collection, record);
  return record;
}
export function addChurch(values) {
  insert('churches', {
    id: genId('ch'), notes: null, createdAt: TODAY, updatedAt: TODAY,
    lastInteractionDate: values.firstContactDate || TODAY, ...values,
  });
}
export function updateChurch(id, values) {
  update('churches', id, values, { updatedAt: TODAY });
}
export function updateCareCommunity(id, values) {
  update('careCommunities', id, values);
}
export function updateAdvocate(id, values) {
  update('advocates', id, values);
}
export function updateConnection(id, values) {
  update('connections', id, values);
}
export function addMinistryEngagement(values) {
  insert('ministryEngagements', { id: genId('min'), coordinatorId: null, notes: null, ...values });
}
export function updateMinistryEngagement(id, values) {
  update('ministryEngagements', id, values);
}
export function addGivingRecord(values) {
  insert('givingRecords', { id: genId('giv'), ...values });
}
export function updateGivingRecord(id, values) {
  update('givingRecords', id, values);
}
export function addTask(values) {
  insert('tasks', { id: genId('tsk'), status: 'open', createdAt: TODAY, ...values });
}
export function updateTask(id, values) {
  update('tasks', id, values);
}
export function updateNote(id, values) {
  update('churchNotes', id, values);
}
export function addImpactReport(values) {
  insert('impactReports', { id: genId('rpt'), uploadedBy: 'usr_001', uploadedAt: TODAY, fileType: 'pdf', ...values }, true);
}
export function replaceImpactReport(id, values) {
  update('impactReports', id, values, { uploadedBy: 'usr_001', uploadedAt: TODAY });
}
export function updateUser(id, values) {
  update('users', id, values);
}
export function addContact(values) {
  insert('contacts', { id: genId('con'), archived: false, ...values });
}
export function updateContact(id, values) {
  update('contacts', id, values);
}
export function archiveContact(id) {
  update('contacts', id, { archived: true });
}
export function addCareCommunity(values) {
  insert('careCommunities', { id: genId('cc'), members: [], ...values });
}
export function addAdvocate(values) {
  insert('advocates', { id: genId('adv'), ...values });
}
export function addConnection(values) {
  insert('connections', { id: genId('cx'), ...values });
}
export function addInteraction({ churchId, type, date, notes }) {
  insert('interactions', {
    id: genId('int'), churchId, contactId: null, type, date, userId: 'usr_001', notes, attendeeCount: null,
  }, true);
  const church = getChurchById(churchId);
  if (church && date > church.lastInteractionDate) {
    update('churches', churchId, { lastInteractionDate: date });
  }
}
export function addNote({ churchId, body, pinned, internalOnly }) {
  insert('churchNotes', {
    id: genId('note'), churchId, body, authorId: 'usr_001', pinned, internalOnly, createdAt: TODAY,
  }, true);
}
export function toggleTaskCompleted(taskId) {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return;
  update('tasks', taskId, { status: task.status === 'completed' ? 'open' : 'completed' });
}
