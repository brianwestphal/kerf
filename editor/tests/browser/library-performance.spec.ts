// KF-1XBJDT: large project disclosure should touch the changed branch only.
import { expect, test } from '@playwright/test';

import { openLibrary } from './areas.js';

const FILES = Array.from({ length: 200 }, (_, group) =>
  Array.from(
    { length: 25 },
    (_, item) =>
      `designs/group-${String(group).padStart(3, '0')}/item-${String(item).padStart(2, '0')}.kui.json`,
  ),
).flat();

test('Library expand/collapse remains responsive with 5000 project files', async ({
  page,
}, info) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('**/__kerf-ui-editor/api/files', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(FILES),
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
  await expect(library.locator('[data-editor-palette-document]')).toHaveCount(
    5000,
  );
  const group = library.locator(
    '[data-item-id="folder:designs/group-000/"][role="treeitem"]',
  );
  await group.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const measured = window as unknown as { libraryDisclosureMs: number[] };
    measured.libraryDisclosureMs = [];
    document.addEventListener(
      'click',
      (event) => {
        const row = (event.target as Element).closest('[role="treeitem"]');
        if (row?.getAttribute('data-item-id') !== 'folder:designs/group-000/')
          return;
        const start = performance.now();
        setTimeout(
          () => measured.libraryDisclosureMs.push(performance.now() - start),
          0,
        );
      },
      true,
    );
  });
  for (const expanded of [false, true, false, true]) {
    await group.locator('.kui-list-item__disclosure').click();
    await expect(group).toHaveAttribute('aria-expanded', String(expanded));
    await expect(library.locator('[data-editor-palette-document]')).toHaveCount(
      expanded ? 5000 : 4975,
    );
  }
  const measurements = await page.evaluate(
    () =>
      (window as unknown as { libraryDisclosureMs: number[] })
        .libraryDisclosureMs,
  );
  console.log(
    `KF-1XBJDT disclosure ms: ${measurements.map((value) => value.toFixed(1)).join(', ')}`,
  );
  expect(measurements).toHaveLength(4);
  expect(Math.max(...measurements)).toBeLessThan(1000);
  await library.screenshot({
    path: info.outputPath('KF-1XBJDT-large-project-disclosure-1440.png'),
    animations: 'disabled',
  });
  for (const width of [867, 390, 960]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(library).toBeVisible();
    await library.screenshot({
      path: info.outputPath(`KF-1XBJDT-large-project-tree-${width}.png`),
      animations: 'disabled',
    });
  }
});
