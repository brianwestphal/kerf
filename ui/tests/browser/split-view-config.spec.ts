import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// SplitView forwards its list ResizableRegion's configuration and its compact
// NavStack's toolbars; this renders both through the real package CSS.
const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/split-view-config.tsx')],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

type Scenario = 'roomy' | 'compact';

async function mountFixture(page: Page, scenario: Scenario): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('SplitView fixture emitted no JS');
  await page.setContent(
    '<!doctype html><html><body><div class="kui-app-root" style="display:grid" data-split-config-root></div></body></html>',
  );
  // The fixture resolves package CSS from source, so apply the pixel-first
  // remify() authoring transform the package build performs.
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await call(page, 'show', scenario);
}

async function call(
  page: Page,
  method: 'show' | 'collapse' | 'detail',
  value: string | boolean,
): Promise<void> {
  await page.evaluate(
    ([name, argument]) => {
      const api = (
        window as unknown as {
          splitConfig: Record<string, (value: unknown) => void>;
        }
      ).splitConfig;
      api[name as string](argument);
    },
    [method, value] as const,
  );
}

test('forwards the list region configuration, including collapse and its restore corner', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 700 });
  await mountFixture(page, 'roomy');
  const region = page.locator('[data-component="resizable-region"]');
  await expect(region).toHaveAttribute('data-separator', 'hidden');
  await expect(region).toHaveAttribute('data-collapse-motion', 'fade-slide');
  expect((await region.boundingBox())?.width).toBe(280);
  await expect(page.locator('.kui-resizable-region__restore')).toHaveCount(0);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/split-view-config-roomy-wide.png',
    });

  await call(page, 'collapse', true);
  await expect(region).toHaveAttribute('data-collapsed', 'true');
  await expect(region).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(async () => (await region.boundingBox())?.width).toBe(0);
  const detail = page.locator('[data-split-detail]');
  expect((await detail.boundingBox())?.width).toBe(1100);
  const restore = page.getByRole('button', { name: 'Show threads' });
  await expect(restore).toBeVisible();
  const restoreBox = (await restore.boundingBox())!;
  expect(restoreBox.x).toBeLessThan(100);
  expect(restoreBox.y + restoreBox.height).toBeGreaterThan(600);
  // The collapsed content slides out; capture the settled state.
  await page.waitForFunction(() => document.getAnimations().length === 0);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/split-view-config-collapsed-wide.png',
    });
});

test('forwards the compact NavStack toolbar configuration and per-view toolbars', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await mountFixture(page, 'compact');
  const stack = page.getByRole('region', { name: 'Compact messages' });
  const toolbar = stack.locator(
    ':scope > [data-nav-stack-chrome] > [data-component="toolbar"]',
  );
  await expect(toolbar).toHaveAttribute('divider-sides', 'b');
  await expect(
    stack.getByRole('heading', { level: 1, name: 'Project update' }),
  ).toBeVisible();
  await expect(stack.getByRole('button', { name: 'Inbox' })).toBeVisible();
  await expect(stack.getByRole('button', { name: 'Reply' })).toBeVisible();
  await expect(stack.getByRole('button', { name: 'Archive' })).toBeVisible();
  await expect(stack.getByRole('button', { name: 'Compose' })).toHaveCount(0);
  const bar = (await toolbar.boundingBox())!;
  expect(bar.height).toBe(44);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/split-view-config-compact-detail-phone.png',
    });

  await call(page, 'detail', false);
  await expect(stack).toHaveAttribute('data-depth', '1');
  await expect(stack.getByRole('button', { name: 'Compose' })).toBeVisible();
  await expect(stack.getByRole('button', { name: 'Reply' })).toHaveCount(0);
  if (browserName === 'chromium')
    await page.screenshot({
      path: 'test-results/split-view-config-compact-list-phone.png',
    });
});
