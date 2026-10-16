import { expect, type Locator, test } from '@playwright/test';

async function openFrom(trigger: Locator, dialog: Locator) {
  // Open from the keyboard: WebKit does not focus a clicked button, and the
  // dialog returns focus to whatever had it.
  await trigger.focus();
  await trigger.press('Enter');
  await expect(dialog).toHaveJSProperty('open', true);
  await expect(dialog).not.toHaveAttribute('data-kui-dialog-motion');
}

test('WorkbenchDialog runs its rails the full height with the title and close in the work area', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=workbench-dialog');
  const trigger = page.getByRole('button', { name: 'Edit Slide' });
  const dialog = page.locator('#workbench-dialog-demo');
  await openFrom(trigger, dialog);
  await expect(dialog).toHaveAccessibleName('Edit Slide');
  await expect(dialog).toHaveAttribute('data-presentation', 'modal');

  const geometry = await dialog.evaluate((element) => {
    const box = (selector: string) =>
      element.querySelector(selector)!.getBoundingClientRect();
    return {
      panel: element.getBoundingClientRect(),
      left: box('[data-workbench-rail="left"]'),
      right: box('[data-workbench-rail="right"]'),
      title: box('#workbench-dialog-demo-title'),
      close: box('.kui-workbench__center [data-dialog-close][aria-label]'),
    };
  });
  for (const rail of [geometry.left, geometry.right]) {
    expect(Math.abs(rail.top - geometry.panel.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(rail.bottom - geometry.panel.bottom)).toBeLessThanOrEqual(
      1,
    );
    expect(rail.width).toBeGreaterThan(150);
  }
  // The title and close sit in the work area, between the rails.
  expect(geometry.title.left).toBeGreaterThanOrEqual(geometry.left.right);
  expect(geometry.close.right).toBeLessThanOrEqual(geometry.right.left + 1);

  // Selecting a layer re-renders in place; the dialog stays open.
  await dialog.getByRole('button', { name: /Caption/ }).click();
  await expect(dialog.getByText('Caption is selected.')).toBeVisible();
  await expect(dialog).toHaveJSProperty('open', true);

  // Hiding the inspector moves its toggle into the work area's toolbar,
  // before the close control.
  await dialog.getByRole('button', { name: 'Hide Inspector' }).click();
  const show = dialog.getByRole('button', { name: 'Show Inspector' });
  await expect(show).toBeVisible();
  const [showBox, closeBox] = await Promise.all([
    show.boundingBox(),
    dialog.getByRole('button', { name: 'Close' }).boundingBox(),
  ]);
  expect(showBox!.x).toBeLessThan(closeBox!.x);
  await show.click();

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveJSProperty('open', false);
  await expect(trigger).toBeFocused();
  await openFrom(trigger, dialog);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
});

test('WorkbenchDialog opens rails as overlays on compact devices, and Escape closes a rail first', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=workbench-dialog');
  const dialog = page.locator('#workbench-dialog-demo');
  await openFrom(page.getByRole('button', { name: 'Edit Slide' }), dialog);
  await expect(dialog).toHaveAttribute('data-presentation', 'fullscreen');
  const left = dialog.locator('[data-workbench-rail="left"]');
  await expect(left).toHaveAttribute('data-presentation', 'overlay');
  await expect(left).toHaveAttribute('data-collapsed', 'true');
  // The work area keeps the dialog's width.
  const center = dialog.locator('.kui-workbench__center');
  const [centerBox, dialogBox] = await Promise.all([
    center.boundingBox(),
    dialog.boundingBox(),
  ]);
  expect(Math.abs(centerBox!.width - dialogBox!.width)).toBeLessThanOrEqual(1);

  // From the keyboard, so WebKit gives the toggle focus to return to.
  await dialog.getByRole('button', { name: 'Show Layers' }).focus();
  await page.keyboard.press('Enter');
  await expect(left).toHaveAttribute('data-collapsed', 'false');
  await expect(left.getByRole('button', { name: /Title/ })).toBeVisible();
  // Escape closes the open rail, and the dialog stays open.
  await page.keyboard.press('Escape');
  await expect(left).toHaveAttribute('data-collapsed', 'true');
  await expect(dialog).toHaveJSProperty('open', true);
  await expect(
    dialog.getByRole('button', { name: 'Show Layers' }),
  ).toBeFocused();
  // A second Escape closes the dialog.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
});
