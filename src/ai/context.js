// context.js — assembles the data slice Arlo reasons over.
//
// Everything here reuses the same derived layer the pages read (helpers.js), so
// Arlo never gets its own copy of the data. When helpers move to Supabase
// queries, these builders follow for free. In Phase 3 the Edge Function will
// receive these objects (or fetch them itself via tool use) instead of the stub
// reading them directly.
import {
  getChurchById, getContactsByChurch, getInteractionsByChurch, getTasksByChurch,
  getNotesByChurch, getMinistryByChurch, getChurchGivingSummary, getUserById,
  isTaskOverdue, TODAY,
} from '../data/helpers.js';
import { ENGAGEMENT_STATUS, GIVING_STATUS, INTERACTION_TYPE, MINISTRY_TYPE } from '../data/labels.js';
import db from '../data/db.js';

// Whole numbers of days between two ISO dates (a − b).
export function daysBetween(aIso, bIso) {
  return Math.round((new Date(aIso) - new Date(bIso)) / 864e5);
}

// Everything Arlo needs to talk about one church.
export function churchContext(churchId) {
  const church = getChurchById(churchId);
  if (!church) return null;
  const interactions = getInteractionsByChurch(churchId);
  const tasks = getTasksByChurch(churchId);
  const giving = getChurchGivingSummary(churchId);
  const ministries = getMinistryByChurch(churchId).filter(m => m.status === 'active');
  const coordinator = church.assignedCoordinatorId ? getUserById(church.assignedCoordinatorId) : null;
  return {
    name: church.name,
    county: church.county,
    engagement: ENGAGEMENT_STATUS[church.engagementStatus]?.label ?? church.engagementStatus,
    daysSinceContact: daysBetween(TODAY, church.lastInteractionDate),
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
    contacts: getContactsByChurch(churchId).map(c => ({ name: c.name, position: c.position })),
    notes: getNotesByChurch(churchId).filter(n => n.pinned).map(n => n.body),
  };
}

// Open + overdue tasks across the portfolio, ranked for a daily call list:
// overdue first, then soonest due. Each carries its church and county so the
// brief can route by territory.
export function todayTasks() {
  return db.tasks
    .filter(t => isTaskOverdue(t) || ['open', 'in_progress'].includes(t.status))
    .map(t => {
      const church = getChurchById(t.churchId);
      return {
        title: t.title,
        church: church?.name ?? 'Unknown church',
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
      a.dueDate.localeCompare(b.dueDate) ||
      a.church.localeCompare(b.church));
}
