import { expect, type Locator, type Page, test } from '@playwright/test';

// KF-K3TXCT: `responsive="wrap-groups"` wraps a leading zone made of control
// groups. Whole leading groups share a row with the trailing zone while they
// fit and move to the next row when they do not, so no control is clipped;
// the trailing zone stays at the inline end, and widening the toolbar again
// restores one row.

const example = (page: Page) =>
  page.locator('[data-demo-toolbar-overflow="wrap-groups"]');

type Box = { x: number; y: number; width: number; height: number };

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('missing box');
  return box;
}

/** Every control sits wholly inside the toolbar and the example frame. */
async function expectWholeControls(toolbar: Locator, frame: Locator) {
  const toolbarBox = await boxOf(toolbar);
  const frameBox = await boxOf(frame);
  const left = Math.max(toolbarBox.x, frameBox.x) - 0.5;
  const right =
    Math.min(toolbarBox.x + toolbarBox.width, frameBox.x + frameBox.width) +
    0.5;
  const controls = await toolbar.locator('button').all();
  expect(controls.length).toBeGreaterThan(4);
  for (const control of controls) {
    const box = await boxOf(control);
    expect(box.width).toBeGreaterThan(0);
    expect(box.x).toBeGreaterThanOrEqual(left);
    expect(box.x + box.width).toBeLessThanOrEqual(right);
    // Each control keeps the 44px group band (no squeezed control).
    expect(box.height).toBeGreaterThan(30);
  }
  const groups = await toolbar
    .locator('[data-component="toolbar-control-group"]')
    .all();
  for (const group of groups)
    expect(
      await group.evaluate((el) => el.scrollWidth <= el.clientWidth + 0.5),
    ).toBe(true);
}

async function layout(page: Page) {
  const root = example(page);
  const toolbar = root.locator('[data-component="toolbar"]');
  const group = (name: string) => toolbar.getByRole('group', { name });
  return {
    toolbar,
    frame: root.locator('[data-catalog-example-viewport]'),
    setup: await boxOf(group('Page Setup')),
    style: await boxOf(group('Text Style')),
    tools: await boxOf(group('Draft Tools')),
    options: await boxOf(group('Draft Options')),
    settings: await boxOf(group('Editor Settings')),
    toolbarBox: await boxOf(toolbar),
  };
}

async function expectOneRow(page: Page) {
  const { toolbar, frame, setup, style, tools, options, settings, toolbarBox } =
    await layout(page);
  await expectWholeControls(toolbar, frame);
  for (const box of [style, tools, options, settings])
    expect(Math.abs(box.y - setup.y)).toBeLessThan(1);
  // Leading groups in source order at the leading end; settings at the end.
  expect(style.x).toBeGreaterThan(setup.x + setup.width);
  expect(tools.x).toBeGreaterThan(style.x + style.width);
  expect(options.x).toBeGreaterThan(tools.x + tools.width);
  expect(settings.x - (options.x + options.width)).toBeGreaterThan(40);
  expect(
    toolbarBox.x + toolbarBox.width - (settings.x + settings.width),
  ).toBeLessThan(12);
}

async function expectWrapped(page: Page) {
  const { toolbar, frame, setup, style, tools, options, settings, toolbarBox } =
    await layout(page);
  await expectWholeControls(toolbar, frame);
  // Groups never move above an earlier group's row, and at least one leading
  // group or the trailing zone takes a later row.
  expect(style.y).toBeGreaterThanOrEqual(setup.y - 0.5);
  expect(tools.y).toBeGreaterThanOrEqual(style.y - 0.5);
  expect(options.y).toBeGreaterThanOrEqual(tools.y - 0.5);
  expect(settings.y).toBeGreaterThanOrEqual(options.y - 0.5);
  // The leading zone itself wraps: its last group leaves the first row.
  expect(options.y).toBeGreaterThan(setup.y + setup.height - 0.5);
  // A wrapped group starts its row at the toolbar's leading inset.
  const firstOnLaterRow = [style, tools, options].find(
    (box) => box.y > setup.y + setup.height - 0.5,
  );
  if (firstOnLaterRow)
    expect(Math.abs(firstOnLaterRow.x - setup.x)).toBeLessThan(1);
  // The trailing zone stays at the inline end of its row.
  expect(
    toolbarBox.x + toolbarBox.width - (settings.x + settings.width),
  ).toBeLessThan(12);
}

test('wrap-groups keeps one row at 1440, wraps whole groups at 390, and restores the row (KF-K3TXCT)', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=toolbar');
  await expect(
    example(page).locator('[data-component="toolbar"]'),
  ).toHaveAttribute('data-responsive', 'wrap-groups');
  await expectOneRow(page);
  if (browserName === 'chromium')
    await example(page).screenshot({
      path: test.info().outputPath('kf-k3txct-demo-1440.png'),
    });

  await page.setViewportSize({ width: 390, height: 900 });
  await expect
    .poll(async () => (await layout(page)).settings.y)
    .toBeGreaterThan((await layout(page)).setup.y + 10);
  await expectWrapped(page);
  if (browserName === 'chromium')
    await example(page).screenshot({
      path: test.info().outputPath('kf-k3txct-demo-390.png'),
    });

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(async () => {
      const { setup, settings } = await layout(page);
      return Math.abs(settings.y - setup.y);
    })
    .toBeLessThan(1);
  await expectOneRow(page);
});

test('wrap-groups at a 390 load wraps without clipping (KF-K3TXCT)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/?component=toolbar');
  await expect(example(page)).toBeVisible();
  await expectWrapped(page);
});
