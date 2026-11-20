import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const bundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/composed-catalog.tsx')],
  bundle: true,
  platform: 'browser',
  outdir: 'out',
  write: false,
  tsconfigRaw: {
    compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'kerfjs' },
  },
});

test('a linked donor opens in its group, filters across packages, and navigates both relationship directions', async ({
  page,
}, info) => {
  const assets = (await bundle).outputFiles;
  await page.route('http://composed.test/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/')
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/app.css"></head><body><main class="kui-app-root"></main><script src="/app.js"></script></body></html>',
      });
    const css = path.endsWith('css');
    await route.fulfill({
      contentType: css ? 'text/css' : 'text/javascript',
      body: assets.find((file) => file.path.endsWith(css ? '.css' : '.js'))!
        .text,
    });
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  const wa = '@awesome.me/webawesome:wa-button';
  const query = new URLSearchParams({ component: wa, client: 'test' });
  await page.goto('http://composed.test/?' + query);
  const host = page.locator('main.kui-app-root');
  const row = (id: string) =>
    page.locator(`[data-catalog-sidebar] [data-item-id="${id}"]`);
  const group = (id: string) => page.locator(`[data-catalog-group-id="${id}"]`);
  await expect(
    group('@awesome.me/webawesome').getByRole('button', {
      name: 'Web Awesome',
    }),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(row(wa)).toBeVisible();
  await expect(host).not.toHaveAttribute('data-preview-loads');
  const captureMenu = async (filename: string) => {
    const menu = page.locator(
      '[data-catalog-related] [role="menu"]:popover-open',
    );
    await expect(menu).toHaveAttribute('data-placement', /^(top|bottom)-/);
    await expect(menu).toHaveCSS('opacity', '1');
    await page.screenshot({
      path: info.outputPath(filename),
      animations: 'disabled',
    });
  };
  const related = async (id: string) => {
    await page.getByRole('button', { name: 'Components' }).click();
    await page.locator(`[data-catalog-related] [data-item-id="${id}"]`).click();
  };
  await page.getByRole('button', { name: 'Components' }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Icon', exact: true }),
  ).toBeVisible();
  await captureMenu('donor-relationships.png');
  await page.getByRole('menuitem', { name: 'Icon', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('component')).toBe(
    '@awesome.me/webawesome:wa-icon',
  );
  await related(wa);
  await expect(
    group('@awesome.me/webawesome').getByRole('switch'),
  ).not.toBeChecked();
  await group('@awesome.me/webawesome').getByRole('switch').click();
  await expect(
    group('@awesome.me/webawesome').getByRole('switch'),
  ).toBeChecked();
  const filter = page.locator('[data-catalog-filter]');
  await filter.fill('PopupMenu');
  await expect(row('@kerfjs/ui:popup-menu')).toBeVisible();
  await expect(group('@awesome.me/webawesome')).toBeHidden();
  await row('@kerfjs/ui:popup-menu').click();
  await page.locator('[data-action="catalog-clear-filter"]').click();
  await related('review-app:button');
  await expect(
    page.getByRole('button', { name: 'Share Review' }),
  ).toBeVisible();
  await expect(host).toHaveAttribute('data-preview-loads', '1');
  await related('@kerfjs/ui:popup-menu');
  await related('review-app:button');
  await expect(host).toHaveAttribute('data-preview-loads', '1');
  expect(new URL(page.url()).searchParams.get('client')).toBe('test');
  const libraryToggle = group('@kerfjs/ui').getByRole('button', {
    name: 'Kerf UI',
  });
  await libraryToggle.click();
  await expect(libraryToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(
    group('@awesome.me/webawesome').getByRole('button', {
      name: 'Web Awesome',
    }),
  ).toHaveAttribute('aria-expanded', 'true');
  await group('review-app')
    .getByRole('button', { name: 'Review App' })
    .scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Components' }).click();
  await expect(
    page.getByRole('menuitem', { name: 'PopupMenu', exact: true }),
  ).toBeVisible();
  await captureMenu('recursive-catalog.png');
});
