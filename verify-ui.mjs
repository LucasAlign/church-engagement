// Click-through verification of all dashboard buttons via Playwright.
// Run: NODE_PATH=/opt/node22/lib/node_modules node verify-ui.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const SHOTS = '/tmp/verify-shots';
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => console.log(`PAGEERROR: ${e.message}`));

// Locate a form control inside the open modal by its field label.
const field = label => page
  .locator('.modal .field', { has: page.locator(`label.field-label:text-is("${label}")`) })
  .locator('input, select, textarea').first();
const modalBtn = name => page.locator('.modal-footer button', { hasText: name });
const shot = name => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });

// ---------- /churches: More filters ----------
await page.goto(`${BASE}/#/churches`);
await page.getByRole('button', { name: 'More filters' }).click();
const denomSelect = page.locator('.card .field', { has: page.locator('label:text-is("Denomination")') }).locator('select');
await denomSelect.selectOption('Lutheran');
await page.waitForTimeout(100);
let rows = await page.locator('.data-table tbody tr').count();
log(rows === 1, `More filters: denomination=Lutheran filters table to 1 row (got ${rows})`);
await shot('01-more-filters');
await page.getByRole('button', { name: 'Clear' }).click();
rows = await page.locator('.data-table tbody tr').count();
log(rows === 9, `More filters: Clear restores all 9 rows (got ${rows})`);
await page.getByRole('button', { name: 'More filters' }).click();

// ---------- /churches: Add church ----------
await page.getByRole('button', { name: 'Add church' }).click();
await field('Name').fill('Zion Fellowship');
await field('Address').fill('77 Test Ln');
await field('City').fill('Reading');
await field('Zip').fill('19601');
await field('Denomination').fill('Methodist');
await field('Attendance min').fill('100');
await field('Attendance max').fill('180');
await field('Engagement status').selectOption('interested');
await modalBtn('Add church').click();
await page.waitForTimeout(100);
const zionRow = page.locator('tr', { hasText: 'Zion Fellowship' });
log(await zionRow.count() === 1, 'Add church: Zion Fellowship appears in table');
await shot('02-add-church');

// Probe: empty name should not save
await page.getByRole('button', { name: 'Add church' }).click();
await modalBtn('Add church').click();
await page.waitForTimeout(100);
log(await page.locator('.modal').count() === 1, 'Probe: Add church with empty name keeps modal open (no save)');
await page.locator('.modal .icon-btn').click();

// ---------- church profile: header Edit ----------
await page.locator('tr', { hasText: 'Covenant Church' }).first().click();
await page.waitForTimeout(100);
await page.locator('.page-actions').getByRole('button', { name: 'Edit' }).click();
await field('Phone').fill('(610) 555-7777');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log(await page.locator('.details-table', { hasText: '(610) 555-7777' }).count() === 1,
  'Edit church: phone change shows on Overview');

// ---------- Staff tab ----------
await page.getByRole('button', { name: 'Staff', exact: true }).click();
await page.getByRole('button', { name: 'Add staff member' }).click();
await field('Name').fill('Test Pastor');
await field('Position').fill('Youth Pastor');
await field('Email').fill('test@covenant.org');
await modalBtn('Add staff member').click();
await page.waitForTimeout(100);
const staffCard = page.locator('.person-card', { hasText: 'Test Pastor' });
log(await staffCard.count() === 1, 'Staff: add appears as card');
await staffCard.getByRole('button', { name: 'Edit' }).click();
await field('Position').fill('Executive Pastor');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log(await staffCard.locator('.pc-role').textContent() === 'Executive Pastor', 'Staff: edit position persists');
const beforeArchive = await page.locator('.person-card').count();
await staffCard.getByRole('button', { name: 'Archive' }).click();
await page.waitForTimeout(100);
log(await page.locator('.person-card').count() === beforeArchive - 1, 'Staff: archive removes card');
await shot('03-staff');

