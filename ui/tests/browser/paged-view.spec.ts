import { expect, type Locator, type Page, test } from '@playwright/test';

// KF-0QJ2K3: PagedView in the catalog demo, driven by real pointer, wheel,
// and keys: dot clicks, arrow keys, a sideways scroll that snaps to a page,
// reduced motion, and a narrow sidebar that stays on its page across resizes.
// KF-QV9149 adds Chromium-only real touch swipes (see the `touch` group).

const view = (page: Page, label: string) =>
  page
    .locator('[data-component="paged-view"]')
    .filter({ has: page.getByRole('tablist', { name: label, exact: true }) });

const dot = (scope: Locator, name: string) =>
  scope.getByRole('tab', { name, exact: true });

/** The visible page fills the viewport: its box matches the viewport's. */
async function expectShowing(scope: Locator, pageId: string) {
  const viewport = scope.locator('.kui-paged-view__viewport');
  const shown = scope.locator(`[data-paged-view-page="${pageId}"]`);
  await expect
    .poll(async () => {
      const [outer, inner] = await Promise.all([
        viewport.boundingBox(),
        shown.boundingBox(),
      ]);
      return (
        Math.abs(outer!.x - inner!.x) < 1 &&
        Math.abs(outer!.width - inner!.width) < 1
      );
    })
    .toBe(true);
  await expect(shown).not.toHaveAttribute('inert');
  await expect(scope).toHaveAttribute('data-page', pageId);
}

test('PagedView pages by dot click and arrow keys', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=paged-view');
  const three = view(page, 'Activity Pages');
  await expect(dot(three, 'Page 1 of 3: Today')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expectShowing(three, 'today');
  await page.mouse.move(1, 1);
  await three.screenshot({
    path: info.outputPath('kf-0qj2k3-paged-view-today-1280.png'),
    animations: 'disabled',
  });

  await dot(three, 'Page 3 of 3: Triage').click();
  await expect(dot(three, 'Page 3 of 3: Triage')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expectShowing(three, 'triage');
  // Off-screen pages are inert, so Tab reaches only the visible page.
  await expect(three.locator('[data-paged-view-page="today"]')).toHaveAttribute(
    'inert',
    '',
  );

  await dot(three, 'Page 3 of 3: Triage').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(dot(three, 'Page 2 of 3: Token Rate')).toBeFocused();
  await expectShowing(three, 'rates');
  await page.keyboard.press('Home');
  await expect(dot(three, 'Page 1 of 3: Today')).toBeFocused();
  await expectShowing(three, 'today');
  await page.keyboard.press('End');
  await expect(dot(three, 'Page 3 of 3: Triage')).toBeFocused();
  await expectShowing(three, 'triage');
  // Clamped at the last page.
  await page.keyboard.press('ArrowRight');
  await expect(dot(three, 'Page 3 of 3: Triage')).toBeFocused();
  await page.mouse.move(1, 1);
  await three.screenshot({
    path: info.outputPath('kf-0qj2k3-paged-view-triage-focus-1280.png'),
    animations: 'disabled',
  });
});

test('a sideways scroll snaps to a page and reports it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=paged-view');
  const two = view(page, 'Summary Pages');
  const viewport = two.locator('.kui-paged-view__viewport');
  await expectShowing(two, 'today');
  // A trackpad's horizontal scroll: less than half a page still snaps on.
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(box.width * 0.7, 0);
  await expect(dot(two, 'Page 2 of 2: Token Rate')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expectShowing(two, 'rates');
  // And back.
  await page.mouse.wheel(-box.width * 0.7, 0);
  await expect(dot(two, 'Page 1 of 2: Today')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expectShowing(two, 'today');
});

test('reduced motion pages without a slide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=paged-view');
  const three = view(page, 'Activity Pages');
  const viewport = three.locator('.kui-paged-view__viewport');
  await expect(viewport).toHaveCSS('scroll-behavior', 'auto');
  await dot(three, 'Page 2 of 3: Token Rate').click();
  // The jump lands by the next frame: no animation in between.
  const left = await viewport.evaluate(
    (element) =>
      new Promise<number>((resolve) =>
        element.ownerDocument.defaultView!.requestAnimationFrame(() =>
          resolve(element.scrollLeft),
        ),
      ),
  );
  const width = await viewport.evaluate((element) => element.clientWidth);
  expect(Math.abs(left - width)).toBeLessThan(1);
  await expectShowing(three, 'rates');
});

