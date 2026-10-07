import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/toolbar-search-overflow.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

test('expanded grouped search anchors clickable app surfaces and restores collapse clipping', async ({
  page,
  browserName,
}, testInfo) => {
  const bundle = await fixtureBundle;
  await page.setContent(
    '<!doctype html><html><body><div class="kui-app-root" data-fixture-root></div></body></html>',
  );
  await page.addStyleTag({
    content: bundle.outputFiles
      .find((file) => file.path.endsWith('.css'))!
      .text.replace(
        /remify\(([\d.]+)px\)/g,
        (_, pixels: string) => `${Number(pixels) / 16}rem`,
      ),
  });
  await page.addScriptTag({
    content: bundle.outputFiles.find((file) => file.path.endsWith('.js'))!.text,
  });
  const group = page.locator('[data-component="toolbar-control-group"]');
  const field = group.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search views' });
  await expect(group).toHaveAttribute('data-expanded-overflow', 'visible');
  await expect(group).toHaveCSS('overflow', 'hidden');
  await field.getByRole('button', { name: 'Open search' }).click();
  await expect(editor).toBeFocused();
  await expect(group).toHaveCSS('position', 'relative');
  await expect(group).toHaveCSS('overflow', 'visible');
  const surface = group.locator('[data-test-search-surface]');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await group.scrollIntoViewIfNeeded();
    const button = surface.getByRole('button', { name: 'Choose October 5' });
    await expect
      .poll(async () =>
        group.evaluate((root) => {
          const panel = root.querySelector<HTMLElement>(
            '[data-test-search-surface]',
          )!;
          const rect = panel.getBoundingClientRect();
          return {
            anchor: panel.offsetParent === root,
            below: rect.top >= root.getBoundingClientRect().bottom,
            hit: panel.contains(
              document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.bottom - 16,
              ),
            ),
          };
        }),
      )
      .toEqual({ anchor: true, below: true, hit: true });
    await button.click();
    await expect(surface).toHaveAttribute('data-clicked', 'true');
    await expect(group).toHaveAttribute('data-expanded', 'true');
    await button.focus();
    await button.press('Enter');
    await expect(group).toHaveAttribute('data-expanded', 'true');
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme as 'light' | 'dark' });
      if (browserName === 'chromium') {
        const box = await group.boundingBox();
        const popup = await surface.boundingBox();
        await page.screenshot({
          path: testInfo.outputPath(`search-app-surface-${theme}-${width}.png`),
          animations: 'disabled',
          clip: {
            x: box!.x,
            y: box!.y,
            width: box!.width,
            height: popup!.y + popup!.height - box!.y + 4,
          },
        });
      }
    }
  }
  await surface.evaluate((root) => root.remove());
  await editor.focus();
  await editor.press('Escape');
  await expect(group).toHaveAttribute('data-expanded', 'false');
  await expect(group).toHaveCSS('overflow', 'hidden');
  await field.getByRole('button', { name: 'Open search' }).click();
  await expect(group).toHaveCSS('overflow', 'visible');
  await group.evaluate((root) =>
    root.removeAttribute('data-expanded-overflow'),
  );
  await expect(group).toHaveCSS('overflow', 'hidden');
  await group.evaluate((root) => {
    root.dataset.expandedOverflow = 'visible';
    root.dataset.content = 'icon';
    root.dataset.overflow = 'scroll';
  });
  await expect(group).toHaveCSS('overflow-x', 'auto');
});
