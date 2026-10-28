import { expect, test } from '@playwright/test';

// KF-JY68DQ: ColumnExplorer in the catalog demo, driven by real pointer and
// keys: opening columns, the preview, keyboard moves, and the paged layout.
test('ColumnExplorer opens columns, previews a file, and moves by keyboard', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=column-explorer');
  const files = page.locator('#files[data-component="column-explorer"]');
  const column = (name: string) =>
    files.getByRole('group', { name, exact: true });
  const row = (name: string) =>
    files.getByRole('button', { name, exact: true });

  // The initial path shows three columns and the preview.
  await expect(column('components')).toBeVisible();
  await expect(row('button.tsx')).toHaveAttribute('aria-current', 'page');
  await expect(
    files.getByRole('group', { name: 'button.tsx preview' }),
  ).toContainText('4 KB');

  // Choosing another top-level row closes the deeper columns.
  await row('README.md').click();
  await expect(column('components')).toHaveCount(0);
  await expect(
    files.getByRole('group', { name: 'README.md preview' }),
  ).toContainText('2 KB');

  // Keyboard: Up to src, Right opens and enters it, Right again enters
  // components, Left returns.
  await row('README.md').focus();
  await page.keyboard.press('Home');
  await expect(row('src')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(row('components')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(row('button.tsx')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(row('list-item.tsx')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    files.getByRole('group', { name: 'list-item.tsx preview' }),
  ).toContainText('9 KB');
  await page.keyboard.press('ArrowLeft');
  await expect(row('components')).toBeFocused();
  await page.mouse.move(1, 1);
  await files.screenshot({
    path: info.outputPath('kf-jy68dq-column-explorer-files.png'),
    animations: 'disabled',
  });
});

test('a paged ColumnExplorer brings the opened column into view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=column-explorer');
  const phone = page.getByRole('region', { name: 'Files on a phone' });
  const track = phone.locator('.kui-column-track');
  await phone.getByRole('button', { name: 'components', exact: true }).click();
  const components = phone.getByRole('group', {
    name: 'components',
    exact: true,
  });
  await expect(components).toBeVisible();
  // The newly opened column is scrolled into the track's view.
  await expect
    .poll(async () => {
      const [trackBox, columnBox] = await Promise.all([
        track.boundingBox(),
        components.boundingBox(),
      ]);
      return (
        columnBox!.x >= trackBox!.x - 1 &&
        columnBox!.x + columnBox!.width <= trackBox!.x + trackBox!.width + 1
      );
    })
    .toBe(true);
});

for (const scheme of ['light', 'dark'] as const) {
  for (const width of [1280, 390]) {
    test(`captures the ColumnExplorer demo, ${scheme} at ${width}px`, async ({
      page,
      browserName,
    }, info) => {
      test.skip(browserName !== 'chromium', 'captures come from one engine');
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/?component=column-explorer');
      const demo = page.locator('[data-demo="column-explorer"]');
      await expect(demo.getByRole('region').first()).toBeVisible();
      await page.waitForTimeout(250);
      await demo.screenshot({
        path: info.outputPath(
          `kf-jy68dq-column-explorer-${scheme}-${width}.png`,
        ),
        animations: 'disabled',
      });
    });
  }
}
