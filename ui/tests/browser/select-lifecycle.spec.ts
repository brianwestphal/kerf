import { expect, type Locator, test } from '@playwright/test';

// The Select's listbox is a manual popover that fades in and out with CSS
// (`opacity` plus `display` / `overlay` allow-discrete). Opening, closing,
// reopening mid-fade, resizing between, disabling, and removing and
// re-adding the control must never leave a stale open state or a listbox
// detached from its trigger.

const popupOf = (select: Locator) => select.locator('.kui-select__popup');

async function expectOpen(select: Locator, viewportWidth: number) {
  await expect(select).toHaveAttribute('open', '');
  await expect(select.getByRole('combobox')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(popupOf(select)).toBeVisible();
  await expect
    .poll(() =>
      select.evaluate((host) => {
        const anchor = host
          .querySelector(':scope > .kui-select__trigger')!
          .getBoundingClientRect();
        const popup = host.querySelector(':scope > .kui-select__popup')!;
        const box = popup.getBoundingClientRect();
        return (
          popup.matches(':popover-open') &&
          anchor.width > 0 &&
          box.width > 0 &&
          box.left >= 10 &&
          box.right <= window.innerWidth - 10 &&
          box.right > anchor.left &&
          box.left < anchor.right &&
          // Below the trigger, or flipped above it.
          (box.top >= anchor.bottom - 1 || box.bottom <= anchor.top + 1)
        );
      }),
    )
    .toBe(true);
  const box = await popupOf(select).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(10);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth - 10);
}

async function expectClosed(select: Locator) {
  await expect(select).not.toHaveAttribute('open', '');
  await expect(select.getByRole('combobox')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(popupOf(select)).toBeHidden();
}

test('keeps the current popup anchored across a mid-fade reopen, resize, and repeated reopen', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="plain-rendering-balance"]');
  const combobox = select.getByRole('combobox');
  const motion = (duration: string | null) =>
    select.evaluate((host, duration) => {
      if (duration) host.style.setProperty('--_kui-select-motion', duration);
      else host.style.removeProperty('--_kui-select-motion');
    }, duration);
  for (const width of [1100, 760, 390, 760]) {
    // A long fade keeps the close in flight while the trigger reopens it.
    await motion('10s');
    await combobox.click();
    await expectOpen(select, page.viewportSize()!.width);
    await page.keyboard.press('Escape');
    await expect(select).not.toHaveAttribute('open', '');
    await expect(combobox).toBeFocused();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 632 });
    // Reopen while the close is still fading out.
    await combobox.click();
    await expectOpen(select, width);
    await motion(null);
    if (width === 1100 || width === 390)
      await page.screenshot({
        path: testInfo.outputPath(`select-reopened-${width}.png`),
      });
    await page.keyboard.press('Escape');
  }
  await expectClosed(select);
  // Keyboard selection, controlled rerender, and focus still work.
  await combobox.click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(select.locator('.kui-select__value')).toHaveText('Explicit');
  await expect(combobox).toBeFocused();
  await expectClosed(select);
});

const setDisabled = (combobox: Locator, disabled: boolean) =>
  combobox.evaluate(
    (trigger, disabled) => trigger.toggleAttribute('disabled', disabled),
    disabled,
  );

test('a disabled trigger does not open', async ({ page }) => {
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="plain-rendering-balance"]');
  const combobox = select.getByRole('combobox');
  await setDisabled(combobox, true);
  await combobox.click({ force: true });
  await combobox.evaluate((trigger) => (trigger as HTMLElement).focus());
  await page.keyboard.press('Enter');
  await expectClosed(select);
  await setDisabled(combobox, false);
  await combobox.click();
  await expectOpen(select, page.viewportSize()!.width);
});

test('disabling an open Select closes it, so no choice can be made', async ({
  page,
}) => {
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="plain-rendering-balance"]');
  const combobox = select.getByRole('combobox');
  await combobox.click();
  await expectOpen(select, page.viewportSize()!.width);
  await setDisabled(combobox, true);
  await expectClosed(select);
});

test('a Select removed while open and re-added is closed and reopens anchored', async ({
  page,
}) => {
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="plain-rendering-balance"]');
  const combobox = select.getByRole('combobox');
  await combobox.click();
  await expectOpen(select, page.viewportSize()!.width);
  // Removal hides the popover without a toggle event.
  await select.evaluate(async (host) => {
    const parent = host.parentElement!;
    host.remove();
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve()),
    );
    parent.append(host);
  });
  await expectClosed(select);
  await combobox.click();
  await expectOpen(select, page.viewportSize()!.width);
});
