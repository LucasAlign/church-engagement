import db from './src/data/db.js';
import {
  TODAY, addConnection, addInteraction, compileAnnualImpactReport, genId,
  getChurchGivingSummary, getMissingReports, saveAnnualImpactReport,
} from './src/data/helpers.js';

let failures = 0;
const check = (condition, message) => {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${message}`);
  if (!condition) failures += 1;
};

for (const [key, value] of Object.entries(db)) {
  if (Array.isArray(value) && key !== 'users') value.length = 0;
}

const actualToday = new Date().toISOString().slice(0, 10);
check(TODAY === actualToday, `TODAY follows the system date (${TODAY})`);

const ids = new Set(Array.from({ length: 250 }, () => genId('test')));
check(ids.size === 250, 'generated record IDs are unique across a burst');

db.churches.push({ id: 'ch_1', name: 'Test Church', lastInteractionDate: null });
addInteraction({ churchId: 'ch_1', type: 'email', date: '2026-08-01', notes: 'First' });
check(db.churches[0].lastInteractionDate === '2026-08-01', 'first interaction updates church contact date');
addInteraction({ churchId: 'ch_1', type: 'email', date: '2026-07-01', notes: 'Older' });
check(db.churches[0].lastInteractionDate === '2026-08-01', 'older interaction does not regress church contact date');

addConnection({ churchId: 'ch_1', name: 'Test Person', type: 'volunteer', status: 'active' });
check(db.connections[0].connectionType === 'volunteer' && !('type' in db.connections[0]), 'connections use the canonical connectionType field');

const year = Number(TODAY.slice(0, 4));
db.givingRecords.push(
  { id: 'g1', churchId: 'ch_1', date: `${year}-02-01`, amount: 150, type: 'one_time' },
  { id: 'g2', churchId: 'ch_1', date: `${year - 1}-02-01`, amount: 75, type: 'one_time' },
);
const giving = getChurchGivingSummary('ch_1');
check(giving.thisYearTotal === 150 && giving.lastYearTotal === 75, 'giving totals derive from the current year');

check(getMissingReports(year).length === 1, 'a church without a yearly entry is missing from the impact-report cycle');
saveAnnualImpactReport({ churchId: 'ch_1', year, summary: 'A year of meaningful community support.' });
const impact = compileAnnualImpactReport(year);
check(impact.completed === 1 && impact.missing === 0, 'the annual compilation tracks completed church reports');
check(impact.interactions === 2 && impact.giving === 150, 'the annual compilation calculates church activity for the selected year');
check(impact.churches[0].report.summary.includes('meaningful'), 'the annual compilation includes the church-authored summary');

process.exitCode = failures ? 1 : 0;
