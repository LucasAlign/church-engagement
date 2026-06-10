// transfer.js — CSV/Excel export and import over the mock db.
// Export: one workbook sheet (or one CSV) per entity, with human-readable
// headers and enum labels. Import: parse a workbook or CSV back into a
// preview plan (new / update / unchanged / error per row) that the user
// confirms before it is applied to the db.
import * as XLSX from 'xlsx';
import db from './db.js';
import { genId, TODAY } from './helpers.js';
import {
  ENGAGEMENT_STATUS, GIVING_TYPE, INTERACTION_TYPE, MINISTRY_TYPE, MINISTRY_STATUS,
  TASK_PRIORITY, TASK_STATUS, KFA_ROLE, PREFERRED_CONTACT, CARE_COMMUNITY_STATUS,
  ADVOCATE_STATUS, CONNECTION_TYPE, CONNECTION_STATUS,
} from './labels.js';

// ---- value formatting / parsing ----

const norm = v => String(v ?? '').trim().toLowerCase();

function enumLabel(map, key) {
  const entry = map[key];
  if (!entry) return key || '';
  return typeof entry === 'string' ? entry : entry.label;
}
function enumKey(map, value) {
  const v = norm(value);
  if (!v) return null;
  for (const [key, entry] of Object.entries(map)) {
    const label = typeof entry === 'string' ? entry : entry.label;
    if (norm(key) === v || norm(label) === v) return key;
  }
  return null;
}

function toIsoDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (isNaN(value)) return null;
    return new Date(value.getTime() - value.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    // Excel serial date (days since 1899-12-30)
    return new Date(Math.round((value - 25569) * 864e5)).toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${year}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

const toBool = v => ['yes', 'true', '1', 'y'].includes(norm(v));
function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

const userName = id => db.users.find(u => u.id === id)?.name || '';
const userIdByName = name => db.users.find(u => norm(u.name) === norm(name))?.id || null;
const contactName = id => db.contacts.find(c => c.id === id)?.name || '';
const contactIdByName = name => db.contacts.find(c => norm(c.name) === norm(name))?.id || null;

// Field types: fmt turns a db value into a cell, parse turns a cell back.
const F = {
  text: { fmt: v => v ?? '', parse: v => (String(v ?? '').trim() === '' ? null : String(v).trim()) },
  number: { fmt: v => v ?? '', parse: toNumber },
  date: { fmt: v => v ?? '', parse: toIsoDate },
  bool: { fmt: v => (v ? 'Yes' : 'No'), parse: toBool },
  enum: map => ({ fmt: v => enumLabel(map, v), parse: v => enumKey(map, v) }),
  user: { fmt: userName, parse: userIdByName },
  contact: { fmt: contactName, parse: contactIdByName },
  members: {
    fmt: v => (v || []).map(m => (m.role ? `${m.name} (${m.role})` : m.name)).join('; '),
    parse: v => String(v ?? '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
      const match = s.match(/^(.*?)\s*\(([^)]*)\)$/);
      return match ? { name: match[1], role: match[2] } : { name: s, role: '' };
    }),
  },
};

const field = (key, header, type = F.text) => ({ key, header, ...type });

// ---- entity specs (one sheet each) ----

