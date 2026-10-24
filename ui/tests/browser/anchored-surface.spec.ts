import { expect, test } from '@playwright/test';

const surface = '[data-component="anchored-surface"]';

test('element help owns focus, dismissal, and visible surface at wide and narrow widths', async ({
  page,
}, testInfo) => {
  for (const width of [1180, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/?component=anchored-surface');
    const trigger = page.getByRole('button', { name: 'Explain This Field' });
    // A pointer click must restore focus even in WebKit, which does not focus
    // buttons on pointer press by default.
    await trigger.click();
    const help = page.locator(surface);
    await expect(help).toBeVisible();
    await expect(help).toHaveAttribute('role', 'dialog');
    await expect(help).toHaveAttribute('aria-label', 'Field Help');
    await expect(help.getByRole('button', { name: 'Got It' })).toBeFocused();
    const rect = await help.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({
      path: `test-results/anchored-surface-${width}-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(help).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await help.getByRole('button', { name: 'Got It' }).click();
    await expect(help).toHaveCount(0);
  }
});

test('pointer location clamps into a narrow viewport and dismisses outside', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/?component=anchored-surface');
  const trigger = page.getByRole('button', { name: 'Open at Pointer' });
  await trigger.click();
  const help = page.locator(surface);
  await expect(help).toBeVisible();
  const rect = await help.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(376);
  await page.locator('body').click({ position: { x: 4, y: 4 } });
  await expect(help).toHaveCount(0);
});

// A surface opened from inside a DialogSurface must join the modal dialog:
// one left in document.body is painted but inert (no focus, no input). The
// DialogSurface renders the host kerfjs/overlay uses, a direct child of its
// native <dialog>.
test('interactive help remains usable inside a DialogSurface', async ({
  page,
}, testInfo) => {
  // Two full dialog interactions and screenshots can exceed 30s under load.
  test.slow();
  for (const width of [1180, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/?component=anchored-surface');
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    const modal = page.locator('[data-anchored-surface-modal]');
    await expect(modal).toHaveAttribute('open');
    const explain = modal.getByRole('button', { name: 'Explain in Dialog' });
    await explain.click();
    const help = page.locator(surface);
    await expect(help).toBeVisible();
    expect(
      await help.evaluate((element) => ({
        hosted: element.closest('[data-kerf-overlay-host]')?.parentElement
          ?.localName,
        lightDomOfDialog: Boolean(
          element.closest('[data-anchored-surface-modal]'),
        ),
      })),
    ).toEqual({ hosted: 'dialog', lightDomOfDialog: true });
    const gotIt = help.getByRole('button', { name: 'Got It' });
    await expect(gotIt).toBeFocused(); // inert content cannot take focus
    await page.screenshot({
      path: `test-results/anchored-surface-dialog-surface-${width}-${testInfo.project.name}.png`,
    });

    // Escape dismisses only the surface; the dialog beneath stays open.
    await page.keyboard.press('Escape');
    await expect(help).toHaveCount(0);
    await expect(explain).toBeFocused();
    await expect(modal).toHaveAttribute('open');
    await page.waitForTimeout(300); // a stray close request would animate out
    await expect(modal).toHaveAttribute('open');

    // Pointer input reaches the surface: its action closes it.
    await explain.click();
    await gotIt.click();
    await expect(help).toHaveCount(0);
    await expect(modal).toHaveAttribute('open');

    // Closing the dialog takes an open surface with it.
    await explain.click();
    await expect(help).toBeVisible();
    await modal
      .locator('.kui-dialog-surface__footer [data-dialog-close]')
      .evaluate((button: HTMLElement) => button.click());
    await expect(modal).not.toHaveAttribute('open');
    await expect(help).toHaveCount(0);
  }
});

// A DialogSurface that opens while a surface outside it is showing goes to
// the top layer above that surface. kerf watches modal dialogs opening, so
// the surface is re-shown above the modal instead of staying painted beneath
// its backdrop.
test('a surface already showing is re-hosted above a DialogSurface that opens later', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 760 });
  await page.goto('/?component=anchored-surface');
  await page.getByRole('button', { name: 'Explain This Field' }).click();
  const help = page.locator(surface);
  await expect(help).toBeVisible();
  const modal = page.locator('[data-anchored-surface-modal]');
  await modal.evaluate((dialog: HTMLDialogElement) => dialog.showModal());
  await expect(modal).toHaveAttribute('open');
  // Paint order, in pixels (hit-testing cannot see an inert element): an
  // opaque backdrop hides anything beneath the modal; a red surface above it
  // still shows in its own box.
  const clip = await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent =
      'dialog[data-anchored-surface-modal]::backdrop{background:#fff!important}';
    document.head.appendChild(style);
    const el = document.querySelector<HTMLElement>(
      '[data-component="anchored-surface"]',
    )!;
    el.style.background = '#f00';
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  await page.waitForTimeout(400); // let the dialog's show animation settle
  const shown = await page.screenshot({ clip });
  await help.evaluate((el: HTMLElement) => (el.style.visibility = 'hidden'));
  const hidden = await page.screenshot({ clip });
  expect(shown.equals(hidden)).toBe(false);
});
