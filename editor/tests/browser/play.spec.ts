// KF-60BEEJ: play mode core (docs/26-ui-editor.md §11). Play shows the play
// bar and a stage whose frame runs the document with real wiring over a
// play-time copy; Done or Escape returns to the editor as it was.
import { expect, type Page, test } from '@playwright/test';

const ids = {
  tabs: '01JB8Z1M6Q8E1X9V4S7K2R3T8B',
  stack: '01JB8Z1M6Q8E1X9V4S7K2R3T8C',
  first: '01JB8Z1M6Q8E1X9V4S7K2R3T8D',
  second: '01JB8Z1M6Q8E1X9V4S7K2R3T8E',
  search: '01JB8Z1M6Q8E1X9V4S7K2R3T8F',
};

const text = (id: string, children: string) => ({
  id,
  type: '@kerfjs/ui:text',
  props: { children },
});

/**
 * A TabNavigator whose Projects tab holds a two-view NavStack (Projects,
 * then Atlas) and whose Search tab holds text.
 */
const document = {
  schema: 'kerf-ui-document/v1',
  name: 'Play',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: ids.tabs,
    type: '@kerfjs/ui:tab-navigator',
    props: {
      id: 'sections',
      label: 'Sections',
      tabs: [
        { id: 'projects', label: 'Projects' },
        { id: 'search', label: 'Search' },
      ],
      active: 'projects',
    },
    zones: {
      'tabs.0.content': [
        {
          id: ids.stack,
          type: '@kerfjs/ui:nav-stack',
          props: {
            id: 'projects-stack',
            label: 'Projects Navigation',
            views: [
              { key: 'projects', toolbar: { title: 'Projects' } },
              { key: 'atlas', toolbar: { title: 'Atlas' } },
            ],
          },
          zones: {
            'views.0.content': [text(ids.first, 'All projects')],
            'views.1.content': [text(ids.second, 'Atlas details')],
          },
        },
      ],
      'tabs.1.content': [text(ids.search, 'Search everything')],
    },
  },
};

const openDocument = async (page: Page) => {
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: 'play.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(document)),
    });
  await expect(page.getByText(/· 5 nodes · valid$/)).toBeVisible();
};

/**
 * Fit: the frame, scaled down, sits whole inside the stage and keeps its
 * viewport: the default iPhone 17 in a browser tab, 402×778 (KF-R7KXSN).
 */
const expectFits = async (page: Page) => {
  const frame = page.locator('[data-editor-play-frame]');
  await expect(frame).toBeVisible();
  const stageBox = (await page.locator('[data-editor-stage]').boundingBox())!;
  const box = (await frame.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(stageBox.x);
  expect(box.y).toBeGreaterThanOrEqual(stageBox.y);
  expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width);
  expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height);
  // Scaled evenly.
  expect(box.width / box.height).toBeCloseTo(402 / 778, 2);
  expect(
    await page
      .frameLocator('[data-editor-play-frame]')
      .locator('html')
      .evaluate(() => [window.innerWidth, window.innerHeight]),
  ).toEqual([402, 778]);
  return box;
};

const play = (page: Page) =>
  page.locator('[data-action="editor-play"]').click();
const stage = (page: Page) => page.frameLocator('[data-editor-play-frame]');

test('Play shows the stage at the device viewport and Done restores the editor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await page
    .locator(`[data-editor-canvas] [data-kerf-node="${ids.second}"]`)
    .click();
  const highlight = page.locator('.kui-editor__selection');
  await expect(highlight).toBeVisible();
  const ring = await highlight.boundingBox();
  const children = page.locator(
    '[data-editor-prop="children"] textarea, [data-editor-prop="children"] input',
  );
  await expect(children).toHaveValue('Atlas details');
  await play(page);
  await expect(page.locator('.kui-editor__editing')).toBeHidden();
  const frame = page.locator('[data-editor-play-frame]');
  await expect(frame).toBeVisible();
  await expectFits(page);
  await expect(page.locator('[data-action="editor-play-done"]')).toBeFocused();
  await expect(stage(page).getByText('Atlas details')).toBeVisible();
  await page.locator('[data-action="editor-play-done"]').click();
  await expect(frame).toHaveCount(0);
  await expect(page.locator('[data-editor-canvas]')).toBeVisible();
  // The selection the author had is still there.
  await expect(highlight).toBeVisible();
  expect(await highlight.boundingBox()).toEqual(ring);
  await expect(children).toHaveValue('Atlas details');
});

