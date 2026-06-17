// helpers.js — derived values over the mock db.
// When moving to a real backend, replace each with a Supabase query or SQL view.
import db from './db.js';

export const TODAY = new Date().toISOString().slice(0, 10);

// Dashboard summary cards
export function getDashboardStats() {
  const now = new Date();
  const ninetyDaysAgo = new Date(now - 90 * 864e5).toISOString().slice(0, 10);
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const thisYearStart = `${yr}-01-01`;
  const thisMonthStart = `${yr}-${mo}-01`;
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
  const yr = new Date().getFullYear();
  const records = db.givingRecords.filter(g => g.churchId === churchId);
  const thisYear = records.filter(g => g.date >= `${yr}-01-01`);
  const lastYear = records.filter(g => g.date >= `${yr - 1}-01-01` && g.date < `${yr}-01-01`);
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
  const ninetyDaysAgo = new Date(new Date() - 90 * 864e5).toISOString().slice(0, 10);
  const currentYear = String(new Date().getFullYear());
  const flags = [];
  for (const church of db.churches) {
    if (church.lastInteractionDate < ninetyDaysAgo)
      flags.push({ churchId: church.id, reason: 'no_recent_contact', label: `No contact in ${Math.floor((new Date() - new Date(church.lastInteractionDate)) / 864e5)} days` });
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
  db.notableCongregants.push({
    id: `cng_${++seq}`, churchId, name, title, category, email: email || null,
    phone: phone || null, notes: notes || null,
    lastContactDate: lastContactDate || null, createdAt: TODAY,
  });
}
export function updateCongregantContact(id) {
  const c = db.notableCongregants.find(x => x.id === id);
  if (c) c.lastContactDate = new Date().toISOString().slice(0, 10);
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
  const ytdStart = `${new Date().getFullYear()}-01-01`;
  const totals = {};
  for (const g of db.givingRecords.filter(g => g.date >= ytdStart)) {
    totals[g.churchId] = (totals[g.churchId] || 0) + g.amount;
  }
  return Object.entries(totals)
    .map(([churchId, total]) => ({ church: getChurchById(churchId), total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// Giving page summary
export function getGivingStats() {
  const yr = new Date().getFullYear();
  const mo = String(new Date().getMonth() + 1).padStart(2, '0');
  const ytd = db.givingRecords.filter(g => g.date >= `${yr}-01-01`);
  const priorYear = db.givingRecords.filter(g => g.date >= `${yr - 1}-01-01` && g.date < `${yr}-01-01`);
  const thisMonth = db.givingRecords.filter(g => g.date >= `${yr}-${mo}-01`);
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
export function getMissingReports(year = new Date().getFullYear() - 1) {
  return db.churches.filter(c =>
    ['active_partner', 'strategic_partner'].includes(c.engagementStatus) &&
    !db.impactReports.some(r => r.churchId === c.id && r.year === year));
}

// --- prototype-only mutations; swap for Supabase inserts/updates later ---
let seq = 100;
let _dbListeners = [];
function notifyDb() { _dbListeners.forEach(fn => fn()); }
export function subscribeDb(fn) { _dbListeners.push(fn); return () => { _dbListeners = _dbListeners.filter(f => f !== fn); }; }

export function addContact({ churchId, name, position, email, phone, kfaRole, preferredContact, notes }) {
  const id = `con_${++seq}`;
  db.contacts.push({ id, churchId, name, title: position || '', role: 'staff', kfaRole: kfaRole || null, email: email || null, phone: phone || null, archived: false, createdAt: TODAY });
  notifyDb(); return id;
}
export function updateContact(id, fields) {
  const c = db.contacts.find(x => x.id === id); if (c) Object.assign(c, fields); notifyDb();
}
export function addCareCommunity({ churchId, name, status, startDate, notes }) {
  if (!db.careCommunities) db.careCommunities = [];
  db.careCommunities.push({ id: `cc_${++seq}`, churchId, name, status: status || 'forming', startDate: startDate || null, notes: notes || null, createdAt: TODAY }); notifyDb();
}
export function updateCareCommunity(id, fields) {
  if (!db.careCommunities) return; const c = db.careCommunities.find(x => x.id === id); if (c) Object.assign(c, fields); notifyDb();
}
export function addAdvocate({ churchId, name, email, phone, status, notes }) {
  if (!db.advocates) db.advocates = [];
  db.advocates.push({ id: `adv_${++seq}`, churchId, name, email: email || null, phone: phone || null, status: status || 'prospect', notes: notes || null, createdAt: TODAY }); notifyDb();
}
export function updateAdvocate(id, fields) {
  if (!db.advocates) return; const a = db.advocates.find(x => x.id === id); if (a) Object.assign(a, fields); notifyDb();
}
export function addConnection({ churchId, name, type, status, notes }) {
  if (!db.connections) db.connections = [];
  db.connections.push({ id: `conn_${++seq}`, churchId, name, type: type || 'other', status: status || 'active', notes: notes || null, createdAt: TODAY }); notifyDb();
}
export function updateConnection(id, fields) {
  if (!db.connections) return; const c = db.connections.find(x => x.id === id); if (c) Object.assign(c, fields); notifyDb();
}
export function addChurch({ name, address, city, state, zip, phone, email, website, denomination, attendanceMin, attendanceMax, engagementStatus, notes }) {
  const id = `ch_${++seq}`;
  db.churches.push({ id, name, address: address || null, city: city || '', state: state || 'PA', zip: zip || null, phone: phone || null, email: email || null, website: website || null, denomination: denomination || null, attendanceMin: parseInt(attendanceMin) || 0, attendanceMax: parseInt(attendanceMax) || 0, engagementStatus: engagementStatus || 'not_contacted', lastInteractionDate: null, firstContactDate: null, assignedCoordinatorId: null, notes: notes || null });
  notifyDb(); return id;
}
export function updateChurch(id, fields) {
  const c = db.churches.find(x => x.id === id); if (c) Object.assign(c, fields); notifyDb();
}
export function addMinistryEngagement({ churchId, ministry, status, startDate, notes }) {
  db.ministryEngagements.push({ id: `min_${++seq}`, churchId, ministry, status: status || 'exploring', startDate: startDate || null, notes: notes || null }); notifyDb();
}
export function updateMinistryEngagement(id, fields) {
  const m = db.ministryEngagements.find(x => x.id === id); if (m) Object.assign(m, fields); notifyDb();
}
export function addGivingRecord({ churchId, date, amount, type, notes }) {
  db.givingRecords.push({ id: `giv_${++seq}`, churchId, date, amount: parseFloat(amount) || 0, type: type || 'one_time', notes: notes || null }); notifyDb();
}
export function updateGivingRecord(id, fields) {
  const g = db.givingRecords.find(x => x.id === id); if (g) Object.assign(g, fields); notifyDb();
}
export function addTask({ churchId, title, dueDate, priority, status, assignedTo, notes }) {
  db.tasks.push({ id: `tsk_${++seq}`, churchId: churchId || null, title, dueDate: dueDate || null, priority: priority || 'medium', status: status || 'open', assignedTo: assignedTo || null, notes: notes || null }); notifyDb();
}
export function updateTask(id, fields) {
  const t = db.tasks.find(x => x.id === id); if (t) Object.assign(t, fields); notifyDb();
}
export function addImpactReport({ churchId, year, fileUrl, notes }) {
  db.impactReports.push({ id: `rpt_${++seq}`, churchId, year, fileUrl: fileUrl || null, notes: notes || null, createdAt: TODAY }); notifyDb();
}
export function replaceImpactReport(id, fields) {
  const r = db.impactReports.find(x => x.id === id); if (r) Object.assign(r, fields); notifyDb();
}
export function updateUser(id, fields) {
  const u = db.users.find(x => x.id === id); if (u) Object.assign(u, fields); notifyDb();
}

const VALID_ENGAGEMENT_STATUSES = new Set([
  'not_contacted', 'initial_contact', 'interested',
  'active_partner', 'strategic_partner', 'dormant',
]);

export function importChurches(rows) {
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (const r of rows) {
    const churchId = `ch_imp_${++seq}`;
    db.churches.push({
      id: churchId,
      name: r.name,
      address: r.address || null,
      city: r.city || '',
      state: r.state || 'PA',
      zip: r.zip || null,
      phone: r.phone || null,
      email: r.email || null,
      website: r.website || null,
      denomination: r.denomination || null,
      attendanceMin: parseInt(r.attendance_min) || 0,
      attendanceMax: parseInt(r.attendance_max) || 0,
      engagementStatus: VALID_ENGAGEMENT_STATUSES.has(r.engagement_status) ? r.engagement_status : 'not_contacted',
      notes: r.notes || null,
      lastInteractionDate: null,
      firstContactDate: null,
      assignedCoordinatorId: null,
    });
    if (r.lead_pastor && r.lead_pastor.trim()) {
      db.contacts.push({
        id: `con_imp_${++seq}`,
        churchId,
        name: r.lead_pastor.trim(),
        title: 'Lead Pastor',
        role: 'pastor',
        kfaRole: null,
        email: null,
        phone: null,
        archived: false,
        createdAt: today,
      });
    }
    if (r.other_staff && r.other_staff.trim()) {
      const staffList = r.other_staff.split(';').map(s => s.trim()).filter(Boolean);
      for (const staffName of staffList) {
        db.contacts.push({
          id: `con_imp_${++seq}`,
          churchId,
          name: staffName,
          title: 'Staff',
          role: 'staff',
          kfaRole: null,
          email: null,
          phone: null,
          archived: false,
          createdAt: today,
        });
      }
    }
    count++;
  }
  return count;
}
export function addInteraction({ churchId, type, date, notes }) {
  db.interactions.unshift({
    id: `int_${++seq}`, churchId, contactId: null, type, date, userId: null, notes, attendeeCount: null,
  });
  const church = getChurchById(churchId);
  if (church && date > church.lastInteractionDate) church.lastInteractionDate = date;
}
export function addNote({ churchId, body, pinned, internalOnly }) {
  db.churchNotes.unshift({
    id: `note_${++seq}`, churchId, body, authorId: null, pinned, internalOnly, createdAt: TODAY,
  });
}
export function toggleTaskCompleted(taskId) {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = task.status === 'completed' ? 'open' : 'completed';
}
