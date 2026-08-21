/**
 * Real-browser spec for state-preserving moves (KF-518 / docs/18): where the
 * engine supports `Node.prototype.moveBefore()`, a keyed reorder relocates a row
 * ATOMICALLY, so live state the focus snapshot can't restore survives too — the
 * differential proof here is a RUNNING CSS ANIMATION whose clock keeps ticking
 * across the move (an `insertBefore` reorder detaches + re-attaches the row,
 * which restarts its CSS animations from zero).
 *
 * The animation-continuity assertion is gated on `moveBefore` support (Chromium
 * as of early 2026; Firefox/WebKit fall back to `insertBefore`, where a restart
 * is expected and correct). Focus survival is asserted on every engine — the
 * fallback path (`list-reconcile-focus.ts`) covers engines without `moveBefore`,
 * and `input-preservation.spec.ts` exercises that promise across all three in
 * depth. Runs on Chromium / Firefox / WebKit.
 */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
  // Three keyed rows, each an <li> holding an animated bar + an <input>. The
  // animation is long (100s) so it can't finish during the test; its
  // `currentTime` is the clock we watch across the reorder.
  await page.evaluate(() => {
    const { mount, each, signal } = (window as any).kerf;
    const { jsx } = (window as any).jsxRuntime;

    const style = document.createElement('style');
    style.textContent = '@keyframes kf-move-test { from { opacity: 1 } to { opacity: 0 } }'
      + ' .bar { animation: kf-move-test 100s linear }';
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);

    const a = { id: 'a' };
    const b = { id: 'b' };
    const c = { id: 'c' };
    const rows = signal([a, b, c]);
    (window as any)._rows = rows;
    (window as any)._order = { a, b, c };

    mount(root, () =>
      jsx('ul', {
        children: each(
          rows.value,
          (r: any) =>
            jsx('li', {
              'data-key': r.id,
              children: [
                jsx('div', { class: 'bar' }),
                jsx('input', { class: 'inp' }),
              ],
            }),
          (r: any) => r.id,
        ),
      }),
    );
  });
});

test('a keyed reorder preserves focus + caret in the moved row (all engines)', async ({ page }) => {
  const input = page.locator('li[data-key="b"] .inp');
  await input.click();
  await input.pressSequentially('typed');
  await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(1, 3)); // "t[yp]ed"

  // Reorder so row `b` moves — [a,b,c] -> [c,b,a].
  await page.evaluate(() => {
    const { a, b, c } = (window as any)._order;
    (window as any)._rows.value = [c, b, a];
  });

  const live = page.locator('li[data-key="b"] .inp');
  expect(await live.inputValue()).toBe('typed');
  expect(await live.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(1);
  expect(await live.evaluate((el: HTMLInputElement) => el.selectionEnd)).toBe(3);
  expect(await live.evaluate((el) => document.activeElement === el)).toBe(true);
});

test('where moveBefore is supported, a running CSS animation survives the reorder without restarting', async ({ page }) => {
  const supportsMoveBefore = await page.evaluate(
    () => typeof (Element.prototype as { moveBefore?: unknown }).moveBefore === 'function',
  );
  test.skip(!supportsMoveBefore, 'engine has no Node.prototype.moveBefore — insertBefore fallback restarts animations by design');

  // Let the animation run so its clock is well past zero.
  await page.waitForTimeout(300);

  const before = await page.evaluate(() => {
    const bar = document.querySelector('li[data-key="b"] .bar') as HTMLElement;
    const anim = bar.getAnimations()[0];
    return { currentTime: Number(anim.currentTime), startTime: Number(anim.startTime) };
  });
  expect(before.currentTime).toBeGreaterThan(0);

  // Reorder — row `b` moves. With moveBefore the animation clock keeps ticking;
  // with insertBefore it would reset to ~0 (a fresh Animation, new startTime).
  await page.evaluate(() => {
    const { a, b, c } = (window as any)._order;
    (window as any)._rows.value = [c, b, a];
  });

  const after = await page.evaluate(() => {
    const bar = document.querySelector('li[data-key="b"] .bar') as HTMLElement;
    const anim = bar.getAnimations()[0];
    return { currentTime: Number(anim.currentTime), startTime: Number(anim.startTime) };
  });

  // The animation did NOT restart: its clock is at or beyond where it was, and
  // its startTime (the moment it began on the timeline) is unchanged.
  expect(after.currentTime).toBeGreaterThanOrEqual(before.currentTime - 1);
  expect(after.startTime).toBeCloseTo(before.startTime, 0);
});
