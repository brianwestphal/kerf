import { resolve } from 'node:path';

import { expect, type Locator, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-DFHQ5Q: while a side overlay (a Workbench rail, a CollapsiblePanel, a
// ResizableRegion) is open over the work area, the work area's floating
// controls — an app FloatingToolbar and the layouts' restore corners — are
// hidden and unfocusable instead of painting over the overlay (a compact
// Hot Sheet inspector showed the main column's floating drawer toggle on top
// of it). They come back as the overlay closes; the overlay's own floating
// toolbar stays.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/covered-floating.tsx')],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

type Scenario =
  'workbench' | 'workbench-static' | 'sidebar' | 'panel-static' | 'region';

async function mountFixture(page: Page, scenario: Scenario): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Covered fixture emitted no JS/CSS');
  await page.setContent(
    '<!doctype html><html><body style="margin:0"><div data-covered-fixture></div></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await page.evaluate((value) => {
    (
      globalThis as unknown as { coveredFixture: { show(v: string): void } }
    ).coveredFixture.show(value);
  }, scenario);
}

const setPanel = (
  page: Page,
  name: 'left' | 'right' | 'drawer',
  collapsed: boolean,
) =>
  page.evaluate(
    ([panel, value]) => {
      (
        globalThis as unknown as {
          coveredFixture: { set(n: string, c: boolean): void };
        }
      ).coveredFixture.set(panel, value);
    },
    [name, collapsed] as const,
  );

const mainAction = (page: Page) => page.locator('button[data-floating="main"]');

/** A button by its label; role queries skip the hidden controls asserted on. */
const control = (page: Page, label: string) =>
  page.locator(`button[aria-label="${label}"]`);

/** Whether `control` can take focus (a hidden control cannot). */
const focusable = (control: Locator) =>
  control.evaluate((button: HTMLElement) => {
    button.focus();
    const focused = document.activeElement === button;
    button.blur();
    return focused;
  });

/** The main toolbar's control is visible, focusable, and hit-testable. */
async function expectShown(control: Locator) {
  await expect(control).toBeVisible();
  expect(await focusable(control)).toBe(true);
}

/** The control is hidden: invisible, unfocusable, out of the a11y tree. */
async function expectCovered(control: Locator) {
  await expect(control).toBeHidden();
  await expect(control).toHaveCSS('visibility', 'hidden');
  expect(await focusable(control)).toBe(false);
}

test('a compact Workbench rail overlay hides the work area floating controls until it closes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await mountFixture(page, 'workbench');
  const main = mainAction(page);
  const leftRestore = control(page, 'Show navigator');
  const drawerRestore = control(page, 'Show console');
  await expectShown(main);
  await expectShown(leftRestore);
  await expectShown(drawerRestore);

  await setPanel(page, 'right', false);
  await expectCovered(main);
  await expectCovered(leftRestore);
  await expectCovered(drawerRestore);
  // The overlay's own floating toolbar stays.
  const inspector = page.locator('[data-workbench-rail="right"]');
  await expect(
    inspector.locator('button[data-floating="overlay"]'),
  ).toBeVisible();

  await setPanel(page, 'right', true);
  await expectShown(main);
  await expectShown(leftRestore);

  // The other side, then both closed again: the flag follows every crossing.
  await setPanel(page, 'left', false);
  await expectCovered(main);
  await expectCovered(control(page, 'Show inspector'));
  await setPanel(page, 'left', true);
  await expectShown(main);
  await expectShown(control(page, 'Show inspector'));

  // An open bottom drawer is not a side overlay: nothing hides.
  await setPanel(page, 'drawer', false);
  await expectShown(main);
});

test('an inline Workbench rail on a wide Workbench leaves the work area controls alone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountFixture(page, 'workbench');
  await setPanel(page, 'right', false);
  // Inline, the rail takes its own track beside the work area.
  const rail = (await page
    .locator('[data-workbench-rail="right"]')
    .boundingBox())!;
  const center = (await page.locator('.kui-workbench__center').boundingBox())!;
  expect(center.x + center.width).toBeLessThanOrEqual(rail.x + 1);
  await expectShown(mainAction(page));
  await expectShown(control(page, 'Show navigator'));

  // Narrowing across the breakpoint turns the open rail into an overlay.
  await page.setViewportSize({ width: 600, height: 800 });
  await expectCovered(mainAction(page));
  await page.setViewportSize({ width: 1280, height: 800 });
  await expectShown(mainAction(page));
});

test('a static overlay Workbench rail hides the work area controls at any width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountFixture(page, 'workbench-static');
  await expectShown(mainAction(page));
  await setPanel(page, 'right', false);
  await expectCovered(mainAction(page));
  await setPanel(page, 'right', true);
  await expectShown(mainAction(page));
});

test('a wireSidebar compact side overlay hides the content floating controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await mountFixture(page, 'sidebar');
  const main = mainAction(page);
  const consoleRestore = control(page, 'Show console');
  await expectShown(main);
  await expectShown(consoleRestore);

  await setPanel(page, 'right', false);
  await expect(page.locator('[data-covered-host]')).toHaveAttribute(
    'data-collapsible-overlay',
    'true',
  );
  await expectCovered(main);
  await expectCovered(consoleRestore);
  await expect(
    page
      .locator('[data-collapsible-panel="covered-inspector"]')
      .locator('button[data-floating="overlay"]'),
  ).toBeVisible();

  await setPanel(page, 'right', true);
  await expectShown(main);
  await expectShown(consoleRestore);

  // A bottom overlay is not a side overlay.
  await setPanel(page, 'drawer', false);
  await expectShown(main);
});

test('a static overlay CollapsiblePanel hides its siblings floating controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountFixture(page, 'panel-static');
  await expectShown(mainAction(page));
  await setPanel(page, 'left', false);
  await expectCovered(mainAction(page));
  await expect(
    page
      .locator('[data-collapsible-panel="covered-nav"]')
      .locator('button[data-floating="overlay"]'),
  ).toBeVisible();
  await setPanel(page, 'left', true);
  await expectShown(mainAction(page));
});

test('an overlay ResizableRegion side panel hides the work area floating controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await mountFixture(page, 'region');
  const main = mainAction(page);
  const navigator = control(page, 'Show navigator');
  await expectShown(main);
  await expectShown(navigator);

  await setPanel(page, 'right', false);
  await expectCovered(main);
  await expectCovered(navigator);
  await setPanel(page, 'right', true);
  await expectShown(main);
  await expectShown(navigator);

  // A vertical overlay drawer is not a side overlay: nothing hides.
  await setPanel(page, 'drawer', false);
  await expectShown(main);
});
