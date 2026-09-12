import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const recipeIds = ['recipe-app-shell', 'recipe-navigation-sidebar', 'recipe-workspace-header', 'recipe-master-detail-dialog', 'recipe-composer-form', 'recipe-list-workspace-states', 'recipe-compact-toolbar'] as const;

async function openRecipe(page: Page, id: typeof recipeIds[number]) {
  await page.goto(`/?component=${id}`);
  const recipe = page.locator(`[data-recipe="${id}"]`);
  await expect(recipe).toBeVisible();
  return recipe;
}

async function activateDialogAndWaitForShow(dialog: Locator, activate: () => Promise<void>) {
  await Promise.all([
    dialog.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('wa-after-show', () => resolve(), { once: true }))),
    activate(),
  ]);
  await expect(dialog).toHaveJSProperty('open', true);
}

async function expectToolbarZonesNotToOverlap(recipe: Locator) {
  const zones = await Promise.all(['leading', 'center', 'trailing'].map((zone) => recipe.locator(`.kui-toolbar__${zone}`).boundingBox()));
  for (let first = 0; first < zones.length; first += 1) {
    for (let second = first + 1; second < zones.length; second += 1) {
      const a = zones[first]!;
      const b = zones[second]!;
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(overlaps, `toolbar zones ${first} and ${second} overlap`).toBe(false);
    }
  }
  expect(zones[0]!.y + zones[0]!.height).toBeLessThanOrEqual(zones[1]!.y);
  expect(zones[1]!.y + zones[1]!.height).toBeLessThanOrEqual(zones[2]!.y);
}

test('loads every stable recipe route through an individual lazy chunk', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const id of recipeIds) {
    const recipe = await openRecipe(page, id);
    await expect(page.getByRole('heading', { name: 'Recipes', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if (browserName === 'chromium') await recipe.screenshot({ path: `test-results/${id}-wide-light.png` });
  }
});

test('keeps recipe geometry responsive at narrow, intermediate, and 200% zoom layouts', async ({ page, browserName }) => {
  for (const id of recipeIds) {
    await page.setViewportSize({ width: 390, height: 844 });
    const recipe = await openRecipe(page, id);
    await page.locator('[data-action="toggle-theme"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if (id === 'recipe-app-shell') {
      await expect(recipe.locator('.recipe-shell__nav-region')).toHaveCSS('display', 'none');
      await expect(recipe.locator('.recipe-shell__inspector-region')).toHaveCSS('display', 'none');
    }
    if (id === 'recipe-compact-toolbar') await expectToolbarZonesNotToOverlap(recipe);
    if (id === 'recipe-master-detail-dialog') {
      const dialog = page.locator('wa-dialog.recipe-dialog');
      await activateDialogAndWaitForShow(dialog, () => recipe.getByRole('button', { name: 'Open project details' }).click());
      if (browserName === 'chromium') await page.screenshot({ path: 'test-results/recipe-master-detail-dialog-narrow-open.png' });
      await page.keyboard.press('Escape');
    }
    if (browserName === 'chromium' && ['recipe-app-shell', 'recipe-master-detail-dialog', 'recipe-compact-toolbar'].includes(id)) await recipe.screenshot({ path: `test-results/${id}-narrow-dark.png` });
  }

  await page.setViewportSize({ width: 900, height: 900 });
  const intermediateShell = await openRecipe(page, 'recipe-app-shell');
  expect(await intermediateShell.locator('.kui-scroll-owner').count()).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const intermediateDialogRecipe = await openRecipe(page, 'recipe-master-detail-dialog');
  const intermediateDialog = page.locator('wa-dialog.recipe-dialog');
  await activateDialogAndWaitForShow(intermediateDialog, () => intermediateDialogRecipe.getByRole('button', { name: 'Open project details' }).click());
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/recipe-master-detail-dialog-intermediate-open.png' });
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 720, height: 900 });
  for (const id of ['recipe-app-shell', 'recipe-composer-form', 'recipe-compact-toolbar'] as const) {
    await page.goto(`/?component=${id}`);
    await page.locator('html').evaluate((element) => { element.style.fontSize = '200%'; });
    const recipe = page.locator(`[data-recipe="${id}"]`);
    await expect(recipe).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if (id === 'recipe-compact-toolbar') await expectToolbarZonesNotToOverlap(recipe);
    if (browserName === 'chromium') await recipe.screenshot({ path: `test-results/${id}-zoom-200.png` });
  }
});

