import { resolve } from 'node:path';

import { expect, type Locator, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-EC756H: a collapsed CollapsiblePanel's or ResizableRegion's
// restoreControl floats in a corner of the component's own container, not of
// the viewport. It used to be position: fixed, so a component embedded in a
// page floated its restore control over unrelated page content.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/restore-anchor.tsx')],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(
  page: Page,
  scenario: 'embedded' | 'viewport',
): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Restore fixture emitted no JS/CSS');
  await page.setContent(
    '<!doctype html><html><body style="margin:0"><div data-restore-fixture></div></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await page.evaluate((value) => {
    (
      globalThis as unknown as {
        restoreFixture: { show(value: string): void };
      }
    ).restoreFixture.show(value);
  }, scenario);
}

/** The control's distance (px) from each edge of `host`'s padding box. */
const insets = async (host: Locator, control: Locator) => {
  const outer = (await host.boundingBox())!;
  const inner = (await control.boundingBox())!;
  return {
    start: Math.round(inner.x - outer.x),
    end: Math.round(outer.x + outer.width - (inner.x + inner.width)),
    bottom: Math.round(outer.y + outer.height - (inner.y + inner.height)),
  };
};

const panelRestore = (page: Page) =>
  page.locator('[data-panel-restore="restore-nav"]');
const regionRestore = (page: Page) =>
  page.locator('[data-region-restore="restore-console"]');

test('an embedded collapsed panel floats its restore control in its own container', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountFixture(page, 'embedded');
  const host = page.locator('[data-restore-host="panel"]');
  const restore = panelRestore(page);
  const button = restore.getByRole('button', { name: 'Show navigator' });
  await expect(button).toBeVisible();
  await expect(restore).toHaveCSS('position', 'absolute');

  // Bottom-start corner of the host, inset once by the restore inset.
  expect(await insets(host, button)).toMatchObject({ start: 16, bottom: 16 });

  // It scrolls with its container rather than staying on the viewport.
  const before = (await button.boundingBox())!.y;
  await page.mouse.wheel(0, 200);
  await expect
    .poll(async () => (await button.boundingBox())!.y)
    .toBeLessThan(before);
  expect(await insets(host, button)).toMatchObject({ start: 16, bottom: 16 });
});

test('an embedded collapsed region floats a FloatingToolbar restore in its own container, inset once', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountFixture(page, 'embedded');
  const host = page.locator('[data-restore-host="region"]');
  const restore = regionRestore(page);
  const group = restore.locator('[data-component="toolbar-control-group"]');
  await expect(group).toBeVisible();
  await expect(restore).toHaveCSS('position', 'absolute');
  await expect(
    restore.locator('[data-component="floating-toolbar"]'),
  ).toHaveAttribute('role', 'toolbar');

  // Bottom-end corner of the host; the corner owns the inset, so the
  // FloatingToolbar's own inset is not added on top.
  expect(await insets(host, group)).toMatchObject({ end: 16, bottom: 16 });

  // The control stays inside its container and never covers page content
  // outside it.
  const hostBox = (await host.boundingBox())!;
  const groupBox = (await group.boundingBox())!;
  expect(groupBox.y).toBeGreaterThanOrEqual(hostBox.y);
  expect(groupBox.y + groupBox.height).toBeLessThanOrEqual(
    hostBox.y + hostBox.height,
  );
});

test('narrow embedded restore controls stay inside their containers', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountFixture(page, 'embedded');
  const panelHost = page.locator('[data-restore-host="panel"]');
  const regionHost = page.locator('[data-restore-host="region"]');
  expect(
    await insets(
      panelHost,
      panelRestore(page).getByRole('button', { name: 'Show navigator' }),
    ),
  ).toMatchObject({ start: 16, bottom: 16 });
  expect(
    await insets(
      regionHost,
      regionRestore(page).locator('[data-component="toolbar-control-group"]'),
    ),
  ).toMatchObject({ end: 16, bottom: 16 });
});

test('a full-viewport shell still floats restore controls in the screen corners', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountFixture(page, 'viewport');
  const button = panelRestore(page).getByRole('button', {
    name: 'Show navigator',
  });
  const group = regionRestore(page).locator(
    '[data-component="toolbar-control-group"]',
  );
  const buttonBox = (await button.boundingBox())!;
  const groupBox = (await group.boundingBox())!;
  expect(Math.round(buttonBox.x)).toBe(16);
  expect(Math.round(800 - (buttonBox.y + buttonBox.height))).toBe(16);
  expect(Math.round(1280 - (groupBox.x + groupBox.width))).toBe(16);
  expect(Math.round(800 - (groupBox.y + groupBox.height))).toBe(16);
});
