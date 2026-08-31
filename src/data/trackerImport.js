// trackerImport.js — adapter for human-maintained "Church Tracking" spreadsheets.
//
// The importer in transfer.js expects the app's own export shape: one entity
// per sheet, with headers like "Name" / "Position" and a "Church" column on
// child sheets. Real tracking sheets look nothing like that. They typically
// have a single "Church" column with the name filled in only on a group's
// first row, a "Name / Contact" column for people, "Date Contacted" +
// "Comments" per touch, blank spacer rows between churches, generic
// "to church" contacts, Excel serial dates, and multiple emails per cell.
//
// This module detects that layout and expands one tracker sheet into the
// three virtual sheets (Churches, Staff, Interactions) the existing pipeline
// already imports — so nothing downstream has to change.

import * as XLSX from 'xlsx';
import { INTERACTION_TYPE } from './labels.js';

// Header aliases -> canonical tracker column.
const COLS = {
  church: ['church', 'church name'],
  role: ['position / role', 'position/role', 'role', 'position', 'title'],
  name: ['name / contact', 'name/contact', 'contact', 'name', 'contact name'],
  email: ['email', 'e-mail'],
  phone: ['phone', 'telephone'],
  office: ['office'],
  cell: ['cell', 'mobile'],
  address: ['address'],
  date: ['date contacted', 'date', 'last contacted'],
  comments: ['comments', 'comment', 'notes'],
  denomination: ['denomination', 'affiliation'],
};

const norm = s => String(s ?? '').trim().toLowerCase();

// Cell values that mean "empty" even though the cell isn't blank.
const PLACEHOLDERS = new Set([
  'n/a', 'na', 'none', 'no email', 'no email address', 'no phone',
  'to church', 'contact form on website', 'contact form', 'unknown', '-', '--',
]);

// Name-column values that are not a real person (info belongs to the church).
const NON_PERSON = new Set(['to church', 'church contact', 'contact form on website']);

const clean = v => {
  const s = String(v ?? '').trim();
  if (!s) return '';
  return PLACEHOLDERS.has(s.toLowerCase()) ? '' : s;
};

// Map a sheet's actual headers to canonical keys -> { key: actualHeader }.
function mapHeaders(headers) {
  const found = {};
  for (const h of headers) {
    const n = norm(h);
    for (const [key, aliases] of Object.entries(COLS)) {
      if (aliases.includes(n)) { found[key] = h; break; }
    }
  }
  return found;
}

// A sheet is a tracker sheet if it has a Church column AND a person column
// that is "Name / Contact"-style (not the plain "Name" used by the app's own
// Churches export). That combination is what distinguishes the two formats.
export function detectTracker(headers) {
  const m = mapHeaders(headers);
  const personIsContact = m.name && norm(m.name) !== 'name';
  return (m.church && personIsContact) ? m : null;
}

function splitEmails(v) {
  const s = clean(v);
  if (!s || !s.includes('@')) return [];
  return s.split(/[,;/]+/).map(e => e.trim()).filter(e => e.includes('@'));
}

function phone(v) {
  const s = clean(v);
  if (!s) return '';
  const d = s.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return s;
}

function toIsoDate(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' || /^\d{4,6}$/.test(String(v).trim())) {
    const n = Number(v);
    if (n > 20000 && n < 60000) {
      const d = XLSX.SSF.parse_date_code(n);
      if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  const d = new Date(v);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

// Best-guess INTERACTION_TYPE key from free-text comment (or role) text.
function interactionType(text) {
  const t = norm(text);
  if (/\bspoke\b|preached|presented|presentation|pulpit/.test(t)) return 'presentation';
  if (/\bcalled\b|\bcall\b|\bphone\b|voicemail|left msg|left a message/.test(t)) return 'phone_call';
  if (/breakfast|\blunch\b|\bdinner\b/.test(t)) return 'lunch';
  if (/\binvite|invitation/.test(t)) return 'event_invitation';
  if (/\bmeeting\b|met with|\bvisit|attended|in person/.test(t)) return 'meeting';
  if (/\bemail|emailed|sent .*info|contact form|fundraiser info/.test(t)) return 'email';
  return 'follow_up';
}

// Expand tracker rows (objects keyed by ACTUAL headers) into the three sheets
// keyed by the app's export headers. Church names propagate down continuation
// rows; spacer rows drop; generic contacts fold into the church record.
export function expandTracker(rows, headerMap) {
  const val = key => row => (headerMap[key] ? row[headerMap[key]] : undefined);
  const get = Object.fromEntries(Object.keys(COLS).map(k => [k, val(k)]));

  const churches = new Map(); // lowerName -> church row
  const contacted = new Set(); // lowerName of churches with any interaction
  const staff = [];
  const interactions = [];
  const notes = [];
  let currentName = null;

  for (const row of rows) {
    const churchName = clean(get.church(row));
    const role = clean(get.role(row));
    const rawName = clean(get.name(row));
    const emails = splitEmails(get.email(row));
    const ph = phone(get.phone(row));
    const address = clean(get.address(row));
    const denom = clean(get.denomination(row));
    const comments = clean(get.comments(row));
    const date = toIsoDate(get.date(row));

    const hasData = [churchName, role, rawName, address, denom, comments, date, ph].some(Boolean) || emails.length;
    if (!hasData) continue; // blank spacer row

    const name = churchName || currentName; // continuation row -> church above
    if (!name) continue; // orphan row with no church context
    currentName = name;

    const key = name.toLowerCase();
    if (!churches.has(key)) {
      churches.set(key, { Name: name, Denomination: denom || '', Address: address || '', Phone: '', Email: '' });
    }
    const ch = churches.get(key);
    if (!ch.Denomination && denom) ch.Denomination = denom;
    if (!ch.Address && address) ch.Address = address;

    const isPerson = rawName && !NON_PERSON.has(rawName.toLowerCase());
    if (isPerson) {
      staff.push({ Church: name, Name: rawName, Position: role || '', Email: emails[0] || '', Phone: ph });
    } else {
      if (emails[0] && !ch.Email) ch.Email = emails[0];
      if (ph && !ch.Phone) ch.Phone = ph;
    }

    if (date) {
      contacted.add(key);
      interactions.push({
        Church: name,
        Date: date,
        Type: INTERACTION_TYPE[interactionType(comments || role)].label,
        Notes: comments,
      });
    } else if (comments) {
      // A comment with no date isn't an interaction — keep it as a church note
      // rather than dropping it (the importer requires a date on interactions).
      notes.push({ Church: name, Note: comments });
    }
  }

  // A church we've already reached out to is "Potential"; the rest "Unreached".
  for (const [key, ch] of churches) {
    ch['Engagement Status'] = contacted.has(key) ? 'Potential' : 'Unreached';
  }

  return {
    churches: [...churches.values()],
    staff,
    interactions,
    notes,
  };
}