export const ENTITIES = [
  {
    key: 'churches', sheet: 'Churches', collection: 'churches', idPrefix: 'ch',
    nameOf: r => r.name, matchOn: 'name',
    defaults: () => ({ notes: null, createdAt: TODAY, updatedAt: TODAY }),
    fields: [
      field('name', 'Name'),
      field('address', 'Address'),
      field('city', 'City'),
      field('state', 'State'),
      field('zip', 'Zip'),
      field('county', 'County'),
      field('phone', 'Phone'),
      field('email', 'Email'),
      field('website', 'Website'),
      field('denomination', 'Denomination'),
      field('attendanceMin', 'Attendance Min', F.number),
      field('attendanceMax', 'Attendance Max', F.number),
      field('engagementStatus', 'Engagement Status', F.enum(ENGAGEMENT_STATUS)),
      field('firstContactDate', 'First Contact Date', F.date),
      field('lastInteractionDate', 'Last Interaction Date', F.date),
      field('assignedCoordinatorId', 'Coordinator', F.user),
      field('hasCareCommmunity', 'Has Care Community', F.bool),
    ],
  },
  {
    key: 'staff', sheet: 'Staff', collection: 'contacts', idPrefix: 'con',
    churchScoped: true, nameOf: r => r.name, matchOn: 'name',
    defaults: () => ({ archived: false }),
    fields: [
      field('name', 'Name'),
      field('position', 'Position'),
      field('email', 'Email'),
      field('phone', 'Phone'),
      field('preferredContact', 'Preferred Contact', F.enum(PREFERRED_CONTACT)),
      field('kfaRole', 'KFA Role', F.enum(KFA_ROLE)),
      field('notes', 'Notes'),
    ],
  },
  {
    key: 'careCommunities', sheet: 'Care Communities', collection: 'careCommunities', idPrefix: 'cc',
    churchScoped: true, nameOf: r => r.name, matchOn: 'name',
    defaults: () => ({ members: [] }),
    fields: [
      field('name', 'Name'),
      field('status', 'Status', F.enum(CARE_COMMUNITY_STATUS)),
      field('lead', 'Lead'),
      field('familyServed', 'Family Served'),
      field('startDate', 'Start Date', F.date),
      field('members', 'Team Members', F.members),
      field('notes', 'Notes'),
    ],
  },
  {
    key: 'advocates', sheet: 'Advocates', collection: 'advocates', idPrefix: 'adv',
    churchScoped: true, nameOf: r => r.name, matchOn: 'name',
    fields: [
      field('name', 'Name'),
      field('email', 'Email'),
      field('phone', 'Phone'),
      field('role', 'Role'),
      field('status', 'Status', F.enum(ADVOCATE_STATUS)),
      field('trainedDate', 'Trained Date', F.date),
      field('notes', 'Notes'),
    ],
  },
  {
    key: 'connections', sheet: 'Connections', collection: 'connections', idPrefix: 'cx',
    churchScoped: true, nameOf: r => r.name, matchOn: 'name',
    fields: [
      field('name', 'Name'),
      field('email', 'Email'),
      field('phone', 'Phone'),
      field('connectionType', 'Connection Type', F.enum(CONNECTION_TYPE)),
      field('status', 'Status', F.enum(CONNECTION_STATUS)),
      field('notes', 'Notes'),
    ],
  },
  {
    key: 'ministries', sheet: 'Ministries', collection: 'ministryEngagements', idPrefix: 'min',
    churchScoped: true, nameOf: r => enumLabel(MINISTRY_TYPE, r.ministry), matchOn: 'ministry',
    fields: [
      field('ministry', 'Ministry', F.enum(MINISTRY_TYPE)),
      field('status', 'Status', F.enum(MINISTRY_STATUS)),
      field('startDate', 'Start Date', F.date),
      field('coordinatorId', 'Coordinator', F.contact),
      field('notes', 'Notes'),
    ],
  },
  {
    key: 'giving', sheet: 'Giving', collection: 'givingRecords', idPrefix: 'giv',
    churchScoped: true, nameOf: r => `${r.date} · $${r.amount}`,
    fields: [
      field('date', 'Date', F.date),
      field('amount', 'Amount', F.number),
      field('fund', 'Fund'),
      field('type', 'Type', F.enum(GIVING_TYPE)),
    ],
  },
  {
    key: 'interactions', sheet: 'Interactions', collection: 'interactions', idPrefix: 'int',
    churchScoped: true, nameOf: r => `${r.date} · ${enumLabel(INTERACTION_TYPE, r.type)}`,
    defaults: () => ({ contactId: null, attendeeCount: null }),
    fields: [
      field('date', 'Date', F.date),
      field('type', 'Type', F.enum(INTERACTION_TYPE)),
      field('userId', 'Logged By', F.user),
      field('notes', 'Notes'),
      field('attendeeCount', 'Attendee Count', F.number),
    ],
  },
  {
    key: 'notes', sheet: 'Notes', collection: 'churchNotes', idPrefix: 'note',
    churchScoped: true, nameOf: r => (r.body || '').slice(0, 60),
    defaults: () => ({ createdAt: TODAY }),
    fields: [
      field('body', 'Note'),
      field('authorId', 'Author', F.user),
      field('pinned', 'Pinned', F.bool),
      field('internalOnly', 'Internal Only', F.bool),
      field('createdAt', 'Created', F.date),
    ],
  },
  {
    key: 'tasks', sheet: 'Tasks', collection: 'tasks', idPrefix: 'tsk',
    churchScoped: true, nameOf: r => r.title, matchOn: 'title',
    defaults: () => ({ createdAt: TODAY }),
    fields: [
      field('title', 'Task'),
      field('assignedTo', 'Assigned To', F.user),
      field('dueDate', 'Due Date', F.date),
      field('priority', 'Priority', F.enum(TASK_PRIORITY)),
      field('status', 'Status', F.enum(TASK_STATUS)),
    ],
  },
];

// ---- export ----

function buildRows(ent) {
  return db[ent.collection].map(rec => {
    const row = { Id: rec.id };
    if (ent.churchScoped) {
      row['Church Id'] = rec.churchId;
      row['Church'] = db.churches.find(c => c.id === rec.churchId)?.name || '';
    }
    for (const f of ent.fields) row[f.header] = f.fmt(rec[f.key]);
    return row;
  });
}

export function exportExcel() {
  const wb = XLSX.utils.book_new();
  for (const ent of ENTITIES) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildRows(ent)), ent.sheet);
  }
  XLSX.writeFile(wb, `church-data-${TODAY}.xlsx`);
}