test('Fit scales the frame to a short stage and follows its resizes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await openDocument(page);
  await play(page);
  const short = await expectFits(page);
  expect(short.height).toBeLessThan(876);
  // The stage never scrolls.
  const stageScroll = await page
    .locator('[data-editor-stage]')
    .evaluate((stage) => [
      stage.scrollHeight - stage.clientHeight,
      stage.scrollWidth - stage.clientWidth,
    ]);
  expect(stageScroll).toEqual([0, 0]);
  // A taller window scales it up again, never past its own size.
  await page.setViewportSize({ width: 1440, height: 1200 });
  await expect
    .poll(async () =>
      Math.round(
        (await page.locator('[data-editor-play-frame]').boundingBox())!.height,
      ),
    )
    .toBe(778);
  await expectFits(page);
  await page.setViewportSize({ width: 1440, height: 700 });
  await expect
    .poll(async () =>
      Math.round(
        (await page.locator('[data-editor-play-frame]').boundingBox())!.height,
      ),
    )
    .toBe(Math.round(short.height));
});

test('the stage runs the view for real and never selects', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await expect(page.getByText('Nothing selected')).toBeVisible();
  await play(page);
  const view = stage(page);
  await expect(view.getByText('Atlas details')).toBeVisible();
  // NavStack back pops the play copy's top view.
  await view.locator('[data-nav-back]').click();
  await expect(view.getByText('All projects')).toBeVisible();
  await expect(view.getByText('Atlas details')).toHaveCount(0);
  // A TabNavigator tab switches the scene.
  await view.locator('[data-tab-scaffold-tab="search"]').click();
  await expect(view.getByText('Search everything')).toBeVisible();
  // No editor key works on the stage's view, and the frame keeps its keys.
  await view.getByText('Search everything').click();
  await page.keyboard.press('ControlOrMeta+d');
  // Escape with focus outside the played view leaves play mode.
  await page.locator('[data-action="editor-play-done"]').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-editor-play-frame]')).toHaveCount(0);
  await expect(page.getByText('Nothing selected')).toBeVisible();
  // The document never changed: still five nodes, no undo step.
  await expect(page.getByText(/· 5 nodes · valid$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  // Playing again starts fresh, from the document.
  await play(page);
  await expect(stage(page).getByText('Atlas details')).toBeVisible();
});

// KF-R7KXSN: device presets, orientation, scale, and installed-app safe
// areas (docs/26-ui-editor.md §11.1–§11.3).
const chooseIn = async (page: Page, control: string, option: string) => {
  const select = page.locator(`[data-editor-play="${control}"]`);
  await select.locator('.kui-select__trigger').click();
  await select.getByRole('option', { name: option, exact: true }).click();
};
const frameViewport = (page: Page) =>
  stage(page)
    .locator('html')
    .evaluate(() => [window.innerWidth, window.innerHeight]);
const deviceClassIn = (page: Page) =>
  stage(page).locator('html').getAttribute('data-kerf-play-device');

/** The frame lies inside the stage (Fit). */
const expectWithinStage = async (page: Page) => {
  const stageBox = (await page.locator('[data-editor-stage]').boundingBox())!;
  const box = (await page.locator('[data-editor-play-frame]').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(stageBox.x);
  expect(box.y).toBeGreaterThanOrEqual(stageBox.y);
  expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width);
  expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height);
};

test('the device menu sizes the frame, and deviceClass() inside follows it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  await expect(stage(page).getByText('Atlas details')).toBeVisible();
  await expect.poll(() => deviceClassIn(page)).toBe('mobile portrait');
  await chooseIn(page, 'device', 'iPad Pro 13"');
  await expect.poll(() => frameViewport(page)).toEqual([1032, 1332]);
  await expect.poll(() => deviceClassIn(page)).toBe('desktop portrait');
  // The view keeps running: no reload, so its runtime state survives.
  await stage(page).locator('[data-nav-back]').click();
  await expect(stage(page).getByText('All projects')).toBeVisible();
  await page.locator('[data-action="editor-play-rotate"]').click();
  await expect.poll(() => frameViewport(page)).toEqual([1376, 988]);
  await expect.poll(() => deviceClassIn(page)).toBe('desktop landscape');
  await expect(stage(page).getByText('All projects')).toBeVisible();
  await chooseIn(page, 'device', 'MacBook Pro 16"');
  await expect.poll(() => frameViewport(page)).toEqual([1728, 1117]);
  await expect.poll(() => deviceClassIn(page)).toBe('xl-desktop landscape');
  await expect(
    page.locator('[data-action="editor-play-rotate"]'),
  ).toBeDisabled();
  await expectWithinStage(page);
  // The choice is remembered: playing again after a reload starts there.
  await page.locator('[data-action="editor-play-done"]').click();
  await page.reload();
  await openDocument(page);
  await play(page);
  await expect.poll(() => frameViewport(page)).toEqual([1728, 1117]);
});

