// KF-MGAP67 / KF-7HP7R9: real unfiltered folder progression and clipping.
import { expect, test } from '@playwright/test';

import { openLibrary } from './areas.js';

const files = [
  'Assets/Icons.kui.json',
  'Designs/Forms/Contact.kui.json',
  'Designs/Tables/Orders.kui.json',
  'Designs/Tables/People.kui.json',
  'README.kui.json',
];

test('Library parent headings travel with unfiltered nested columns', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 2048, height: 1128 });
  await page.route('**/__kerf-ui-editor/api/files', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(files),
    }),
  );
  await page.goto('/');
  await openLibrary(page);
  const library = page.locator('#editor-library');
  await library.locator('[data-pinnable-popover-pin]').click();
  await library
    .locator(
      '[data-segmented-control-id="editor-library-mode"] [data-segment-value="documents"]',
    )
    .click();
  await library
    .locator(
      '[data-segmented-control-id="editor-document-view"] [data-segment-value="columns"]',
    )
    .click();
  const track = library.locator('.kui-column-track');
  const headings = library.locator('.kui-column-explorer .kui-list-header');
  await expect(headings).toHaveText(['Project']);
  const capture = async (state: string, width: number) => {
    await expect
      .poll(() =>
        library.evaluate((surface) => {
          const frame = surface.getBoundingClientRect();
          const track = surface.querySelector('.kui-column-track')!;
          const viewport = track.getBoundingClientRect();
          return (
            Math.abs(viewport.x - frame.x - 1) +
            Math.abs(viewport.width - frame.width + 2)
          );
        }),
      )
      .toBeLessThan(1);
    expect(
      await track.evaluate(
        (element) => getComputedStyle(element).paddingInlineStart,
      ),
    ).toBe('0px');
    await page.screenshot({
      path: info.outputPath(`KF-MGAP67-KF-7HP7R9-${state}-${width}.png`),
      animations: 'disabled',
    });
  };
  await capture('Project', 2048);
  for (const [folder, names] of [
    ['Designs', ['Project', 'Designs']],
    ['Designs/Tables', ['Project', 'Designs', 'Tables']],
  ] as const) {
    const previous = await headings.last().boundingBox();
    await library
      .locator(
        `[role="button"][data-item-id="folder:${folder}/"],button[data-item-id="folder:${folder}/"]`,
      )
      .click();
    await expect(headings).toHaveText([...names]);
    await expect
      .poll(() =>
        headings.last().evaluate((heading) => {
          const column = heading.closest('.kui-list')!.getBoundingClientRect();
          const viewport = heading
            .closest('.kui-column-track')!
            .getBoundingClientRect();
          return Math.abs(column.left - viewport.left);
        }),
      )
      .toBeLessThan(2);
    const moved = await headings.nth(names.length - 2).boundingBox();
    expect(moved!.x).toBeLessThan(previous!.x - 100);
    await capture(names.at(-1)!, 2048);
  }
  for (const width of [960, 390, 2048]) {
    await page.setViewportSize({ width, height: 1128 });
    await expect(library).toBeVisible();
    await capture('Tables', width);
  }
});
