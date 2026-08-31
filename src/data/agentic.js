import { ENGAGEMENT_STATUS } from './labels.js';

const DAY_MS = 86_400_000;

function dayDiff(from, to) {
  return Math.floor((new Date(to) - new Date(from)) / DAY_MS);
}

export function suggestFromInteractionNotes(notes, today) {
  const text = notes.trim();
  const lower = text.toLowerCase();
  const ministryMatches = [
    ['mentoring', 'Mentoring'],
    ['barton bag', 'Barton Bags'],
    ['care communit', 'Care Communities'],
    ['foster', 'Foster care'],
    ['adopt', 'Adoption support'],
    ['giving', 'Financial giving'],
  ].filter(([needle]) => lower.includes(needle)).map(([, label]) => label);

  let followUpDate = null;
  if (/next week|follow.?up|call back|reach back/.test(lower)) {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + 7);
    followUpDate = date.toISOString().slice(0, 10);
  }

  const stage = /partner|ready to move forward|committed/.test(lower)
    ? 'partnering'
    : /interested|would like|wants? (more|info)|follow.?up/.test(lower)
      ? 'potential'
      : null;

  return {
    summary: text.replace(/\s+/g, ' ').replace(/^./, char => char.toUpperCase()),
    ministryTags: ministryMatches,
    suggestedStage: stage,
    followUp: followUpDate ? { title: 'Follow up on recent conversation', dueDate: followUpDate } : null,
  };
}

export function getRelationshipSignals(data, today) {
  const signals = [];
  for (const task of data.tasks.filter(item => item.status !== 'completed')) {
    if (task.dueDate && task.dueDate < today) {
      const church = data.churches.find(item => item.id === task.churchId);
      signals.push({
        id: `task-${task.id}`,
        level: 'urgent',
        title: task.title,
        churchId: church?.id || null,
        churchName: church?.name || 'General task',
        reason: `Follow-up was due ${task.dueDate}.`,
      });
    }
  }
  for (const church of data.churches) {
    if (!church.lastInteractionDate) {
      signals.push({ id: `never-${church.id}`, level: 'attention', title: 'No contact recorded', churchId: church.id, churchName: church.name, reason: 'This church has no interaction history.' });
    } else if (dayDiff(church.lastInteractionDate, today) > 90) {
      signals.push({ id: `stale-${church.id}`, level: 'attention', title: 'Relationship may need attention', churchId: church.id, churchName: church.name, reason: `Last interaction was ${church.lastInteractionDate}.` });
    }
  }
  return signals.slice(0, 8);
}

export function parseDirectoryQuestion(question) {
  const lower = question.trim().toLowerCase();
  const status = Object.entries(ENGAGEMENT_STATUS).find(([, item]) => lower.includes(item.label.toLowerCase()))?.[0]
    || (lower.includes('not contacted') ? 'unreached' : null);
  return {
    status: ['partnering', 'potential', 'unreached', 'unable_to_sign'].includes(status) ? status : null,
    missingAdvocate: /without (an )?advocate|no advocate/.test(lower),
    stale: /not (been )?contacted|over 90|needs? attention|stale/.test(lower),
  };
}

export function buildLeadershipSummary(data, today) {
  const weekStart = new Date(`${today}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - 7);
  const since = weekStart.toISOString().slice(0, 10);
  const recentInteractions = data.interactions.filter(item => item.date >= since && item.date <= today);
  const completedTasks = data.tasks.filter(item => item.status === 'completed');
  const partnering = data.churches.filter(item => item.engagementStatus === 'partnering');
  return {
    period: `${since} through ${today}`,
    churchesContacted: new Set(recentInteractions.map(item => item.churchId)).size,
    interactions: recentInteractions.length,
    completedFollowUps: completedTasks.length,
    partneringChurches: partnering.length,
    needsAttention: getRelationshipSignals(data, today).length,
  };
}
