import type WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';
import { expect, type Locator, test } from '@playwright/test';

type ProbeSelect = WaSelect & { held: Animation[]; completions: string[] };

async function holdNext(select: Locator, phase: 'show' | 'hide') {
  await select.evaluate((element, phase) => {
    const host = element as ProbeSelect;
    host.held = [];
    host.style.setProperty(`--${phase}-duration`, '10s');
    host.addEventListener(
      `wa-${phase}`,
      () =>
        window.requestAnimationFrame(() => {
          host.held = host.popup.popup.getAnimations();
          host.held.forEach((animation) => animation.pause());
        }),
      { once: true },
    );
  }, phase);
}

async function expectOpen(select: Locator, viewportWidth: number) {
  await expect(select).toHaveJSProperty('open', true);
  await expect(select.locator('[part="listbox"]')).toBeVisible();
  await expect
    .poll(() =>
      select.evaluate((element) => {
        const host = element as ProbeSelect;
        const anchor = host.combobox.getBoundingClientRect();
        const popup = host.listbox.getBoundingClientRect();
        return (
          host.popup.active &&
          !host.listbox.hidden &&
          anchor.width > 0 &&
          popup.width > 0 &&
          popup.left >= 10 &&
          popup.right <= window.innerWidth - 10 &&
          popup.right > anchor.left &&
          popup.left < anchor.right
        );
      }),
    )
    .toBe(true);
  const box = await select.locator('[part="listbox"]').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(10);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth - 10);
}

test('keeps the current popup anchored across paused hide, resize, and repeated reopen', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="plain-rendering-balance"]');
  await select.evaluate((element) => {
    const host = element as ProbeSelect;
    host.completions = [];
    for (const name of ['wa-after-show', 'wa-after-hide'])
      host.addEventListener(name, () => host.completions.push(name));
  });
  for (const [index, width] of [1100, 760, 390, 760].entries()) {
    await select.getByRole('combobox').click();
    await expectOpen(select, page.viewportSize()!.width);
    await expect
      .poll(() =>
        select.evaluate(
          (element) =>
            (element as ProbeSelect).completions.filter(
              (name) => name === 'wa-after-show',
            ).length,
        ),
      )
      .toBe(index * 2 + 1);
    await holdNext(select, 'hide');
    await page.keyboard.press('Escape');
    await expect
      .poll(() =>
        select.evaluate((element) => (element as ProbeSelect).held.length),
      )
      .toBeGreaterThan(0);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 632 });
    await select.getByRole('combobox').click();
    await select.evaluate((element) => {
      const host = element as ProbeSelect;
      host.held.forEach((animation) => animation.finish());
    });
    await expect
      .poll(() =>
        select.evaluate(
          (element) =>
            (element as ProbeSelect).completions.filter(
              (name) => name === 'wa-after-show',
            ).length,
        ),
      )
      .toBe((index + 1) * 2);
    await expectOpen(select, width);
    // No superseded close is reported as complete while the new menu is open.
    expect(
      await select.evaluate(
        (element) =>
          (element as ProbeSelect).completions.filter(
            (name) => name === 'wa-after-hide',
          ).length,
      ),
    ).toBe(index);
    if (width === 1100 || width === 390)
      await page.screenshot({
        path: testInfo.outputPath(`select-reopened-${width}.png`),
      });
    await select.evaluate((element) =>
      element.style.removeProperty('--hide-duration'),
    );
    await page.keyboard.press('Escape');
    await expect(select.locator('[part="listbox"]')).toBeHidden();
  }
  // Native keyboard selection, controlled rerender, and focus still work.
  await select.getByRole('combobox').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(select.getByRole('combobox')).toHaveValue('Explicit');
  await expect(select.getByRole('combobox')).toBeFocused();
});

test('handles show reversals, prevented transitions, disable and remove/refill without stale activation', async ({
  page,
}) => {
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="plain-rendering-balance"]');
  await holdNext(select, 'show');
  await select.getByRole('combobox').click();
  await expect
    .poll(() =>
      select.evaluate((element) => (element as ProbeSelect).held.length),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await select.evaluate((element) =>
    (element as ProbeSelect).held.forEach((animation) => animation.finish()),
  );
  await expect(select.locator('[part="listbox"]')).toBeHidden();
  await select.evaluate((element) => {
    const host = element as ProbeSelect;
    host.style.removeProperty('--show-duration');
    host.addEventListener('wa-show', (event) => event.preventDefault(), {
      once: true,
    });
  });
  await select.getByRole('combobox').click();
  await expect(select).toHaveJSProperty('open', false);
  await expect(select.locator('[part="listbox"]')).toBeHidden();
  await select.getByRole('combobox').click();
  await expectOpen(select, page.viewportSize()!.width);
  await select.evaluate((element) =>
    element.addEventListener('wa-hide', (event) => event.preventDefault(), {
      once: true,
    }),
  );
  await page.keyboard.press('Escape');
  await expectOpen(select, page.viewportSize()!.width);
  await select.evaluate((element) => {
    const host = element as ProbeSelect;
    host.disabled = true;
  });
  await expect(select.locator('[part="listbox"]')).toBeHidden();
  await select.evaluate((element) => {
    (element as ProbeSelect).disabled = false;
  });
  await holdNext(select, 'show');
  await select.getByRole('combobox').click();
  await expect
    .poll(() =>
      select.evaluate((element) => (element as ProbeSelect).held.length),
    )
    .toBeGreaterThan(0);
  const removed = await select.evaluate(async (element) => {
    const host = element as ProbeSelect;
    const parent = host.parentElement!;
    host.remove();
    host.held.forEach((animation) => animation.finish());
    // Observe the real animation completion/mutation checkpoints, not a timer.
    await Promise.all(host.held.map((animation) => animation.finished));
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve()),
    );
    const state = { active: host.popup.active, hidden: host.listbox.hidden };
    host.style.removeProperty('--show-duration');
    parent.append(host);
    return state;
  });
  expect(removed).toEqual({ active: false, hidden: true });
  await select.getByRole('combobox').click();
  await expectOpen(select, page.viewportSize()!.width);
});