// ---------- Care Communities tab ----------
await page.getByRole('button', { name: 'Care Communities' }).click();
await page.getByRole('button', { name: 'Add care community' }).click();
await field('Name').fill('Test Care Community');
await field('Lead').fill('Pat Tester');
await page.locator('.modal input[placeholder="Name"]').fill('Member One');
await page.locator('.modal input[placeholder="Role"]').fill('Meals');
await page.locator('.modal').getByRole('button', { name: 'Add member' }).click();
await page.locator('.modal input[placeholder="Name"]').nth(1).fill('Member Two');
await modalBtn('Add care community').click();
await page.waitForTimeout(100);
const ccCard = page.locator('.ministry-card', { hasText: 'Test Care Community' });
log(await ccCard.count() === 1, 'Care Communities: add appears as card');
log((await ccCard.textContent()).includes('Member One (Meals)') && (await ccCard.textContent()).includes('Member Two'),
  'Care Communities: team members render on card');
await ccCard.getByRole('button', { name: 'Edit' }).click();
await field('Status').selectOption('active');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log((await ccCard.locator('.badge').textContent()) === 'Active', 'Care Communities: edit status persists');
await shot('04-care-communities');

// ---------- Advocates tab ----------
await page.getByRole('button', { name: 'Advocates' }).click();
await page.getByRole('button', { name: 'Add advocate' }).click();
await field('Name').fill('Ada Advocate');
await field('Role').fill('Respite advocate');
await modalBtn('Add advocate').click();
await page.waitForTimeout(100);
const advCard = page.locator('.person-card', { hasText: 'Ada Advocate' });
log(await advCard.count() === 1, 'Advocates: add appears as card');
await advCard.getByRole('button', { name: 'Edit' }).click();
await field('Status').selectOption('inactive');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log((await advCard.locator('.badge').textContent()) === 'Inactive', 'Advocates: edit status persists');

// ---------- Connections tab ----------
await page.getByRole('button', { name: 'Connections' }).click();
await page.getByRole('button', { name: 'Add connection' }).click();
await field('Name').fill('Carl Connection');
await field('Connection type').selectOption('volunteer');
await modalBtn('Add connection').click();
await page.waitForTimeout(100);
const cxRow = page.locator('tr', { hasText: 'Carl Connection' });
log(await cxRow.count() === 1, 'Connections: add appears as row');
await cxRow.getByRole('button', { name: 'Edit' }).click();
await field('Connection type').selectOption('donor');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log((await cxRow.locator('.badge').first().textContent()) === 'Donor', 'Connections: edit type persists');
await shot('05-connections');

// ---------- Ministry tab ----------
await page.getByRole('button', { name: 'Ministry', exact: true }).click();
const ministryCardsBefore = await page.locator('.ministry-card').count();
await page.getByRole('button', { name: 'Add ministry' }).click();
await field('Ministry').selectOption('mentoring');
await field('Status').selectOption('active');
await modalBtn('Add ministry').click();
await page.waitForTimeout(100);
const mentorCard = page.locator('.ministry-card', { hasText: 'Mentoring Program' });
log(await page.locator('.ministry-card').count() === ministryCardsBefore + 1 && await mentorCard.count() === 1,
  'Ministry: add appears as card');
await mentorCard.getByRole('button', { name: 'Edit' }).click();
await field('Status').selectOption('inactive');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log((await mentorCard.locator('.badge').textContent()) === 'Inactive', 'Ministry: edit status persists');