export function exportCsv(entityKey) {
  const ent = ENTITIES.find(e => e.key === entityKey);
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(buildRows(ent)));
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${ent.sheet.toLowerCase().replace(/\s+/g, '-')}-${TODAY}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---- import ----

// Match a sheet to an entity by sheet name, falling back to header overlap
// (so a CSV exported from any sheet is recognized regardless of file name).
function matchEntity(sheetName, headers) {
  const byName = ENTITIES.find(e => norm(e.sheet) === norm(sheetName));
  if (byName) return byName;
  const set = new Set(headers.map(norm));
  let best = null;
  let bestScore = 0;
  for (const ent of ENTITIES) {
    const score = ent.fields.filter(f => set.has(norm(f.header))).length;
    if (score > bestScore) { best = ent; bestScore = score; }
  }
  return bestScore >= Math.min(3, best?.fields.length ?? 3) ? best : null;
}

function resolveChurch(row, pendingChurchNames) {
  const id = String(row['Church Id'] ?? '').trim();
  if (id) {
    const church = db.churches.find(c => c.id === id);
    if (church) return { churchId: church.id };
  }
  const name = String(row['Church'] ?? '').trim();
  if (name) {
    const church = db.churches.find(c => norm(c.name) === norm(name));
    if (church) return { churchId: church.id };
    if (pendingChurchNames.has(norm(name))) return { churchName: name };
  }
  return { error: `Church not found: ${name || id || '(blank)'}` };
}

function buildEntityPlan(ent, rows, pendingChurchNames) {
  const items = rows.map((row, idx) => {
    const record = {};
    for (const f of ent.fields) {
      if (f.header in row) record[f.key] = f.parse(row[f.header]);
    }
    const label = ent.nameOf(record) || '(blank row)';

    let churchRef = {};
    if (ent.churchScoped) {
      churchRef = resolveChurch(row, pendingChurchNames);
      if (churchRef.error) return { idx, label, action: 'error', reason: churchRef.error };
    }

    const id = String(row.Id ?? '').trim();
    let existing = id ? db[ent.collection].find(r => r.id === id) : null;
    if (!existing && ent.matchOn && record[ent.matchOn]) {
      existing = db[ent.collection].find(r =>
        norm(r[ent.matchOn]) === norm(record[ent.matchOn]) &&
        (!ent.churchScoped || r.churchId === churchRef.churchId));
    }

    if (existing) {
      const changes = ent.fields
        .filter(f => f.key in record && JSON.stringify(record[f.key]) !== JSON.stringify(existing[f.key]))
        .map(f => f.header);
      if (!changes.length) return { idx, label, action: 'unchanged', existing };
      return { idx, label, action: 'update', changes, record, existing };
    }
    if (!record[ent.matchOn || ent.fields[0].key]) {
      return { idx, label, action: 'error', reason: 'Missing required name field' };
    }
    return { idx, label, action: 'new', record, ...churchRef };
  });
  return { entity: ent, items };
}

export async function parseImportFile(file) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const groups = [];

  // Collect new church names first so child rows in the same file can
  // reference churches that don't exist yet.
  const pendingChurchNames = new Set();
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    if (!rows.length) continue;
    const ent = matchEntity(sheetName, Object.keys(rows[0]));
    if (ent?.key === 'churches') {
      for (const row of rows) {
        const name = String(row.Name ?? '').trim();
        if (name && !db.churches.find(c => norm(c.name) === norm(name))) {
          pendingChurchNames.add(norm(name));
        }
      }
    }
  }

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    if (!rows.length) continue;
    const ent = matchEntity(sheetName, Object.keys(rows[0]));
    if (!ent) {
      groups.push({ entity: null, sheetName, items: [], error: 'Columns not recognized' });
      continue;
    }
    groups.push({ ...buildEntityPlan(ent, rows, pendingChurchNames), sheetName });
  }
  return groups;
}

// Apply the selected plan rows. Churches go first so child rows that
// reference a brand-new church by name can resolve its generated id.
export function applyImport(groups, selected) {
  let created = 0;
  let updated = 0;
  const ordered = [...groups].sort((a, b) =>
    (a.entity?.key === 'churches' ? -1 : 0) - (b.entity?.key === 'churches' ? -1 : 0));

  for (const group of ordered) {
    const ent = group.entity;
    if (!ent) continue;
    for (const item of group.items) {
      if (!selected.has(`${group.sheetName}:${item.idx}`)) continue;
      if (item.action === 'update') {
        Object.assign(item.existing, item.record);
        if (ent.key === 'churches') item.existing.updatedAt = TODAY;
        updated += 1;
      } else if (item.action === 'new') {
        const rec = { id: genId(ent.idPrefix), ...(ent.defaults?.() || {}), ...item.record };
        if (ent.churchScoped) {
          rec.churchId = item.churchId
            || db.churches.find(c => norm(c.name) === norm(item.churchName))?.id;
          if (!rec.churchId) continue;
        }
        db[ent.collection].push(rec);
        created += 1;
      }
    }
  }
  return { created, updated };
}
