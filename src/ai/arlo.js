// arlo.js — the assistant's actions. Each one picks its model, builds the
// prompt + data slice, and hands a deterministic stub to callModel so it runs
// today without a key. In Phase 3 the stub is ignored and the Edge Function
// returns the real Claude output in the same shape.
import { callModel, MODELS } from './client.js';
import { churchContext, todayTasks } from './context.js';
import { TODAY } from '../data/helpers.js';
import { INTERACTION_TYPE, fmtDate, fmtMoney } from '../data/labels.js';

// Friendly model names for the routing hint shown in the drawer.
export const MODEL_LABELS = {
  [MODELS.HAIKU]: 'Haiku 4.5',
  [MODELS.OPUS]: 'Opus 4.8',
};

// --- 1. Smart interaction capture (Haiku) ----------------------------------
// Messy note → { type, date, notes, suggestedTask }. Used by the drawer and the
// "Structure with Arlo" button in the Log Interaction modal.
const TYPE_HINTS = [
  [/\b(call|called|phone|rang|voicemail|left a message)\b/i, 'phone_call'],
  [/\b(email|emailed|replied|wrote back)\b/i, 'email'],
  [/\b(lunch|coffee|breakfast|dinner)\b/i, 'lunch'],
  [/\b(event|invite|invited|gala|banquet)\b/i, 'event_invitation'],
  [/\b(present|presentation|pitch|deck)\b/i, 'presentation'],
  [/\b(stand sunday)\b/i, 'stand_sunday'],
  [/\b(care community)\b/i, 'care_community_meeting'],
  [/\b(giving|donation|pledge|gift|sponsor)\b/i, 'giving_conversation'],
  [/\b(met|meeting|met with|sat down|visited)\b/i, 'meeting'],
];

const FOLLOWUP_HINTS = /\b(follow up|follow-up|circle back|next week|send (her|him|them|over)|schedule|call back|get back to|will email|set up)\b/i;

export function captureInteraction({ rawText, churchId }) {
  const model = MODELS.HAIKU;
  const system = 'You turn a coordinator\'s freeform note into a structured interaction record. '
    + 'Pick the single best interaction type, keep the notes clean and factual, and suggest a '
    + 'follow-up task only if the note clearly implies one.';
  return callModel({
    model,
    system,
    messages: [{ role: 'user', content: rawText }],
    stub: () => {
      const text = (rawText || '').trim();
      const match = TYPE_HINTS.find(([re]) => re.test(text));
      const type = match ? match[1] : 'meeting';
      // Tidy the note: collapse whitespace, capitalize first letter.
      const notes = text.replace(/\s+/g, ' ').replace(/^\w/, c => c.toUpperCase());
      const suggestedTask = FOLLOWUP_HINTS.test(text)
        ? { title: `Follow up: ${notes.slice(0, 60)}${notes.length > 60 ? '…' : ''}` }
        : null;
      return { type, date: TODAY, notes, suggestedTask };
    },
  });
}

// --- 2. Summarize a church (Haiku) -----------------------------------------
// Returns { text } — a 2–3 line status read for the profile header / drawer.
export function summarizeChurch({ churchId }) {
  const ctx = churchContext(churchId);
  const model = MODELS.HAIKU;
  const system = 'You write a 2–3 sentence status summary of a partner church for a relationship '
    + 'coordinator: where the relationship stands, momentum, and the most useful next move.';
  return callModel({
    model,
    system,
    messages: [{ role: 'user', content: JSON.stringify(ctx) }],
    stub: () => {
      if (!ctx) return { text: 'No data for this church yet.' };
      const contact = ctx.daysSinceContact <= 0
        ? 'contacted today'
        : `last contacted ${ctx.daysSinceContact} day${ctx.daysSinceContact === 1 ? '' : 's'} ago`
          + (ctx.lastInteractionType ? ` (${ctx.lastInteractionType.toLowerCase()})` : '');
      const ministry = ctx.activeMinistries.length
        ? `Active in ${ctx.activeMinistries.length} ministr${ctx.activeMinistries.length === 1 ? 'y' : 'ies'} (${ctx.activeMinistries.join(', ')}).`
        : 'No active ministry engagements yet.';
      const giving = ctx.giving.thisYear > 0
        ? `${ctx.giving.status}; ${fmtMoney(ctx.giving.thisYear)} given this year.`
        : `${ctx.giving.status} — no giving recorded this year.`;
      let nudge;
      if (ctx.daysSinceContact > 90) nudge = `It's been over ${ctx.daysSinceContact} days — worth a touch to keep momentum.`;
      else if (ctx.openTasks.length) nudge = `${ctx.openTasks.length} open task${ctx.openTasks.length === 1 ? '' : 's'} to clear.`;
      else nudge = 'Relationship looks current — keep the cadence.';
      return {
        text: `${ctx.name} is an ${ctx.engagement.toLowerCase()} in ${ctx.county}, ${contact}. ${ministry} ${giving} ${nudge}`,
      };
    },
  });
}

// --- 3. Daily brief (Haiku) ------------------------------------------------
// Returns { text, items } — a ranked call list for the day, overdue first.
export function dailyBrief() {
  const tasks = todayTasks();
  const model = MODELS.HAIKU;
  const system = 'You produce a short, prioritized daily call list for a relationship coordinator '
    + 'from their open and overdue tasks. Lead with what is overdue.';
  return callModel({
    model,
    system,
    messages: [{ role: 'user', content: JSON.stringify(tasks.slice(0, 12)) }],
    stub: () => {
      if (!tasks.length) {
        return { text: 'Nothing open or overdue right now — you\'re clear for today.', items: [] };
      }
      const top = tasks.slice(0, 6);
      const overdueCount = tasks.filter(t => t.overdue).length;
      const lead = overdueCount
        ? `${overdueCount} overdue, ${tasks.length} open in total. Start here:`
        : `${tasks.length} open follow-up${tasks.length === 1 ? '' : 's'}. Suggested order:`;
      const lines = top.map(t => {
        const flag = t.overdue ? 'OVERDUE' : `due ${fmtDate(t.dueDate)}`;
        return `• ${t.church} (${t.county}) — ${t.title} [${flag}]`;
      });
      return { text: `${lead}\n${lines.join('\n')}`, items: top };
    },
  });
}

// --- 4. Portfolio coaching (Opus) — wired up in Phase 2 --------------------
// Routed to Opus 4.8 because it reasons across the whole portfolio. The Edge
// Function will enable adaptive thinking for this one. Phase 1 returns a stub
// so the drawer's free-text box does something honest.
export function coach({ question }) {
  return callModel({
    model: MODELS.OPUS,
    system: 'You are a coaching partner for a church relationship coordinator, reasoning across '
      + 'their whole portfolio to find where momentum is slipping and what to do next.',
    messages: [{ role: 'user', content: question }],
    stub: () => ({
      text: 'Portfolio coaching runs on Opus 4.8 and arrives in Phase 2 — it\'ll read across every '
        + 'church to answer questions like this. For now, try "What\'s on today?" or summarize a church.',
      placeholder: true,
    }),
  });
}

// Re-export for convenience in the UI.
export { INTERACTION_TYPE };
