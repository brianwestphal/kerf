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
 * 402×874 viewport (its border sits outside it).
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
  // Scaled evenly from the 404×876 bordered frame.
  expect(box.width / box.height).toBeCloseTo(404 / 876, 2);
  expect(
    await page
      .frameLocator('[data-editor-play-frame]')
      .locator('html')
      .evaluate(() => [window.innerWidth, window.innerHeight]),
  ).toEqual([402, 874]);
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
    .toBe(876);
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