test('a narrow sidebar keeps its page across resizes', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=paged-view');
  const sidebar = view(page, 'Sidebar Pages');
  await sidebar.scrollIntoViewIfNeeded();
  await dot(sidebar, 'Page 2 of 3: Token Rate').click();
  await expectShowing(sidebar, 'rates');
  // Dots stay whole targets at the narrow width.
  for (const name of [
    'Page 1 of 3: Today',
    'Page 2 of 3: Token Rate',
    'Page 3 of 3: Triage',
  ]) {
    const target = (await dot(sidebar, name).boundingBox())!;
    expect(target.width).toBeGreaterThanOrEqual(24);
    expect(target.height).toBeGreaterThanOrEqual(24);
  }
  await page.mouse.move(1, 1);
  await sidebar.screenshot({
    path: info.outputPath('kf-0qj2k3-paged-view-sidebar-390.png'),
    animations: 'disabled',
  });
  // The dots float fixed at the bottom: a long page scrolls beneath them and
  // its last row ends clear of them.
  await dot(sidebar, 'Page 3 of 3: Triage').click();
  await expectShowing(sidebar, 'triage');
  const dots = sidebar.getByRole('tablist');
  const triage = sidebar.locator('[data-paged-view-page="triage"]');
  const before = (await dots.boundingBox())!;
  await triage.evaluate((element: HTMLElement) => {
    element.scrollTop = element.scrollHeight;
  });
  const after = (await dots.boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
  const lastRow = (await triage
    .getByRole('button', { name: /Legacy Archive/ })
    .boundingBox())!;
  expect(lastRow.y + lastRow.height).toBeLessThanOrEqual(after.y);
  await triage.evaluate((element: HTMLElement) => {
    element.scrollTop = 0;
  });
  await dot(sidebar, 'Page 2 of 3: Token Rate').click();
  await expectShowing(sidebar, 'rates');
  // The region narrows and widens again: the browser re-snaps to the page.
  const frame = sidebar.locator('xpath=..');
  await frame.evaluate((element: HTMLElement) => {
    element.style.width = '200px';
  });
  await expectShowing(sidebar, 'rates');
  await frame.evaluate((element: HTMLElement) => {
    element.style.width = '';
  });
  await expectShowing(sidebar, 'rates');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectShowing(sidebar, 'rates');
});

