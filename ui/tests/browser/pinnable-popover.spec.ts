import process from 'node:process';

import { expect, type Locator, type Page, test } from '@playwright/test';

const GUTTER = 16;

async function openLibrary(page: Page): Promise<Locator> {
  await page.goto('/?component=surface-scaffold');
  const trigger = page.getByRole('button', {
    name: 'Open Library',
    exact: true,
  });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  // Named from its title; closed, it leaves the accessibility tree, so the
  // tests follow it by id.
  await expect(
    page.getByRole('dialog', { name: 'Library', exact: true }),
  ).toBeVisible();
  return page.locator('#catalog-library-popover');
}

const box = async (locator: Locator) => (await locator.boundingBox())!;
const isOpen = (surface: Locator) =>
  surface.evaluate((element) => element.matches(':popover-open'));

test('opens transient below its button and light-dismisses only while unpinned', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const surface = await openLibrary(page);
  const trigger = page.getByRole('button', {
    name: 'Open Library',
    exact: true,
  });
  const triggerBox = await box(trigger);
  const surfaceBox = await box(surface);
  // Below (or, without room, above) the button, start-aligned with it.
  expect(Math.abs(surfaceBox.x - triggerBox.x)).toBeLessThan(1);
  expect(
    surfaceBox.y >= triggerBox.y + triggerBox.height ||
      surfaceBox.y + surfaceBox.height <= triggerBox.y,
  ).toBe(true);
  const pin = surface.getByRole('button', { name: 'Pin', exact: true });
  await expect(pin).toHaveAttribute('aria-pressed', 'false');

  // A press on the page closes the transient surface.
  await page.mouse.click(1400, 880);
  await expect.poll(() => isOpen(surface)).toBe(false);

  // Pinned, the page stays usable and the surface stays open.
  await trigger.click();
  await expect.poll(() => isOpen(surface)).toBe(true);
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await expect(surface).toHaveAttribute('data-pinned', '');
  await page.mouse.click(1400, 880);
  await expect.poll(() => isOpen(surface)).toBe(true);
  await expect(page.getByText(/^Saved: pinned at /)).toBeVisible();

  // Escape from inside still closes it.
  await pin.focus();
  await page.keyboard.press('Escape');
  await expect.poll(() => isOpen(surface)).toBe(false);

  // Escape closes a transient surface too.
  await trigger.click();
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  await expect.poll(() => isOpen(surface)).toBe(false);
});

test('drags by its title, pinning it, and moves with the arrow keys', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const surface = await openLibrary(page);
  const handle = surface.locator('.kui-pinnable-popover-surface__handle');
  await expect(handle).toHaveAccessibleDescription(/arrow keys/);
  const start = await box(surface);
  const grip = await box(handle);
  await page.mouse.move(grip.x + 20, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 120, grip.y + grip.height / 2 + 60, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(surface).toHaveAttribute('data-pinned', '');
  const moved = await box(surface);
  expect(moved.x - start.x).toBeCloseTo(100, 0);
  expect(moved.y - start.y).toBeCloseTo(60, 0);
  await expect(
    surface.getByRole('button', { name: 'Pin', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');

  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Shift+ArrowLeft');
  const keyed = await box(surface);
  expect(keyed.x - moved.x).toBeCloseTo(8 - 40, 0);
  expect(keyed.y - moved.y).toBeCloseTo(8, 0);
  await expect(page.getByText(/^Saved: pinned at /)).toContainText(
    `${Math.round(keyed.x)}, ${Math.round(keyed.y)}`,
  );

  // Dragged past the viewport edge, it stays inside the gutter.
  const grip2 = await box(handle);
  await page.mouse.move(grip2.x + 20, grip2.y + 10);
  await page.mouse.down();
  await page.mouse.move(-400, -400, { steps: 6 });
  await page.mouse.up();
  const clamped = await box(surface);
  expect(clamped.x).toBeCloseTo(GUTTER, 0);
  expect(clamped.y).toBeCloseTo(GUTTER, 0);
});

test('stays clamped inside the viewport on resize and returns when there is room', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const surface = await openLibrary(page);
  const handle = surface.locator('.kui-pinnable-popover-surface__handle');
  const grip = await box(handle);
  await page.mouse.move(grip.x + 20, grip.y + 10);
  await page.mouse.down();
  await page.mouse.move(1400, 850, { steps: 6 });
  await page.mouse.up();
  const parked = await box(surface);
  expect(parked.x + parked.width).toBeCloseTo(1440 - GUTTER, 0);

  await page.setViewportSize({ width: 800, height: 600 });
  await expect
    .poll(async () => {
      const shrunk = await box(surface);
      return (
        shrunk.x >= GUTTER - 1 &&
        shrunk.y >= GUTTER - 1 &&
        shrunk.x + shrunk.width <= 800 - GUTTER + 1 &&
        shrunk.y + shrunk.height <= 600 - GUTTER + 1
      );
    })
    .toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(async () => Math.round((await box(surface)).x))
    .toBe(Math.round(parked.x));
});

test('reopens at the saved pinned placement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const surface = await openLibrary(page);
  const handle = surface.locator('.kui-pinnable-popover-surface__handle');
  const grip = await box(handle);
  await page.mouse.move(grip.x + 20, grip.y + 10);
  await page.mouse.down();
  await page.mouse.move(grip.x + 320, grip.y + 210, { steps: 6 });
  await page.mouse.up();
  const saved = await box(surface);
  await surface.getByRole('button', { name: 'Close', exact: true }).click();
  await expect.poll(() => isOpen(surface)).toBe(false);

  await page.getByRole('button', { name: 'Reopen Saved', exact: true }).click();
  await expect.poll(() => isOpen(surface)).toBe(true);
  const restored = await box(surface);
  expect(restored.x).toBeCloseTo(saved.x, 0);
  expect(restored.y).toBeCloseTo(saved.y, 0);
  await expect(surface).toHaveAttribute('data-pinned', '');
});

test('resizes from its corner while pinned and reports the size', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const surface = await openLibrary(page);
  await expect(surface).toHaveCSS('resize', 'none');
  await surface.getByRole('button', { name: 'Pin', exact: true }).click();
  await expect(surface).toHaveCSS('resize', 'both');
  const before = await box(surface);
  // Linux WebKit draws no draggable resize grip for a pointer drag (its
  // headless build ignores it), so there the box is resized as the grip
  // would resize it; what Kerf owns is reporting and keeping the new size.
  if (browserName === 'webkit' && process.platform === 'linux') {
    await surface.evaluate(
      (element, size) => {
        element.style.width = `${size.width}px`;
        element.style.height = `${size.height}px`;
      },
      { width: before.width + 80, height: before.height - 60 },
    );
  } else {
    await page.mouse.move(
      before.x + before.width - 3,
      before.y + before.height - 3,
    );
    await page.mouse.down();
    await page.mouse.move(
      before.x + before.width + 77,
      before.y + before.height - 63,
      { steps: 6 },
    );
    await page.mouse.up();
  }
  const after = await box(surface);
  expect(after.width - before.width).toBeCloseTo(80, -1);
  expect(after.height - before.height).toBeCloseTo(-60, -1);
  await expect(page.getByText(/^Saved: pinned at /)).toContainText(
    `${Math.round(after.width)} × ${Math.round(after.height)}`,
  );
});

