// KF-CBA2H7: decorative file/folder icons in the real Library layouts.
import { expect, test } from '@playwright/test';

import { openLibrary } from './areas.js';

test('Library shows extension-based Lucide icons in tree and columns', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 2048, height: 1128 });
  await page.route('**/__kerf-ui-editor/api/files', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        'Designs/Orders.kui.json',
        'Designs/People.kui.json',
        'app.kui.json',
      ]),
    }),
  );
  await page.goto('/');
  await openLibrary(page);
  const library = page.locator('#editor-library');
  await library
    .locator(
      '[data-segmented-control-id="editor-library-mode"] [data-segment-value="documents"]',
    )
    .click();
  const folder = library.locator(
    '[role="treeitem"][data-item-id="folder:Designs/"]',
  );
  const file = library.locator(
    '[role="treeitem"][data-item-id="Designs/Orders.kui.json"]',
  );
  await expect(folder.locator('[data-lucide="folder"]')).toHaveCount(1);
  await expect(file.locator('[data-lucide="file-braces-corner"]')).toHaveCount(
    1,
  );
  await expect(file).toHaveAccessibleName('Orders.kui.json');
  for (const width of [2048, 867, 390, 960]) {
    await page.setViewportSize({ width, height: 1128 });
    await library.screenshot({
      path: info.outputPath(`KF-CBA2H7-tree-${width}.png`),
      animations: 'disabled',
    });
  }
  await library
    .locator(
      '[data-segmented-control-id="editor-document-view"] [data-segment-value="columns"]',
    )
    .click();
  const columnFolder = library.locator('[data-item-id="folder:Designs/"]');
  await expect(columnFolder.locator('[data-lucide="folder"]')).toHaveCount(1);
  await columnFolder.click();
  await expect(
    library.locator(
      '[data-item-id="Designs/Orders.kui.json"] [data-lucide="file-braces-corner"]',
    ),
  ).toHaveCount(1);
  await library.screenshot({
    path: info.outputPath('KF-CBA2H7-columns-960.png'),
    animations: 'disabled',
  });
});
