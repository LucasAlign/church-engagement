import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('dashboard loads and has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Engage/i);
  await expect(page.getByRole('main')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => ['critical', 'serious'].includes(item.impact))).toEqual([]);
});

test('keyboard user can open and close the add-church dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add church/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('empty dashboard guides a first-time coordinator into setup', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set up your church directory' })).toBeVisible();
  await expect(page.getByText('Add or import churches')).toBeVisible();
  await expect(page.getByText('Set relationship stages')).toBeVisible();
  await expect(page.getByText('Add primary contacts')).toBeVisible();
  await expect(page.getByText('Schedule your first follow-up')).toBeVisible();

  await page.getByRole('button', { name: 'Add your first church' }).click();
  await expect(page.getByRole('dialog', { name: 'Add Church' })).toBeVisible();
});

test('new church keeps the relationship stage shown in the form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add church/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Relationship stage')).toHaveValue('partnering');
  await dialog.getByLabel('Name*').fill('Grace Community Church');
  await dialog.getByLabel('City').fill('Reading');
  await dialog.getByRole('button', { name: 'Save' }).click();

  const churchRow = page.getByRole('row').filter({ hasText: 'Grace Community Church' });
  await expect(churchRow).toContainText('Partnering');
});

test('incomplete church records use friendly missing-value labels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add church/i }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name*').fill('Grace Community Church');
  await dialog.getByLabel('City').fill('Reading');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await page.getByText('Grace Community Church', { exact: true }).click();

  const profile = page.getByRole('main');
  await expect(profile).toContainText('Address not added');
  await expect(profile).toContainText('Attendance unknown');
  await expect(profile).not.toContainText('undefined');
  await expect(profile).not.toContainText('null–null');
});

test('interaction assistant previews changes and only applies selected suggestions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add church/i }).click();
  const addDialog = page.getByRole('dialog');
  await addDialog.getByLabel('Name*').fill('Grace Community Church');
  await addDialog.getByLabel('City').fill('Reading');
  await addDialog.getByRole('button', { name: 'Save' }).click();
  await page.getByText('Grace Community Church', { exact: true }).click();

  await page.getByRole('button', { name: 'Log interaction', exact: true }).click();
  const interactionDialog = page.getByRole('dialog', { name: 'Log interaction' });
  await interactionDialog.locator('textarea').fill('Interested in mentoring. Call back next week.');
  await interactionDialog.getByRole('button', { name: 'Review suggested follow-ups' }).click();
  await expect(interactionDialog.getByLabel('Suggested updates')).toContainText('nothing changes until you select it');
  await interactionDialog.getByLabel(/Create a follow-up/).check();
  await interactionDialog.getByRole('button', { name: 'Save interaction' }).click();

  await expect(page.getByLabel('Relationship summary')).toContainText('Follow up on recent conversation');
});

test('natural-language directory questions reveal the filters they apply', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add church/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name*').fill('Grace Community Church');
  await dialog.getByLabel('City').fill('Reading');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await page.getByLabel('Ask about your churches').fill('Partnering churches without an advocate');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('status')).toHaveText(/Partnering.*No advocate/);
  await expect(page.getByRole('row').filter({ hasText: 'Grace Community Church' })).toBeVisible();
});

test('leadership report is an editable draft and is never auto-sent', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add church/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name*').fill('Grace Community Church');
  await dialog.getByLabel('City').fill('Reading');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'Analytics' }).click();

  await page.getByRole('button', { name: 'Prepare weekly summary' }).click();
  await expect(page.getByLabel('Editable draft')).toBeVisible();
  await expect(page.getByText('This draft is not sent automatically.')).toBeVisible();
});

test('coordinator can complete a church impact report and see it in the yearly compilation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add church/i }).click();
  const churchForm = page.locator('.church-form-modal');
  await churchForm.getByLabel('Church name').fill('Impact Community Church');
  await churchForm.getByLabel('City').selectOption('Reading');
  await churchForm.getByRole('button', { name: 'Add church' }).evaluate(button => button.click());
  await page.getByText('Impact Community Church', { exact: true }).click();

  await page.getByRole('button', { name: 'Impact Report', exact: true }).click();
  await page.getByLabel('Annual summary*').fill('Supported families throughout the county.');
  await page.getByLabel('Highlights and stories').fill('Launched a new care team.');
  await page.getByRole('button', { name: 'Save annual report' }).click();
  await expect(page.getByRole('status')).toContainText('Saved to the');

  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Impact reports' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Impact Community Church' });
  await expect(row).toContainText('Complete');
  await expect(row).toContainText('Supported families throughout the county.');
});
