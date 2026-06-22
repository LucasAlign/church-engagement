// karen.js — the assistant's actions. Each one picks its model, builds the
// prompt + data slice, and hands a deterministic stub to callModel so it runs
// today without a key. When the endpoint is wired up the stub is ignored and
// the model returns the real output in the same shape.
import { callModel, MODELS } from './client.js';
import { churchContext, todayTasks, portfolioContext, primaryContact } from './context.js';
import { TODAY } from '../data/helpers.js';
import { INTERACTION_TYPE, fmtDate, fmtMoney } from '../data/labels.js';

// Friendly model names for the routing hint shown in the drawer.
export const MODEL_LABELS = {
  [MODELS.FAST]: 'GPT-4o mini',
  [MODELS.SMART]: 'GPT-4o',
};

// --- 1. Smart interaction capture (Haiku) ----------------------------------
// Messy note → { type, date, notes, suggestedTask }.
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
  const model = MODELS.FAST;
  const system = 'You turn a coordinator\'s freeform note into a structured interaction record. '
    + 'Pick the single best interaction type, keep the notes clean and factual, and suggest a '
    + 'follow-up task only if the note clearly implies one.';
  return callModel({
    model,
    system,
    local: true, // capture stays rule-based — no need to spend a model call to parse a note
    messages: [{ role: 'user', content: rawText }],
    stub: () => {
      const text = (rawText || '').trim();
      const match = TYPE_HINTS.find(([re]) => re.test(text));
      const type = match ? match[1] : 'meeting';
      const notes = text.replace(/\s+/g, ' ').replace(/^\w/, c => c.toUpperCase());
      const suggestedTask = FOLLOWUP_HINTS.test(text)
        ? { title: `Follow up: ${notes.slice(0, 60)}${notes.length > 60 ? '…' : ''}` }
        : null;
      return { type, date: TODAY, notes, suggestedTask };
    },
  });
}

// --- 2. Summarize a church (Haiku) -----------------------------------------
export function summarizeChurch({ churchId }) {
  const ctx = churchContext(churchId);
  const model = MODELS.FAST;
  const system = 'You write a 2–3 sentence status summary of a partner church for a relationship '
    + 'coordinator: where the relationship stands, momentum, and the most useful next move.';
  return callModel({
    model,
    system,
    messages: [{ role: 'user', content: JSON.stringify(ctx) }],
    stub: () => {
      if (!ctx) return { model, text: 'No data for this church yet.' };
      const d = ctx.daysSinceContact;
      const contact = d == null
        ? 'no logged contact yet'
        : d <= 0
          ? 'contacted today'
          : `last contacted ${d} day${d === 1 ? '' : 's'} ago`
            + (ctx.lastInteractionType ? ` (${ctx.lastInteractionType.toLowerCase()})` : '');
      const ministry = ctx.activeMinistries.length
        ? `Active in ${ctx.activeMinistries.length} ministr${ctx.activeMinistries.length === 1 ? 'y' : 'ies'} (${ctx.activeMinistries.join(', ')}).`
        : 'No active ministry engagements yet.';
      const giving = ctx.giving.thisYear > 0
        ? `${ctx.giving.status}; ${fmtMoney(ctx.giving.thisYear)} given this year.`
        : `${ctx.giving.status} — no giving recorded this year.`;
      let nudge;
      if (d != null && d > 90) nudge = `It's been over ${d} days — worth a touch to keep momentum.`;
      else if (ctx.openTasks.length) nudge = `${ctx.openTasks.length} open task${ctx.openTasks.length === 1 ? '' : 's'} to clear.`;
      else nudge = 'Relationship looks current — keep the cadence.';
      return {
        model,
        text: `${ctx.name} is an ${ctx.engagement.toLowerCase()} in ${ctx.county || 'its county'}, ${contact}. ${ministry} ${giving} ${nudge}`,
      };
    },
  });
}