// ---------- Giving tab ----------
await page.getByRole('button', { name: 'Giving', exact: true }).click();
await page.getByRole('button', { name: 'Record gift' }).click();
await field('Amount').fill('750');
await field('Fund').fill('Test fund');
await modalBtn('Record gift').click();
await page.waitForTimeout(100);
const giftRow = page.locator('tr', { hasText: 'Test fund' });
log(await giftRow.count() === 1, 'Giving: recorded gift appears in history');
await giftRow.locator('.icon-btn').click();
await field('Amount').fill('999');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log((await giftRow.textContent()).includes('$999'), 'Giving: edit amount persists');
// Probe: zero amount should not save
await page.getByRole('button', { name: 'Record gift' }).click();
await field('Amount').fill('0');
await modalBtn('Record gift').click();
await page.waitForTimeout(100);
log(await page.locator('.modal').count() === 1, 'Probe: zero-amount gift keeps modal open (no save)');
await page.locator('.modal .icon-btn').click();
await shot('06-giving');

// ---------- Notes tab ----------
await page.getByRole('button', { name: 'Notes', exact: true }).click();
await page.getByRole('button', { name: 'Add note' }).click();
await page.locator('.card textarea').fill('A test note body.');
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(100);
const noteCard = page.locator('.note-card', { hasText: 'A test note body.' });
log(await noteCard.count() === 1, 'Notes: add appears');
await noteCard.getByRole('button', { name: 'Edit' }).click();
await page.locator('.card textarea').fill('An edited note body.');
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(100);
log(await page.locator('.note-card', { hasText: 'An edited note body.' }).count() === 1, 'Notes: edit persists');

// ---------- Tasks tab ----------
await page.getByRole('button', { name: 'Tasks', exact: true }).click();
await page.getByRole('button', { name: 'Add task' }).click();
await field('Task').fill('Verify the buttons');
await field('Priority').selectOption('high');
await modalBtn('Add task').click();
await page.waitForTimeout(100);
const taskRow = page.locator('tr', { hasText: 'Verify the buttons' });
log(await taskRow.count() === 1, 'Tasks: add appears as row');
await taskRow.locator('.icon-btn').click();
await field('Task').fill('Verify all the buttons');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log(await page.locator('tr', { hasText: 'Verify all the buttons' }).count() === 1, 'Tasks: edit persists');
await page.locator('tr', { hasText: 'Verify all the buttons' }).locator('.checkbox').check();
await page.waitForTimeout(100);
log((await page.locator('tr', { hasText: 'Verify all the buttons' }).locator('.badge').last().textContent()) === 'Completed',
  'Tasks: checkbox completes task');

// ---------- /follow-ups ----------
await page.goto(`${BASE}/#/follow-ups`);
await page.getByRole('button', { name: 'New task' }).click();
await field('Church').selectOption({ label: 'Grace Church Kutztown' });
await field('Task').fill('Follow-ups page task');
await modalBtn('Add task').click();
await page.waitForTimeout(100);
const fuRow = page.locator('tr', { hasText: 'Follow-ups page task' });
log(await fuRow.count() === 1, 'Follow-ups: New task appears in table');
await fuRow.locator('.icon-btn').click();
await field('Priority').selectOption('critical');
await modalBtn('Save changes').click();
await page.waitForTimeout(100);
log((await fuRow.textContent()).includes('Critical'), 'Follow-ups: row edit persists');
await shot('07-follow-ups');

// ---------- /settings ----------
await page.goto(`${BASE}/#/settings`);
await page.locator('.field', { has: page.locator('label:text-is("Name")') }).locator('input').fill('Sarah Chen-Lee');
await page.getByRole('button', { name: 'Save changes' }).click();
await page.waitForTimeout(100);
log(await page.locator('text=Saved ✓').count() === 1, 'Settings: Save shows confirmation');
log(await page.locator('.card', { hasText: 'County Coordinator' }).locator('text=Sarah Chen-Lee').count() >= 1,
  'Settings: profile name updated');
await shot('08-settings');

// ---------- Probe: overlay click closes modal ----------
await page.goto(`${BASE}/#/churches`);
await page.getByRole('button', { name: 'Add church' }).click();
await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
log(await page.locator('.modal').count() === 0, 'Probe: clicking overlay closes modal');

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
