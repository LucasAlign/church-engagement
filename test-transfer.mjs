// Round-trip test for src/data/transfer.js (run with: node test-transfer.mjs)
import * as XLSX from 'xlsx';
import db from './src/data/db.js';
import { ENTITIES, parseImportFile, applyImport } from './src/data/transfer.js';

// Build the same workbook exportExcel() produces, in-memory.
function buildWorkbook() {
  const wb = XLSX.utils.book_new();
  for (const ent of ENTITIES) {
    const rows = db[ent.collection].map(rec => {
      const row = { Id: rec.id };
      if (ent.churchScoped) {
        row['Church Id'] = rec.churchId;
        row['Church'] = db.churches.find(c => c.id === rec.churchId)?.name || '';
      }
      for (const f of ent.fields) row[f.header] = f.fmt(rec[f.key]);
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), ent.sheet);
  }
  return wb;
}

const fakeFile = wb => ({
  arrayBuffer: async () => XLSX.write(wb, { type: 'array', bookType: 'xlsx' }),
});

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failures++;
};

// 1. Re-importing an unmodified export should show every row as unchanged.
const groups1 = await parseImportFile(fakeFile(buildWorkbook()));
check(groups1.length === ENTITIES.length, `recognized all ${ENTITIES.length} sheets (got ${groups1.length})`);
const nonUnchanged = groups1.flatMap(g => g.items.filter(i => i.action !== 'unchanged')
  .map(i => `${g.sheetName}/${i.label}: ${i.action} ${i.reason || (i.changes || []).join(',')}`));
check(nonUnchanged.length === 0, `clean round-trip is all unchanged${nonUnchanged.length ? ' — ' + nonUnchanged.slice(0, 5).join(' | ') : ''}`);

// 2. Edits and new rows (including a new church referenced by child rows) preview correctly.
const wb2 = buildWorkbook();
const churchRows = XLSX.utils.sheet_to_json(wb2.Sheets['Churches'], { defval: '' });
churchRows[0]['Phone'] = '(610) 555-9999';
churchRows.push({
  Id: '', Name: 'Test Chapel', City: 'Reading', State: 'PA',
  'Engagement Status': 'Interested', 'Attendance Min': 50, 'Attendance Max': 90,
  Coordinator: 'Sarah Chen', 'Has Care Community': 'No',
});
wb2.Sheets['Churches'] = XLSX.utils.json_to_sheet(churchRows);
const staffRows = XLSX.utils.sheet_to_json(wb2.Sheets['Staff'], { defval: '' });
staffRows.push({ Id: '', 'Church Id': '', Church: 'Test Chapel', Name: 'Pastor New', Position: 'Lead Pastor', 'KFA Role': 'Champion', 'Preferred Contact': 'Prefers email' });
staffRows.push({ Id: '', 'Church Id': '', Church: 'Nowhere Church', Name: 'Lost Person' });
wb2.Sheets['Staff'] = XLSX.utils.json_to_sheet(staffRows);

const groups2 = await parseImportFile(fakeFile(wb2));
const churchGroup = groups2.find(g => g.entity?.key === 'churches');
const staffGroup = groups2.find(g => g.entity?.key === 'staff');
const upd = churchGroup.items.find(i => i.action === 'update');
check(upd && upd.changes.join() === 'Phone', `church edit detected as update of Phone (got ${upd?.changes})`);
const newChurch = churchGroup.items.find(i => i.action === 'new');
check(newChurch?.label === 'Test Chapel', 'new church detected');
check(newChurch?.record.engagementStatus === 'interested', `enum label parsed back to key (got ${newChurch?.record.engagementStatus})`);
check(newChurch?.record.assignedCoordinatorId === 'usr_001', `coordinator resolved by name (got ${newChurch?.record.assignedCoordinatorId})`);
const newStaff = staffGroup.items.find(i => i.label === 'Pastor New');
check(newStaff?.action === 'new' && newStaff.churchName === 'Test Chapel', 'staff row resolves pending new church by name');
const lost = staffGroup.items.find(i => i.label === 'Lost Person');
check(lost?.action === 'error', `unknown church flagged as error (${lost?.reason})`);

// 3. Apply: new church created first, then staff attached to it.
const selected = new Set([
  `${churchGroup.sheetName}:${upd.idx}`,
  `${churchGroup.sheetName}:${newChurch.idx}`,
  `${staffGroup.sheetName}:${newStaff.idx}`,
]);
const before = db.churches.length;
const result = applyImport(groups2, selected);
check(result.created === 2 && result.updated === 1, `apply created 2 / updated 1 (got ${result.created}/${result.updated})`);
const created = db.churches.find(c => c.name === 'Test Chapel');
check(!!created && db.churches.length === before + 1, 'new church in db');
const staff = db.contacts.find(c => c.name === 'Pastor New');
check(staff?.churchId === created?.id, 'new staff linked to newly created church');
check(db.churches[0].phone === '(610) 555-9999', 'church phone updated in place');

// 4. Single-sheet CSV recognized by headers even with an arbitrary sheet name.
const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet([
  { Church: 'Covenant Church', Name: 'Jane Advocate', Email: 'j@x.com', Role: 'Foster care advocate', Status: 'Active', 'Trained Date': '2026-01-05' },
]));
const csvWb = XLSX.read(csv, { type: 'string' });
const groups3 = await parseImportFile(fakeFile(csvWb));
check(groups3[0]?.entity?.key === 'advocates', `CSV matched to Advocates by headers (got ${groups3[0]?.entity?.key})`);
check(groups3[0]?.items[0]?.action === 'new', 'CSV advocate row is new');
check(groups3[0]?.items[0]?.record.trainedDate === '2026-01-05', `date parsed (got ${groups3[0]?.items[0]?.record.trainedDate})`);

process.exit(failures ? 1 : 0);
