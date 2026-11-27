import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

import { animationsSettled } from '../helpers/animations-settled.js';

const fixture = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/workbench-compact-navigation.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

test('compact Workbench keeps the root mounted and pushes rail content over it', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.setContent(
    '<!doctype html><html><body style="margin:0"><div class="kui-app-root" data-fixture-root></div></body></html>',
  );
  const bundle = await fixture;
  await page.addStyleTag({
    content: bundle.outputFiles
      .find(({ path }) => path.endsWith('.css'))!
      .text.replace(
        /remify\(([\d.]+)px\)/g,
        (_, pixels: string) => `${Number(pixels) / 16}rem`,
      ),
  });
  await page.addScriptTag({
    content: bundle.outputFiles.find(({ path }) => path.endsWith('.js'))!.text,
  });

  const workbench = page.locator('#studio');
  const main = workbench.locator('[data-workbench-main]');
  const stack = workbench.locator('#studio-compact-navigation');
  const drawer = workbench.getByRole('region', { name: 'Terminal' });
  const left = workbench.locator('#studio-left-rail');
  const right = workbench.locator('#studio-right-rail');
  const draft = main.getByRole('textbox', { name: 'Draft Search' });
  await expect(right).toHaveAttribute('data-collapsed', 'false');
  await draft.fill('remember this');
  const originalDraft = await draft.elementHandle();
  await expect(left).toHaveAttribute('data-presentation', 'inline');
  await expect(drawer).toBeVisible();
  await workbench.screenshot({
    path: testInfo.outputPath('workbench-wide.png'),
  });

  // Force a narrow container independently of the still-wide viewport.
  const width = await page.addStyleTag({
    content: '[data-fixture-root] { width: 390px; }',
  });
  await expect(workbench).toHaveAttribute(
    'data-compact-navigation-active',
    'true',
  );
  await expect(right).toHaveCount(0);
  await expect(left).toHaveCSS('position', 'absolute');
  await expect(draft).toHaveValue('remember this');
  await expect(draft).toBeFocused();
  expect(
    await draft.evaluate(
      (input, original) => input === original,
      originalDraft,
    ),
  ).toBe(true);

  const show = main.getByRole('button', { name: 'Show Projects' });
  await expect(show).toHaveAttribute('aria-controls', 'studio-left-rail');
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await show.focus();
  await page.keyboard.press('Enter');
  await expect(left.getByRole('button', { name: 'Workspace' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(show).toBeFocused();
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await animationsSettled(page);
  await workbench.screenshot({
    path: testInfo.outputPath('workbench-compact-root.png'),
  });

  const open = main.getByRole('button', { name: 'Open Ticket T-42' });
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(stack).toHaveAttribute('data-depth', '2');
  await expect(main.getByRole('textbox', { name: 'Summary' })).toBeFocused();
  await expect(main.getByText('Ticket details')).toBeVisible();
  const workArea = (await main.boundingBox())!;
  expect((await drawer.boundingBox())!.y).toBeCloseTo(
    workArea.y + workArea.height,
    0,
  );
  await workbench.screenshot({
    path: testInfo.outputPath('workbench-compact-detail.png'),
  });

  const linked = main.getByRole('button', { name: 'Open Linked Ticket T-43' });
  await linked.focus();
  await page.keyboard.press('Enter');
  await expect(stack).toHaveAttribute('data-depth', '3');
  const back = main.getByRole('button', { name: 'Back' });
  await back.click();
  await expect(linked).toBeFocused();
  await back.click();
  await expect(open).toBeFocused();
  await expect(draft).toHaveValue('remember this');
  expect(
    await draft.evaluate(
      (input, original) => input === original,
      originalDraft,
    ),
  ).toBe(true);

  await open.focus();
  await page.keyboard.press('Enter');
  await expect(stack).toHaveAttribute('data-depth', '2');
  await width.evaluate((style) => style.parentNode?.removeChild(style));
  await expect(stack).toHaveAttribute('data-depth', '1');
  await expect(open).toBeFocused();
  await expect(right).toHaveAttribute('data-collapsed', 'false');
  await expect(left).toHaveAttribute('data-collapsed', 'false');
  await right.getByRole('textbox', { name: 'Summary' }).focus();
  await page.addStyleTag({ content: '[data-fixture-root] { width: 500px; }' });
  // The app retains its detail route, so it reopens at the inclusive threshold.
  await expect(stack).toHaveAttribute('data-depth', '2');
  await expect(main.getByRole('textbox', { name: 'Summary' })).toBeFocused();
});
