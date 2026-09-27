/**
 * Real-browser spec for the in-dialog host slot. A surface lifted over a
 * modal `<dialog>` is visible but inert in every engine, so a popover whose
 * anchor sits inside the dialog renders into the dialog's
 * `[data-kerf-overlay-host]` element instead. Only a real engine inerts, so
 * only a real engine can show that the popover's controls are actually
 * clickable and focusable, that Tab stays inside the modal, that Escape closes
 * the popover before the dialog, and that `position: fixed` placement still
 * lands next to the anchor. The unit half is
 * `tests/unit/overlay-modal-host.internal.test.ts`.
 */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

test('a popover opened from inside a native kerf modal <dialog> is clickable, focusable, trapped, and dismissed before the dialog', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { overlay, popover } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    const w = window as any;
    w._picked = 0;
    w._dialog = overlay(
      // Explicit tabindex on the dialog's own buttons: WebKit on macOS skips
      // implicitly tabbable buttons unless the system keyboard-navigation
      // preference is on. The popover's `#pick` deliberately has none — kerf
      // makes a slot-hosted surface's stops explicit itself.
      raw(
        '<button id="first" tabindex="0">first</button><button id="open" tabindex="0">open</button>',
      ),
      { className: 'host-dialog', native: true, initialFocus: '#open' },
    );
    w._pop = popover(
      document.getElementById('open'),
      raw('<button id="pick">pick</button>'),
      { className: 'menu', dismiss: ['escape', 'outside'] },
    );
    document
      .getElementById('pick')!
      .addEventListener('click', () => (w._picked += 1));
  });

  const menu = page.locator('.menu');
  expect(
    await menu.evaluate(
      (el) =>
        el.closest('dialog.host-dialog') !== null &&
        el.parentElement!.hasAttribute('data-kerf-overlay-host'),
    ),
  ).toBe(true);

  // Placement: position: fixed inside the dialog still lands below the anchor.
  const [anchorBox, menuBox] = await Promise.all([
    page.locator('#open').boundingBox(),
    menu.boundingBox(),
  ]);
  expect(
    Math.abs(menuBox!.y - (anchorBox!.y + anchorBox!.height + 4)),
  ).toBeLessThan(1.5);
  expect(Math.abs(menuBox!.x - anchorBox!.x)).toBeLessThan(1.5);

  // Clickable: a real pointer click reaches the control (an inert one would not).
  await page.locator('#pick').click();
  expect(await page.evaluate(() => (window as any)._picked)).toBe(1);

  // Focusable, and Tab stays inside the modal subtree.
  await page.locator('#open').focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('pick');
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      const active = document.activeElement;
      return (
        active === document.body ||
        active === null ||
        document.querySelector('dialog.host-dialog')!.contains(active)
      );
    });
    expect(inside).toBe(true);
  }

  // Escape closes the popover first; the dialog stays open…
  await page.locator('#pick').focus();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (document.querySelector('dialog.host-dialog') as HTMLDialogElement)
          ?.open,
    ),
  ).toBe(true);
  // …and the next Escape closes the dialog.
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.host-dialog')).toHaveCount(0);
});

test('an app-owned, kerf-mounted modal <dialog> opts in with a data-kerf-overlay-host element', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { mount } = (window as any).kerf;
    const html = (window as any).kerfHtml;
    const { popover } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    const w = window as any;
    w._picked = 0;
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';
    document.body.appendChild(dialog);
    mount(
      dialog,
      () =>
        html`<button id="open">open</button><div data-kerf-overlay-host data-morph-skip></div>`,
    );
    dialog.showModal();
    popover(
      document.getElementById('open'),
      raw('<button id="pick">pick</button>'),
      { className: 'menu' },
    );
    document
      .getElementById('pick')!
      .addEventListener('click', () => (w._picked += 1));
  });

  await page.locator('#pick').click();
  expect(await page.evaluate(() => (window as any)._picked)).toBe(1);
  // Tab-reachable without an authored tabindex, in every engine.
  await page.locator('#open').focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('pick');
  expect(
    await page
      .locator('.menu')
      .evaluate((el) =>
        el.parentElement!.hasAttribute('data-kerf-overlay-host'),
      ),
  ).toBe(true);
});

// A `transform`, `filter`, `perspective`, or `contain` on the dialog makes it
// the containing block for its fixed descendants, so a slot-hosted surface's
// viewport-coordinate `left`/`top` would land offset by the dialog's position
// (and scaled with it). `positionAnchored` measures that containing block and
// compensates; only a real layout engine can show the surface still lands
// against its anchor.
for (const style of [
  'top:50%;left:50%;margin:0;transform:translate(-50%,-50%)',
  'margin:60px 0 0 120px;filter:drop-shadow(0 0 4px black)',
  'margin:60px 0 0 120px;contain:paint',
  'margin:60px 0 0 120px;perspective:500px',
  'margin:60px 0 0 120px;will-change:transform',
  'margin:60px 0 0 120px;transform:scale(0.8)',
]) {
  test(`a slot-hosted popover and tooltip land against their anchors inside a dialog styled "${style}"`, async ({
    page,
  }) => {
    await page.evaluate((dialogStyle) => {
      const { mount } = (window as any).kerf;
      const html = (window as any).kerfHtml;
      const { popover, tooltip } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      const dialog = document.createElement('dialog');
      dialog.className = 'styled-dialog';
      dialog.setAttribute(
        'style',
        `${dialogStyle};padding:24px;border:3px solid`,
      );
      document.body.appendChild(dialog);
      mount(
        dialog,
        () =>
          html`<p style="margin:0 0 40px 50px"><button id="open">open</button></p><button id="tip">tip</button><div data-kerf-overlay-host data-morph-skip></div>`,
      );
      dialog.showModal();
      popover(
        document.getElementById('open'),
        raw('<button id="pick">pick</button>'),
        { className: 'menu', gap: 6 },
      );
      tooltip(document.getElementById('tip'), 'hint', {
        className: 'tip',
        delay: 0,
        placement: 'bottom',
        gap: 4,
      });
    }, style);

    const menu = page.locator('.menu');
    expect(
      await menu.evaluate((el) =>
        el.parentElement!.hasAttribute('data-kerf-overlay-host'),
      ),
    ).toBe(true);
    const [anchorBox, menuBox] = await Promise.all([
      page.locator('#open').boundingBox(),
      menu.boundingBox(),
    ]);
    // `gap` is honored in viewport pixels, even through a scaled dialog.
    expect(
      Math.abs(menuBox!.y - (anchorBox!.y + anchorBox!.height + 6)),
    ).toBeLessThan(1.5);
    expect(Math.abs(menuBox!.x - anchorBox!.x)).toBeLessThan(1.5);
    // The probe that measured the containing block is gone.
    expect(
      await page.evaluate(
        () =>
          document.querySelector('[data-kerf-overlay-host]')!.children.length,
      ),
    ).toBe(1);

    // A tooltip rides the same placement core.
    await page.locator('#tip').hover();
    const tip = page.locator('.tip');
    await expect(tip).toBeVisible();
    const [tipAnchor, tipBox] = await Promise.all([
      page.locator('#tip').boundingBox(),
      tip.boundingBox(),
    ]);
    expect(
      Math.abs(tipBox!.y - (tipAnchor!.y + tipAnchor!.height + 4)),
    ).toBeLessThan(1.5);
    expect(Math.abs(tipBox!.x - tipAnchor!.x)).toBeLessThan(1.5);
  });
}
