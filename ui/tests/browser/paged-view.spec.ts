import { expect, type Locator, type Page, test } from '@playwright/test';

// KF-0QJ2K3: PagedView in the catalog demo, driven by real pointer, wheel,
// and keys: dot clicks, arrow keys, a sideways scroll that snaps to a page,
// reduced motion, and a narrow sidebar that stays on its page across resizes.

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
