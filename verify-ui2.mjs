// Verification of Impact Reports buttons and Churches export/import.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const BASE = 'http://localhost:5173';
let failures = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

// Tiny valid-enough PDF to upload.
const pdfPath = '/tmp/test-report.pdf';
fs.writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => console.log(`PAGEERROR: ${e.message}`));

// ---------- /reports ----------
await page.goto(`${BASE}/#/reports`);

// Request → button flips to Requested and a task is created
const missingName = (await page.locator('.report-card', { hasText: 'Not yet uploaded' }).first()
  .locator('.rc-title').textContent()).split(' — ')[0];
// Re-locate by church name: the card's meta text changes after the click.
const missingCard = page.locator('.report-card', { hasText: missingName });
await missingCard.getByRole('button', { name: 'Request' }).click();
await page.waitForTimeout(100);
log((await missingCard.getByRole('button').textContent()) === 'Requested', 'Reports: Request flips to Requested');
await page.goto(`${BASE}/#/follow-ups`);
log(await page.locator('tr', { hasText: 'Request 2025 impact report' }).count() >= 1,
  `Reports: Request created a follow-up task (for ${missingName})`);

// Upload: choose file via hidden input, then upload
await page.goto(`${BASE}/#/reports`);
const before = await page.locator('.report-card', { hasText: 'Uploaded' }).count();
await page.locator('input[type="file"][accept=".pdf"]').nth(1).setInputFiles(pdfPath);
await page.waitForTimeout(100);
log((await page.locator('.dropzone').textContent()).includes('test-report.pdf'), 'Reports: dropzone shows chosen file');
await page.getByRole('button', { name: 'Upload report' }).click();
await page.waitForTimeout(100);
log(await page.locator('.report-card', { hasText: 'Uploaded' }).count() === before + 1, 'Reports: upload adds a report card');

// View → opens a new tab with a blob/pdf URL
// Headless Chromium aborts blob:application/pdf navigations (no PDF viewer),
// so instrument window.open to capture the URL the View button passes and
// validate the served bytes instead of the tab rendering.
await page.evaluate(() => {
  window.__opened = [];
  const orig = window.open.bind(window);
  window.open = (u, t) => { window.__opened.push(String(u)); return orig(u, t); };
});
const viewServes = async (card, expectHead) => {
  await card.getByRole('button', { name: 'View' }).click();
  const url = await page.evaluate(() => window.__opened.pop());
  if (!url || !url.startsWith('blob:')) return `non-blob url: ${url}`;
  const body = await page.evaluate(async u => (await (await fetch(u)).text()), url);
  return body.startsWith('%PDF') && body.includes(expectHead) ? 'ok' : `bad content: ${body.slice(0, 60)}`;
};

let outcome = await viewServes(page.locator('.report-card').first(), '%PDF');
log(outcome === 'ok', `Reports: View serves the uploaded PDF bytes (${outcome})`);

// View on a SEEDED report (placeholder PDF path)
const seeded = page.locator('.report-card', { hasText: 'Grace Church Kutztown' }).first();
outcome = await viewServes(seeded, 'Grace Church Kutztown');
log(outcome === 'ok', `Reports: View on seeded report serves placeholder PDF with church name (${outcome})`);

// Download → fires a download with the report filename
const [download] = await Promise.all([
  page.waitForEvent('download'),
  seeded.getByRole('button', { name: 'Download' }).click(),
]);
log(download.suggestedFilename().endsWith('.pdf'), `Reports: Download fires (${download.suggestedFilename()})`);

// Replace → file picker updates the record
await seeded.getByRole('button', { name: 'Replace' }).click();
await page.locator('input[type="file"][accept=".pdf"]').first().setInputFiles(pdfPath);
await page.waitForTimeout(100);
log((await seeded.textContent()).includes('Uploaded Jun 9, 2026'), 'Reports: Replace updates upload date');

// ---------- /churches: Export + Import ----------
await page.goto(`${BASE}/#/churches`);
await page.getByRole('button', { name: 'Export' }).click();
const [xlsxDl] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Download' }).click(),
]);
log(xlsxDl.suggestedFilename().endsWith('.xlsx'), `Export: Excel downloads (${xlsxDl.suggestedFilename()})`);
const xlsxPath = '/tmp/exported.xlsx';
await xlsxDl.saveAs(xlsxPath);

// CSV export
await page.getByRole('button', { name: 'Export' }).click();
await page.locator('.modal label', { hasText: 'CSV' }).locator('input').check();
const [csvDl] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Download' }).click(),
]);
log(csvDl.suggestedFilename().endsWith('.csv'), `Export: CSV downloads (${csvDl.suggestedFilename()})`);

// Import the just-exported workbook → preview shows rows, all no-change
await page.getByRole('button', { name: 'Import' }).click();
await page.locator('.modal input[type="file"]').setInputFiles(xlsxPath);
await page.waitForTimeout(400);
const badges = await page.locator('.modal .badge').allTextContents();
log(badges.length > 0 && badges.every(b => b === 'No change'),
  `Import: re-importing export previews all "No change" (${badges.length} rows)`);
const importBtn = page.locator('.modal-footer button', { hasText: 'Import' });
log(await importBtn.isDisabled(), 'Import: apply button disabled when nothing selected');
await page.screenshot({ path: '/tmp/verify-shots/09-import-preview.png' });
await page.locator('.modal .icon-btn').click();

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