test('supports keyboard shell/sidebar controls and controlled toolbar interactions', async ({ page }) => {
  const shell = await openRecipe(page, 'recipe-app-shell');
  expect(await shell.locator('.kui-scroll-owner').count()).toBe(3);
  const separator = shell.getByRole('separator', { name: 'Resize Navigation' });
  await separator.focus();
  await separator.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', '240');
  await separator.press('End');
  await expect(separator).toHaveAttribute('aria-valuenow', '320');

  const sidebar = await openRecipe(page, 'recipe-navigation-sidebar');
  const projects = sidebar.getByRole('button', { name: 'Projects' });
  await projects.focus();
  await projects.press('Enter');
  await expect(projects).toHaveAttribute('aria-expanded', 'false');

  const toolbar = await openRecipe(page, 'recipe-compact-toolbar');
  const filter = toolbar.getByRole('button', { name: 'Toggle filters' });
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await toolbar.getByRole('button', { name: 'Board' }).click();
  await expect(toolbar.locator('[data-segmented-control-id="recipe-view"]')).toHaveAttribute('data-value', 'board');
});

test('runs dialog focus lifecycle, form validation, and every list transition', async ({ page, browserName }) => {
  const dialogRecipe = await openRecipe(page, 'recipe-master-detail-dialog');
  const launcher = dialogRecipe.getByRole('button', { name: 'Open project details' });
  await launcher.focus();
  const dialog = page.locator('wa-dialog.recipe-dialog');
  await activateDialogAndWaitForShow(dialog, () => launcher.press('Enter'));
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/recipe-master-detail-dialog-wide-open.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
  await expect(launcher).toBeFocused();

  const form = await openRecipe(page, 'recipe-composer-form');
  await form.getByRole('button', { name: 'Publish update' }).click();
  await expect(form.getByRole('alert')).toContainText('Add a title');
  await form.locator('wa-input[name="recipe-title"]').evaluate((element: HTMLElement & { value: string }) => { element.value = 'Tablet navigation shipped'; element.dispatchEvent(new Event('input', { bubbles: true, composed: true })); });
  await form.getByRole('button', { name: 'Publish update' }).click();
  await expect(form.getByRole('status')).toContainText('Update published');

  const list = await openRecipe(page, 'recipe-list-workspace-states');
  for (const [button, state] of [['Complete load', 'populated'], ['Refresh', 'stale'], ['Finish refresh', 'populated'], ['Clear', 'empty'], ['Create task', 'populated'], ['Simulate failure', 'error'], ['Retry', 'populated']] as const) {
    await list.getByRole('button', { name: button }).click();
    await expect(list).toHaveAttribute('data-list-state', state);
  }
  if (browserName === 'chromium') {
    await list.getByRole('button', { name: 'Simulate failure' }).click();
    await page.locator('[data-action="toggle-contrast"]').click();
    await list.screenshot({ path: 'test-results/recipe-list-error-contrast.png' });
  }
});

test('preserves reduced-motion and high-contrast semantics', async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const list = await openRecipe(page, 'recipe-list-workspace-states');
  const spinner = list.locator('.kui-loading-spinner path');
  await expect(spinner).toHaveCSS('animation-name', 'none');
  await page.locator('[data-action="toggle-contrast"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-contrast/);
  if (browserName === 'chromium') {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await expect(list.getByRole('button', { name: 'Complete load' })).toBeVisible();
  }
});
