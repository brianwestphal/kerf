import { expect, test } from '@playwright/test';

const surface = '[data-component="anchored-surface"]';

test('element help owns focus, dismissal, and visible surface at wide and narrow widths', async ({
  page,
}, testInfo) => {
  for (const width of [1180, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/?component=anchored-surface');
    const trigger = page.getByRole('button', { name: 'Explain this field' });
    // A pointer click must restore focus even in WebKit, which does not focus
    // buttons on pointer press by default.
    await trigger.click();
    const help = page.locator(surface);
    await expect(help).toBeVisible();
    await expect(help).toHaveAttribute('role', 'dialog');
    await expect(help).toHaveAttribute('aria-label', 'Field help');
    await expect(help.getByRole('button', { name: 'Got it' })).toBeFocused();
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
    await help.getByRole('button', { name: 'Got it' }).click();
    await expect(help).toHaveCount(0);
  }
});

test('pointer location clamps into a narrow viewport and dismisses outside', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/?component=anchored-surface');
  const trigger = page.getByRole('button', { name: 'Open at pointer' });
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

// wa-dialog keeps its modal <dialog> in a shadow root, so the slotted trigger
// has no `dialog` ancestor. The surface must still join the modal's flat tree:
// a surface left in document.body is painted but inert (no focus, no input).
test('interactive help remains usable inside a Web Awesome dialog', async ({
  page,
}, testInfo) => {
  for (const width of [1180, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/?component=anchored-surface');
    await page.getByRole('button', { name: 'Open dialog' }).click();
    const modal = page.locator('[data-anchored-surface-modal]');
    await expect(modal).toHaveAttribute('open');
    const explain = modal.getByRole('button', { name: 'Explain in dialog' });
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
    ).toEqual({ hosted: 'wa-dialog', lightDomOfDialog: true });
    const gotIt = help.getByRole('button', { name: 'Got it' });
    await expect(gotIt).toBeFocused(); // inert content cannot take focus
    await page.screenshot({
      path: `test-results/anchored-surface-wa-dialog-${width}-${testInfo.project.name}.png`,
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
      .locator('[data-dialog="close"]')
      .evaluate((button: HTMLElement) => button.click());
    await expect(modal).not.toHaveAttribute('open');
    await expect(help).toHaveCount(0);
  }
});
