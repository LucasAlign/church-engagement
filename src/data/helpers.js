// helpers.js — derived values over the mock db.
// When moving to a real backend, replace each with a Supabase query or SQL view.
import db from './db.js';

// Frozen "today" so the prototype renders deterministically.
export const TODAY = '2026-06-09';

// Dashboard summary cards
export function getDashboardStats() {
  const now = new Date(TODAY);
  const ninetyDaysAgo = new Date(now - 90 * 864e5).toISOString().slice(0, 10);
  const thisYearStart = '2026-01-01';
  const thisMonthStart = '2026-06-01';
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

// Churches needing attention flags
export function getAttentionFlags() {
  const ninetyDaysAgo = new Date(new Date(TODAY) - 90 * 864e5).toISOString().slice(0, 10);
  const currentYear = '2026';
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
  for (const g of db.givingRecords.filter(g => g.date >= '2026-01-01')) {
    totals[g.churchId] = (totals[g.churchId] || 0) + g.amount;
  }
  return Object.entries(totals)
    .map(([churchId, total]) => ({ church: getChurchById(churchId), total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// Giving page summary
export function getGivingStats() {
  const ytd = db.givingRecords.filter(g => g.date >= '2026-01-01');
  const priorYear = db.givingRecords.filter(g => g.date >= '2025-01-01' && g.date < '2026-01-01');
  const thisMonth = db.givingRecords.filter(g => g.date >= '2026-06-01');
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
export function getMissingReports(year = 2025) {
  return db.churches.filter(c =>
    ['active_partner', 'strategic_partner'].includes(c.engagementStatus) &&
    !db.impactReports.some(r => r.churchId === c.id && r.year === year));
}

// --- prototype-only mutations; swap for Supabase inserts/updates later ---
let seq = 100;
let importSeq = 10000;
export function addInteraction({ churchId, type, date, notes }) {
  db.interactions.unshift({
    id: `int_${++seq}`, churchId, contactId: null, type, date, userId: 'usr_001', notes, attendeeCount: null,
  });
  const church = getChurchById(churchId);
  if (church && date > church.lastInteractionDate) church.lastInteractionDate = date;
}
export function addNote({ churchId, body, pinned, internalOnly }) {
  db.churchNotes.unshift({
    id: `note_${++seq}`, churchId, body, authorId: 'usr_001', pinned, internalOnly, createdAt: TODAY,
  });
}
export function toggleTaskCompleted(taskId) {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = task.status === 'completed' ? 'open' : 'completed';
}

const VALID_IMPORT_STATUSES = new Set([
  'not_contacted', 'initial_contact', 'interested',
  'active_partner', 'strategic_partner', 'dormant',
]);

export function importChurches(rows) {
  let imported = 0;
  for (const row of rows) {
    if (!row.name) continue;
    const churchId = `ch_imp_${++importSeq}`;
    const status = VALID_IMPORT_STATUSES.has(row.engagement_status)
      ? row.engagement_status
      : 'not_contacted';
    db.churches.push({
      id: churchId,
      name: row.name,
      address: row.address || '',
      city: row.city || '',
      state: row.state || 'PA',
      zip: row.zip || '',
      phone: row.phone || '',
      email: row.email || '',
      website: row.website || '',
      denomination: row.denomination || '',
      attendanceMin: parseInt(row.attendance_min) || 0,
      attendanceMax: parseInt(row.attendance_max) || 0,
      engagementStatus: status,
      lastInteractionDate: TODAY,
      firstContactDate: TODAY,
      assignedCoordinatorId: null,
      notes: row.notes || '',
    });
    imported++;

    if (row.lead_pastor?.trim()) {
      db.contacts.push({
        id: `con_imp_${++importSeq}`,
        churchId,
        name: row.lead_pastor.trim(),
        title: 'Lead Pastor',
        role: 'pastor',
        kfaRole: 'none',
        email: '',
        phone: '',
        archived: false,
        createdAt: TODAY,
      });
    }

    if (row.other_staff?.trim()) {
      for (const name of row.other_staff.split(';').map(s => s.trim()).filter(Boolean)) {
        db.contacts.push({
          id: `con_imp_${++importSeq}`,
          churchId,
          name,
          title: 'Staff',
          role: 'staff',
          kfaRole: 'none',
          email: '',
          phone: '',
          archived: false,
          createdAt: TODAY,
        });
      }
    }
  }
  return imported;
}
