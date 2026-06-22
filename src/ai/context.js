// context.js — assembles the data slice Karen reasons over.
//
// Everything here reuses the same derived layer the pages read (helpers.js),
// which on this app is a synchronous in-memory db hydrated from Supabase at
// startup. Karen never gets its own copy of the data. In a future server-side
// setup the endpoint would receive these objects (or fetch them itself).
import {
  getChurchById, getContactsByChurch, getInteractionsByChurch, getTasksByChurch,
  getNotesByChurch, getMinistryByChurch, getChurchGivingSummary, getUserById,
  isTaskOverdue, getAttentionFlags, getPipelineCounts, TODAY,
} from '../data/helpers.js';
import { ENGAGEMENT_STATUS, GIVING_STATUS, INTERACTION_TYPE, MINISTRY_TYPE } from '../data/labels.js';
import db from '../data/db.js';

// Whole numbers of days between two ISO dates (a − b). Null-safe.
export function daysBetween(aIso, bIso) {
  if (!aIso || !bIso) return null;
  return Math.round((new Date(aIso) - new Date(bIso)) / 864e5);
}

// Contacts on this app store the role title under `title` (older code used
// `position`); read both so Karen works regardless.
const contactTitle = c => c.title || c.position || '';

// Everything Karen needs to talk about one church.
export function churchContext(churchId) {
  const church = getChurchById(churchId);
  if (!church) return null;
  const interactions = getInteractionsByChurch(churchId);
  const tasks = getTasksByChurch(churchId);
  const giving = getChurchGivingSummary(churchId);
  const ministries = getMinistryByChurch(churchId).filter(m => m.status === 'active');
  const days = daysBetween(TODAY, church.lastInteractionDate);
  return {
    name: church.name,
    county: church.county,
    engagement: ENGAGEMENT_STATUS[church.engagementStatus]?.label ?? church.engagementStatus,
    daysSinceContact: days,
    lastInteractionType: interactions[0] ? INTERACTION_TYPE[interactions[0].type]?.label : null,
    interactionCount: interactions.length,
    giving: {
      status: GIVING_STATUS[giving.givingStatus]?.label ?? giving.givingStatus,
      thisYear: giving.thisYearTotal,
      lastYear: giving.lastYearTotal,
      lifetime: giving.total,
    },
    activeMinistries: ministries.map(m => MINISTRY_TYPE[m.ministry]),
    openTasks: tasks.filter(t => isTaskOverdue(t) || ['open', 'in_progress'].includes(t.status)),
    contacts: getContactsByChurch(churchId).map(c => ({ name: c.name, position: contactTitle(c) })),
    notes: getNotesByChurch(churchId).filter(n => n.pinned).map(n => n.body),
  };
}

// The contact to address a follow-up to: prefer the Champion, then a primary
// contact, then anyone on file.
export function primaryContact(churchId) {
  const contacts = getContactsByChurch(churchId);
  if (!contacts.length) return null;
  const byRole = role => contacts.find(c => c.kfaRole === role);
  const pick = byRole('champion') || byRole('primary_contact') || byRole('advocate') || contacts[0];
  return { name: pick.name, position: contactTitle(pick), preferredContact: pick.preferredContact, notes: pick.notes };
}

// Open + overdue tasks across the portfolio, ranked for a daily call list:
// overdue first, then soonest due. Each carries its church and county.
export function todayTasks() {
  return db.tasks
    .filter(t => isTaskOverdue(t) || ['open', 'in_progress'].includes(t.status))
    .map(t => {
      const church = getChurchById(t.churchId);
      return {
        title: t.title,
        church: church?.name ?? 'Unassigned',
        churchId: t.churchId,
        county: church?.county ?? '—',
        dueDate: t.dueDate,
        priority: t.priority,
        overdue: isTaskOverdue(t),
        assignee: getUserById(t.assignedTo)?.name ?? null,
      };
    })
    .sort((a, b) =>
      (b.overdue - a.overdue) ||
      String(a.dueDate).localeCompare(String(b.dueDate)) ||
      a.church.localeCompare(b.church));
}

// Whole-portfolio read for coaching (Opus): drifting partners, softening
// giving, overdue concentration by county, attention flags.
const PARTNER_TIERS = ['active_partner', 'strategic_partner'];

export function portfolioContext() {
  const me = getUserById('usr_001');
  const partners = db.churches.filter(c => PARTNER_TIERS.includes(c.engagementStatus));

  const slipping = partners
    .map(c => ({
      name: c.name,
      county: c.county,
      status: ENGAGEMENT_STATUS[c.engagementStatus]?.label ?? c.engagementStatus,
      daysSinceContact: daysBetween(TODAY, c.lastInteractionDate),
      coordinator: c.assignedCoordinatorId ? getUserById(c.assignedCoordinatorId)?.name : null,
    }))
    .filter(c => c.daysSinceContact != null && c.daysSinceContact >= 30)
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);

  const givingWatch = db.churches
    .map(c => {
      const g = getChurchGivingSummary(c.id);
      return { name: c.name, county: c.county, thisYear: g.thisYearTotal, lastYear: g.lastYearTotal };
    })
    .filter(c => c.lastYear > 0 && c.thisYear < c.lastYear * 0.75)
    .sort((a, b) => (b.lastYear - b.thisYear) - (a.lastYear - a.thisYear));

  const overdue = todayTasks().filter(t => t.overdue);
  const overdueByCounty = {};
  for (const t of overdue) overdueByCounty[t.county] = (overdueByCounty[t.county] || 0) + 1;

  const flagsByReason = {};
  for (const f of getAttentionFlags()) flagsByReason[f.reason] = (flagsByReason[f.reason] || 0) + 1;

  return {
    coordinator: me ? { name: me.name, county: me.county } : null,
    totalChurches: db.churches.length,
    partnerCount: partners.length,
    pipeline: getPipelineCounts().map(p => ({ stage: ENGAGEMENT_STATUS[p.stage]?.label ?? p.stage, count: p.count })),
    slipping,
    givingWatch,
    overdueTotal: overdue.length,
    overdueByCounty: Object.entries(overdueByCounty)
      .map(([county, count]) => ({ county, count }))
      .sort((a, b) => b.count - a.count),
    flagsByReason,
  };
}
