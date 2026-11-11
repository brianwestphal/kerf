import { expect, type Page } from '@playwright/test';

/**
 * KF-MHY1GB: shows one of a rail's areas (Outline, Problems in the Document
 * rail; Properties, Flow, Children in the Inspector).
 */
export async function area(page: Page, name: string) {
  if (INSPECTOR_AREAS.has(name)) await inspectorOverview(page);
  await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
}

const INSPECTOR_AREAS = new Set(['Properties', 'Flow', 'Children']);

/** The Inspector's top view, past any view its pop is animating out. */
export const inspectorTop = (page: Page) =>
  page.locator(
    '#editor-inspector-stack [data-nav-active="true"]:not([data-nav-exiting])',
  );

/** Steps the Inspector back one view with the top view's Back. */
export async function inspectorBack(page: Page) {
  const key = await inspectorTop(page).getAttribute('data-nav-key');
  await page
    .locator('#editor-inspector-stack [data-nav-back]')
    .filter({ visible: true })
    .last()
    .click();
  await expect(inspectorTop(page)).not.toHaveAttribute('data-nav-key', key!);
  await inspectorSettled(page);
}

/** Waits for a push or pop to finish: no view is still animating out. */
export const inspectorSettled = (page: Page) =>
  expect(
    page.locator('#editor-inspector-stack [data-nav-exiting="true"]'),
  ).toHaveCount(0);

/**
 * KF-QWDPM3: returns the Inspector to its overview, under any Properties
 * page or field step open over it, where its area tabs are.
 */
export async function inspectorOverview(page: Page) {
  for (let step = 0; step < 4; step += 1) {
    if (!(await inspectorTop(page).count())) return;
    if ((await inspectorTop(page).getAttribute('data-nav-key')) === 'inspector')
      return;
    await inspectorBack(page);
  }
}

/**
 * KF-Z54E4H: opens the component Library popover from the Preview toolbar's
 * Library button, unless it is already open. A drop from a transient Library
 * closes it, so each palette drag opens it again.
 */
export async function openLibrary(page: Page) {
  const library = page.locator('#editor-library');
  if (!(await library.evaluate((element) => element.matches(':popover-open'))))
    await page.locator('[data-editor-library-button]').click();
  await expect(library).toBeVisible();
}

/**
 * Shows the Inspector at a narrow width. KF-EGNN3J: an Inspector that held
 * focus as the window narrowed is still open, as the overlay.
 */
export async function showInspector(page: Page) {
  const show = page.getByRole('button', { name: 'Show Inspector' });
  if (await show.isVisible()) await show.click();
  await expect(page.locator('[data-workbench-rail="right"]')).toHaveAttribute(
    'data-collapsed',
    'false',
  );
}
