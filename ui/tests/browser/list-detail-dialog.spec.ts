import { expect, type Locator, test } from '@playwright/test';

async function openFrom(trigger: Locator, dialog: Locator) {
  // Open from the keyboard: WebKit does not focus a clicked button, and the
  // dialog returns focus to whatever had it.
  await trigger.focus();
  await trigger.press('Enter');
  // Open, and its enter motion finished.
  await expect(dialog).toHaveJSProperty('open', true);
  await expect(dialog).not.toHaveAttribute('data-kui-dialog-motion');
}

test('ListDetailDialog runs both columns the full height with the title and close in the detail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=list-detail-dialog');
  const demo = page.locator('[data-demo="list-detail-dialog"]');
  const trigger = demo.getByRole('button', { name: 'Open Project Details' });
  const dialog = page.locator('#list-detail-dialog-demo');
  await openFrom(trigger, dialog);
  await expect(dialog).toHaveAccessibleName('Project Details');

  const geometry = await dialog.evaluate((element) => {
    const box = (selector: string) =>
      element.querySelector(selector)!.getBoundingClientRect();
    const panel = element.getBoundingClientRect();
    const list = box('[data-split-list]');
    const detail = box('[data-split-detail]');
    const footer = box('[data-split-detail] .kui-pane__footer');
    const title = box('[data-split-detail] [role="heading"]');
    const close = box('[data-split-detail] [data-dialog-close][aria-label]');
    return { panel, list, detail, footer, title, close };
  });
  // No surface header: both columns start at the dialog's top and end at its
  // bottom, so the divider runs its full height.
  for (const column of [geometry.list, geometry.detail]) {
    expect(Math.abs(column.top - geometry.panel.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(column.bottom - geometry.panel.bottom)).toBeLessThanOrEqual(
      1,
    );
  }
  // The title and close control lead and trail the detail column's top bar,
  // and the record actions are pinned to its bottom.
  expect(geometry.title.left).toBeGreaterThanOrEqual(geometry.detail.left);
  expect(geometry.close.right).toBeLessThanOrEqual(geometry.detail.right);
  expect(geometry.close.top).toBeLessThan(geometry.title.bottom);
  expect(
    Math.abs(geometry.footer.bottom - geometry.detail.bottom),
  ).toBeLessThanOrEqual(1);
  await expect(
    dialog.locator('[data-split-detail]').getByRole('heading', { level: 2 }),
  ).toHaveText('Atlas');

  // Selecting a project re-renders the detail in place; the dialog stays open.
  await dialog.getByRole('button', { name: /Cirrus/ }).click();
  await expect(
    dialog.locator('[data-split-detail]').getByRole('heading', { level: 2 }),
  ).toHaveText('Cirrus');
  await expect(dialog).toHaveJSProperty('open', true);

  // The close control closes it and focus returns to the opener.
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveJSProperty('open', false);
  await expect(trigger).toBeFocused();

  // Escape closes it too.
  await openFrom(trigger, dialog);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
});

test('ListDetailDialog drills from the list into the detail on compact devices', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=recipe-list-detail-dialog');
  const recipe = page.locator('[data-recipe="recipe-list-detail-dialog"]');
  const dialog = recipe.locator('dialog');
  await openFrom(
    recipe.getByRole('button', { name: 'Open Project Details' }),
    dialog,
  );
  await expect(dialog).toHaveAttribute('data-presentation', 'fullscreen');
  const stack = dialog.locator('.kui-nav-stack');
  await expect(stack).toBeVisible();
  // The list is the root view, with the close control in its toolbar.
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(dialog.locator('[data-nav-key]')).toHaveCount(1);

  await dialog.getByRole('button', { name: /Tablet navigation/ }).click();
  await expect(dialog.locator('[data-nav-key="detail"]')).toHaveAttribute(
    'data-nav-active',
    'true',
  );
  const detail = dialog.locator('[data-nav-key="detail"]');
  await expect(detail.getByText('Sam Rivera')).toBeVisible();
  // The record actions are pinned at the bottom of the detail view, and the
  // close control stays available beside the back control.
  const archive = detail.getByRole('button', { name: 'Archive' });
  await expect(archive).toBeVisible();
  const [archiveBox, dialogBox] = await Promise.all([
    archive.boundingBox(),
    dialog.boundingBox(),
  ]);
  expect(archiveBox!.y + archiveBox!.height).toBeGreaterThan(
    dialogBox!.y + dialogBox!.height - 80,
  );
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Back to Projects' }).click();
  await expect(dialog.locator('[data-nav-key="list"]')).toHaveAttribute(
    'data-nav-active',
    'true',
  );
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveJSProperty('open', false);
});