test('fits a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const surface = await openLibrary(page);
  const opened = await box(surface);
  expect(opened.x).toBeGreaterThanOrEqual(GUTTER - 1);
  expect(opened.x + opened.width).toBeLessThanOrEqual(390 - GUTTER + 1);
  expect(opened.y + opened.height).toBeLessThanOrEqual(844 - GUTTER + 1);
});

// KF-850ZRF: pinnable={false} closable={false} is a persistent floating panel
// an app control shows and hides, with no Pin toggle and no Close button.
test('a persistent floating panel has no Pin or Close and only its app control hides it', async ({
  page,
  browserName,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=surface-scaffold');
  const toggle = page.getByRole('button', {
    name: 'Toggle Announcer',
    exact: true,
  });
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  const surface = page.locator('#catalog-announcer-popover');
  await expect(
    page.getByRole('dialog', { name: 'Announcer', exact: true }),
  ).toBeVisible();
  await expect(surface).toHaveAttribute('data-pinned', '');
  await expect(surface).toHaveCSS('resize', 'both');
  const header = surface.locator('.kui-pinnable-popover-surface__header');
  await expect(header.getByRole('button')).toHaveText(['Announcer', '']);
  await expect(
    header.getByRole('button', { name: 'Dock Announcer', exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole('button', { name: /^(Pin|Close)$/ }),
  ).toHaveCount(0);
  await surface.screenshot({
    path: testInfo.outputPath(`persistent-panel-${browserName}.png`),
  });

  // A press outside leaves it open.
  await page.mouse.click(1400, 880);
  await expect.poll(() => isOpen(surface)).toBe(true);

  // Drag by the title and move with the arrow keys; it stays pinned.
  const handle = surface.locator('.kui-pinnable-popover-surface__handle');
  const start = await box(surface);
  const grip = await box(handle);
  await page.mouse.move(grip.x + 20, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 120, grip.y + grip.height / 2 + 60, {
    steps: 6,
  });
  await page.mouse.up();
  const moved = await box(surface);
  expect(moved.x - start.x).toBeCloseTo(100, 0);
  expect(moved.y - start.y).toBeCloseTo(60, 0);
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  expect((await box(surface)).x - moved.x).toBeCloseTo(8, 0);
  // Escape inside it is the app's to handle: it stays open.
  await page.keyboard.press('Escape');
  await expect.poll(() => isOpen(surface)).toBe(true);
  await expect(surface).toHaveAttribute('data-pinned', '');

  // Clamped inside the viewport when the window shrinks.
  await page.setViewportSize({ width: 600, height: 500 });
  await expect
    .poll(async () => {
      const shrunk = await box(surface);
      return (
        shrunk.x >= GUTTER - 1 &&
        shrunk.y >= GUTTER - 1 &&
        shrunk.x + shrunk.width <= 600 - GUTTER + 1 &&
        shrunk.y + shrunk.height <= 500 - GUTTER + 1
      );
    })
    .toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Its header control and the app toggle hide it.
  await header.getByRole('button', { name: 'Dock Announcer' }).click();
  await expect.poll(() => isOpen(surface)).toBe(false);
  await toggle.click();
  await expect.poll(() => isOpen(surface)).toBe(true);
  await toggle.click();
  await expect.poll(() => isOpen(surface)).toBe(false);
});
