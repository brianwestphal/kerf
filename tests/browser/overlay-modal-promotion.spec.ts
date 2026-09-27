/**
 * Real-browser spec for surfaces opened while a native modal `<dialog>` is
 * open. A browser inerts everything outside an open modal dialog and paints a
 * plain element beneath its top layer, so kerf lifts a non-native surface
 * opened in that state into the top layer itself. happy-dom has neither the
 * Popover API nor real inerting, so only a real engine can show that the
 * tooltip is actually visible above the dialog and that a lifted modal is
 * actually clickable. The unit half is `tests/unit/overlay-modal-promotion.internal.test.ts`.
 */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

test('a non-native tooltip over a native modal <dialog> is lifted into the top layer and painted above it', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { overlay, tooltip } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    overlay(raw('<button id="in-dialog">settings</button>'), {
      className: 'host-dialog',
      native: true,
      initialFocus: '#in-dialog',
    });
    tooltip(document.getElementById('in-dialog'), 'Opens settings', {
      delay: 0,
      hideDelay: 0,
    });
  });

  await page.locator('#in-dialog').hover();
  const tip = page.locator('.kerf-tooltip');
  await expect(tip).toHaveText('Opens settings');
  expect(await tip.evaluate((el) => el.matches(':popover-open'))).toBe(true);

  // Paint order, measured in pixels: hit-testing can't see an element the
  // modal inerts. An opaque backdrop hides anything painted beneath the
  // dialog; a red tooltip must still show in its own box.
  const clip = await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent =
      'dialog.host-dialog::backdrop{background:#fff}' +
      '.kerf-tooltip,.plain-control{background:#f00;color:#f00;border:0;padding:4px}';
    document.head.appendChild(style);
    const r = document.querySelector('.kerf-tooltip')!.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  const shown = await page.screenshot({ clip });
  await tip.evaluate((el) => (el.style.visibility = 'hidden'));
  const hidden = await page.screenshot({ clip });
  expect(shown.equals(hidden)).toBe(false); // the tooltip is painted above

  // Control: a plain <div> at the same spot (what kerf used to create) is
  // painted beneath the backdrop and changes nothing.
  await page.evaluate((c) => {
    const plain = document.createElement('div');
    plain.className = 'plain-control';
    plain.textContent = 'Opens settings';
    Object.assign(plain.style, {
      position: 'fixed',
      left: `${c.x}px`,
      top: `${c.y}px`,
      width: `${c.width}px`,
      height: `${c.height}px`,
      boxSizing: 'border-box',
    });
    document.body.appendChild(plain);
  }, clip);
  expect((await page.screenshot({ clip })).equals(hidden)).toBe(true);
});

test('a non-native confirm() opened from inside a native modal <dialog> becomes its own modal dialog and is clickable', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { overlay, confirm } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    overlay(raw('<button id="delete">delete</button>'), {
      className: 'host-dialog',
      native: true,
      initialFocus: '#delete',
    });
    (window as any)._answer = confirm('Delete it?', { className: 'inner' });
  });

  const inner = page.locator('dialog.inner');
  await expect(inner).toHaveCount(1);
  await inner.locator('[data-confirm="ok"]').click(); // would be inert as a plain <div>
  expect(await page.evaluate(() => (window as any)._answer)).toBe(true);
  await expect(inner).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (document.querySelector('dialog.host-dialog') as HTMLDialogElement)
          .open,
    ),
  ).toBe(true);
});
