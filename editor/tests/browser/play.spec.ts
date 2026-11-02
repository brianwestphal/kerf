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
  const box = (await frame.boundingBox())!;
  // The frame's border sits outside its 402×874 viewport.
  expect(Math.round(box.width)).toBe(404);
  expect(Math.round(box.height)).toBe(876);
  expect(
    await stage(page)
      .locator('html')
      .evaluate(() => [window.innerWidth, window.innerHeight]),
  ).toEqual([402, 874]);
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