// KF-QV9149: a real touch swipe. Playwright has no cross-engine touch-drag
// API, so this drives Chromium's input pipeline over the DevTools protocol
// (`Input.dispatchTouchEvent` in a `hasTouch` context): the browser's own
// gesture, fling, and scroll snapping run, as on a phone. iOS Safari and
// Android Chrome are covered by the manual plan in docs/paged-view.md.
test.describe('touch', () => {
  test.use({ hasTouch: true });

  /** Record every `data-page` the view renders, i.e. each onPageChange the
   * demo applied (it re-renders synchronously with the reported page). */
  const recordPages = (scope: Locator) =>
    scope.evaluate((element: HTMLElement) => {
      const seen: string[] = [];
      (element as unknown as { kfPages: string[] }).kfPages = seen;
      new MutationObserver(() => seen.push(element.dataset.page!)).observe(
        element,
        { attributes: true, attributeFilter: ['data-page'] },
      );
    });
  const recordedPages = (scope: Locator) =>
    scope.evaluate(
      (element) => (element as unknown as { kfPages: string[] }).kfPages,
    );

  /** One finger drags from `from` to `to` (fractions of the viewport's
   * width) across its middle in `steps` moves `stepMs` apart, then lifts.
   * The moves carry synthetic timestamps, so the browser derives the fling
   * velocity from them without the test sleeping between moves. */
  async function swipe(
    page: Page,
    viewport: Locator,
    { from, to, steps, stepMs }: Record<string, number>,
  ) {
    const box = (await viewport.boundingBox())!;
    const y = Math.round(box.y + box.height / 2);
    const session = await page.context().newCDPSession(page);
    const start = Date.now() / 1000;
    const at = (fraction: number) => [
      { x: Math.round(box.x + box.width * fraction), y, id: 1 },
    ];
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: at(from!),
      timestamp: start,
    });
    for (let step = 1; step <= steps!; step += 1)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: at(from! + ((to! - from!) * step) / steps!),
        timestamp: start + (step * stepMs!) / 1000,
      });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
      timestamp: start + ((steps! + 1) * stepMs!) / 1000,
    });
    await session.detach();
  }

  /** Pace the hard fling in real time. Linux Chromium can acknowledge a CDP
   * synthesized gesture or back-to-back timestamped moves without scrolling. */
  async function hardFling(page: Page, viewport: Locator) {
    const box = (await viewport.boundingBox())!;
    const before = await viewport.evaluate((element) => element.scrollLeft);
    const y = Math.round(box.y + box.height * 0.75);
    const point = (fraction: number) => [
      { x: Math.round(box.x + box.width * fraction), y, id: 1 },
    ];
    const pace = () =>
      new Promise<void>((resolve) => globalThis.setTimeout(resolve, 8));
    // Aim below page controls. Retry only an input no-op, never a gesture that
    // moved to the wrong page; the caller checks that snap contract separately.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const session = await page.context().newCDPSession(page);
      try {
        const start = Date.now() / 1000;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: point(0.75),
          timestamp: start,
        });
        for (let step = 1; step <= 4; step += 1) {
          await pace();
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: point(0.75 - (0.55 * step) / 4),
            timestamp: start + (step * 8) / 1000,
          });
        }
        await pace();
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
          timestamp: start + (5 * 8) / 1000,
        });
      } finally {
        await session.detach();
      }
      try {
        await expect
          .poll(() => viewport.evaluate((element) => element.scrollLeft), {
            timeout: 750,
          })
          .toBeGreaterThan(before + 1);
        return;
      } catch {
        // No horizontal input reached the viewport; try another touch gesture.
      }
    }
    throw new Error('Chromium touch gesture did not scroll the viewport');
  }

  /** Resolves once the viewport has had no scroll event for a while longer
   * than the wiring's settle fallback: the fling, the snap, and any late
   * settle report are over. */
  const scrollQuiet = (viewport: Locator) =>
    viewport.evaluate(
      (element) =>
        new Promise<void>((resolve) => {
          let timer = 0;
          const arm = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
              element.removeEventListener('scroll', arm);
              resolve();
            }, 300);
          };
          element.addEventListener('scroll', arm, { passive: true });
          arm();
        }),
    );

  test('a short flick snaps to the next page and reports it once', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'touch drags need the Chromium DevTools protocol; iOS Safari and Android Chrome are in the manual plan',
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?component=paged-view');
    const three = view(page, 'Activity Pages');
    const viewport = three.locator('.kui-paged-view__viewport');
    await expectShowing(three, 'today');
    await recordPages(three);
    // A quarter-page flick: short, but quick enough to fling on.
    await swipe(page, viewport, { from: 0.6, to: 0.35, steps: 4, stepMs: 16 });
    await expect(dot(three, 'Page 2 of 3: Token Rate')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expectShowing(three, 'rates');
    // Settled: any late scrollend or quiet-period settle has run, and
    // onPageChange fired once without the page bouncing.
    await scrollQuiet(viewport);
    expect(await recordedPages(three)).toEqual(['rates']);
  });

  test('a hard fling stops on each page (scroll-snap-stop: always)', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'touch drags need the Chromium DevTools protocol; iOS Safari and Android Chrome are in the manual plan',
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?component=paged-view');
    const three = view(page, 'Activity Pages');
    const viewport = three.locator('.kui-paged-view__viewport');
    await expectShowing(three, 'today');
    await recordPages(three);
    // A fast flick of under a page. Its momentum alone would carry past
    // Token Rate to Triage (it does with `scroll-snap-stop: normal`); the
    // stop holds it on the next page.
    await hardFling(page, viewport);
    await expectShowing(three, 'rates');
    await scrollQuiet(viewport);
    expect(await recordedPages(three)).toEqual(['rates']);
    // The same flick again moves one more page, reported once more.
    await hardFling(page, viewport);
    await expectShowing(three, 'triage');
    await scrollQuiet(viewport);
    expect(await recordedPages(three)).toEqual(['rates', 'triage']);
  });

  test('a slow, short drag springs back without a report', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'touch drags need the Chromium DevTools protocol; iOS Safari and Android Chrome are in the manual plan',
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?component=paged-view');
    const three = view(page, 'Activity Pages');
    const viewport = three.locator('.kui-paged-view__viewport');
    await expectShowing(three, 'today');
    await recordPages(three);
    await swipe(page, viewport, { from: 0.6, to: 0.45, steps: 10, stepMs: 60 });
    await scrollQuiet(viewport);
    await expectShowing(three, 'today');
    expect(await recordedPages(three)).toEqual([]);
  });
});