test('Installed app moves the content below the safe area', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  const title = stage(page).getByText('Atlas details');
  await expect(title).toBeVisible();
  const top = () =>
    title.evaluate((element) => element.getBoundingClientRect().top);
  expect(await frameViewport(page)).toEqual([402, 778]);
  const tab = await top();
  await page.locator('[data-action="editor-play-installed"]').click();
  await expect.poll(() => frameViewport(page)).toEqual([402, 874]);
  // The iPhone 17's 62px status-bar safe area, now under the view's chrome.
  await expect.poll(top).toBe(tab + 62);
  await expect(
    page.locator('[data-action="editor-play-installed"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="editor-play-installed"]').click();
  await expect.poll(top).toBe(tab);
});

test('a fixed scale overflows and scrolls the stage; Fit returns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await openDocument(page);
  await play(page);
  await chooseIn(page, 'scale', '150%');
  const frame = page.locator('[data-editor-play-frame]');
  await expect
    .poll(async () => Math.round((await frame.boundingBox())!.height))
    .toBe(Math.round(778 * 1.5));
  const overflow = () =>
    page
      .locator('[data-editor-stage]')
      .evaluate((element) => element.scrollHeight - element.clientHeight);
  expect(await overflow()).toBeGreaterThan(0);
  // The viewport inside never changes with the scale.
  expect(await frameViewport(page)).toEqual([402, 778]);
  await chooseIn(page, 'scale', 'Fit');
  await expect.poll(overflow).toBe(0);
  await expectWithinStage(page);
});

test('Flexible resizes from its fields and its drag handles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  await chooseIn(page, 'device', 'Flexible');
  await expect.poll(() => frameViewport(page)).toEqual([800, 600]);
  await expect(
    page.locator('[data-action="editor-play-rotate"]'),
  ).toBeDisabled();
  const width = page.locator('[data-editor-play-size="width"] input');
  await width.fill('640');
  await width.press('Enter');
  await width.blur();
  await expect.poll(() => frameViewport(page)).toEqual([640, 600]);
  // Drag the bottom handle 50px down; the viewport grows by that much at
  // the stage's scale.
  const handle = page.locator('.kui-editor__resize[data-edge="block-end"]');
  const scale = Number(
    await page.locator('.kui-editor__device-box').getAttribute('data-scale'),
  );
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 50, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(async () => (await frameViewport(page))[1])
    .toBe(Math.round(600 + 50 / scale));
  await expect(
    page.locator('[data-editor-play-size="height"] input'),
  ).toHaveValue(String(Math.round(600 + 50 / scale)));
});

// KF-E8T0AY: the mock device frame never changes the view's layout.
test('the Chrome toggle hides the device frame without moving the view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocument(page);
  await play(page);
  await expect(stage(page).getByText('Atlas details')).toBeVisible();
  const frame = page.locator('[data-editor-play-frame]');
  const bezel = page.locator('.kui-editor__device-bezel');
  const chrome = page.locator('[data-action="editor-play-chrome"]');
  for (const [device, scale] of [
    ['iPhone 17', 'Fit'],
    ['iPhone SE', '100%'],
    ['MacBook Air 13"', 'Fit'],
  ] as const) {
    await chooseIn(page, 'device', device);
    await chooseIn(page, 'scale', scale);
    await expect(bezel).toBeVisible();
    const shown = await frame.boundingBox();
    const viewport = await frameViewport(page);
    await chrome.click();
    await expect(chrome).toHaveAttribute('aria-pressed', 'false');
    await expect(bezel).toBeHidden();
    expect(await frame.boundingBox()).toEqual(shown);
    expect(await frameViewport(page)).toEqual(viewport);
    await chrome.click();
    await expect(bezel).toBeVisible();
    expect(await frame.boundingBox()).toEqual(shown);
  }
  // The frame's parts never take a click from the view.
  await chooseIn(page, 'device', 'iPhone 17');
  await page.locator('[data-action="editor-play-installed"]').click();
  await stage(page).locator('[data-nav-back]').click();
  await expect(stage(page).getByText('All projects')).toBeVisible();
});