// --- 3. Daily brief (Haiku) ------------------------------------------------
export function dailyBrief() {
  const tasks = todayTasks();
  const model = MODELS.FAST;
  const system = 'You produce a short, prioritized daily call list for a relationship coordinator '
    + 'from their open and overdue tasks. Lead with what is overdue.';
  return callModel({
    model,
    system,
    messages: [{ role: 'user', content: JSON.stringify(tasks.slice(0, 12)) }],
    stub: () => {
      if (!tasks.length) {
        return { model, text: 'Nothing open or overdue right now — you\'re clear for today.', items: [] };
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
      return { model, text: `${lead}\n${lines.join('\n')}`, items: top };
    },
  });
}

// --- 4. Draft a follow-up (Haiku) ------------------------------------------
const TITLE_RE = /^(pastor|rev|reverend|dr|fr|father|mr|mrs|ms|bishop|elder)\.?\s+/i;
function firstName(name) {
  const stripped = (name || '').replace(TITLE_RE, '').trim();
  return stripped.split(/\s+/)[0] || 'there';
}

export function draftFollowUp({ churchId }) {
  const ctx = churchContext(churchId);
  const contact = primaryContact(churchId);
  const model = MODELS.FAST;
  const system = 'You draft a short, warm, specific follow-up for a church relationship '
    + 'coordinator — an email or a call script depending on the contact\'s preference. '
    + 'Reference where the relationship stands and propose one clear next step.';
  return callModel({
    model,
    system,
    messages: [{ role: 'user', content: JSON.stringify({ church: ctx, contact }) }],
    stub: () => {
      if (!ctx) return { model, text: 'No data for this church yet.', channel: 'email' };
      const call = contact && ['phone', 'text'].includes(contact.preferredContact);
      const who = contact ? firstName(contact.name) : 'there';
      const d = ctx.daysSinceContact;

      let hook;
      if (d != null && d > 90) hook = `it's been a while since we connected (about ${d} days)`;
      else if (ctx.activeMinistries.length) hook = `your team's work in ${ctx.activeMinistries[0]}`;
      else if (ctx.giving.thisYear > 0) hook = 'your partnership with us this year';
      else hook = 'where things stand between our teams';

      const ask = ctx.activeMinistries.length
        ? `Could we grab 20 minutes to look at how ${ctx.activeMinistries[0]} is going and what's next?`
        : 'Could we find 20 minutes for a quick catch-up in the next week or two?';

      if (call) {
        const text = [
          `Call script — ${ctx.name} (${who})`,
          '',
          `• Open warm: thank ${who} for ${hook}.`,
          `• Reference: ${ctx.engagement.toLowerCase()}, last touch ${d == null ? 'not yet logged' : d <= 0 ? 'today' : `${d}d ago`}.`,
          `• Ask: ${ask}`,
          '• Close: confirm a time, note it for follow-up.',
        ].join('\n');
        return { model, text, channel: 'call' };
      }

      const text = [
        `Subject: Catching up — ${ctx.name}`,
        '',
        `Hi ${who},`,
        '',
        `I've been thinking about ${hook}, and wanted to reach out. ${ask}`,
        '',
        'Let me know what works and I\'ll send an invite.',
        '',
        'Warmly,',
        'Keystone Family Alliance',
      ].join('\n');
      return { model, text, channel: 'email' };
    },
  });
}

// --- 5. Portfolio coaching (Opus) ------------------------------------------
const FOCUS = [
  [/\bgiv|donat|money|fund|pledge|revenue\b/i, 'giving'],
  [/\boverdue|behind|task|catch ?up|backlog\b/i, 'overdue'],
  [/\bmomentum|slip|drift|quiet|cold|stall|reconnect|lapsed?\b/i, 'momentum'],
];

export function coach({ question }) {
  const ctx = portfolioContext();
  const model = MODELS.SMART;
  const system = 'You are a coaching partner for a church relationship coordinator. Reason across '
    + 'their whole portfolio to find where momentum is slipping, where giving is softening, and '
    + 'where work is piling up — then recommend two or three concrete plays. Be specific and brief.';
  return callModel({
    model,
    system,
    messages: [{ role: 'user', content: JSON.stringify({ question, portfolio: ctx }) }],
    stub: () => ({ model, text: coachAnalysis(question || '', ctx) }),
  });
}

function coachAnalysis(question, ctx) {
  const match = FOCUS.find(([re]) => re.test(question));
  const focus = match ? match[1] : 'momentum';
  const countyMatch = ctx.overdueByCounty.find(c => question.toLowerCase().includes(String(c.county).toLowerCase()));

  if (!ctx.totalChurches) {
    return 'No churches are loaded yet, so there\'s nothing to coach on. Once your portfolio is in, '
      + 'ask me where momentum is slipping or which partners need attention.';
  }

  const sections = {
    momentum: () => {
      if (!ctx.slipping.length) return `All ${ctx.partnerCount} partners have been touched in the last 30 days — momentum is healthy.`;
      const top = ctx.slipping.slice(0, 3)
        .map(c => `• ${c.name} (${c.county}) — ${c.daysSinceContact}d since contact, ${c.status.toLowerCase()}${c.coordinator ? `, ${c.coordinator}` : ', unassigned'}`)
        .join('\n');
      return `${ctx.slipping.length} partner${ctx.slipping.length === 1 ? '' : 's'} drifting (30+ days quiet):\n${top}`;
    },
    giving: () => {
      if (!ctx.givingWatch.length) return 'No partners are materially down on giving versus last year.';
      const top = ctx.givingWatch.slice(0, 3)
        .map(c => `• ${c.name} (${c.county}) — ${fmtMoney(c.thisYear)} this year vs ${fmtMoney(c.lastYear)} last`)
        .join('\n');
      return `Giving softening:\n${top}`;
    },
    overdue: () => {
      if (!ctx.overdueTotal) return 'No overdue tasks across the portfolio.';
      const top = ctx.overdueByCounty.slice(0, 3).map(c => `${c.county} (${c.count})`).join(', ');
      return `${ctx.overdueTotal} overdue task${ctx.overdueTotal === 1 ? '' : 's'}, concentrated in ${top}.`;
    },
  };

  const order = focus === 'giving' ? ['giving', 'momentum', 'overdue']
    : focus === 'overdue' ? ['overdue', 'momentum', 'giving']
    : ['momentum', 'giving', 'overdue'];

  const body = order.map(k => sections[k]()).join('\n\n');

  const plays = [];
  if (countyMatch) plays.push(`Block a ${countyMatch.county} call-down day — ${countyMatch.count} overdue task${countyMatch.count === 1 ? '' : 's'} sitting there.`);
  if (ctx.slipping[0]) plays.push(`Reconnect with ${ctx.slipping[0].name} first — ${ctx.slipping[0].daysSinceContact} days dark and it's a ${ctx.slipping[0].status.toLowerCase()}.`);
  if (ctx.givingWatch[0]) plays.push(`Open a giving conversation with ${ctx.givingWatch[0].name} — down ${fmtMoney(ctx.givingWatch[0].lastYear - ctx.givingWatch[0].thisYear)} on last year.`);
  if (ctx.flagsByReason.missing_report) plays.push(`Chase the ${ctx.flagsByReason.missing_report} outstanding impact report${ctx.flagsByReason.missing_report === 1 ? '' : 's'} — partners expect them back.`);
  if (!plays.length) plays.push('Keep the current cadence — nothing is flashing red this week.');

  const playText = plays.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n');
  return `${body}\n\nPlays:\n${playText}`;
}

export { INTERACTION_TYPE };
