import { expect, type Page } from '@playwright/test';

/**
 * KF-MHY1GB: shows one of a rail's areas (Outline, Problems in the Document
 * rail; Properties, Flow, Children in the Inspector).
 */
export const area = (page: Page, name: string) =>
  page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();

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
