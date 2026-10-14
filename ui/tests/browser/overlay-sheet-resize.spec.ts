import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// wireOverlaySheets: a core kerfjs/overlay bottom sheet with the
// kui-overlay-sheet-resizable class gets a resizable DialogSurface sheet's
// grabber, on the plain and the native host: drag and keyboard resize the
// visible height between the minimum and the cap, the grabber sticks to the
// top edge while the content scrolls and stays first across re-renders.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/overlay-sheet-resize.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
  jsx: 'automatic',
  jsxImportSource: 'kerfjs',
});

const css = ['foundation', 'overlay-sheet']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

async function mount(page: Page) {
  const result = await fixtureBundle;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent('<body style="margin:0"><main>Page</main></body>');
  await page.addStyleTag({
    content: `${css}\n:root{--kui-safe-area-block-end:34px}`,
  });
  await page.addScriptTag({
    content: result.outputFiles.find((file) => file.path.endsWith('.js'))!.text,
  });
}

const panel = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector<HTMLElement>('.kerf-overlay')!;
    const sheet =
      host.tagName === 'DIALOG'
        ? host
        : (host.firstElementChild as HTMLElement);
    const handle = sheet.querySelector<HTMLElement>(
      '.kui-overlay-sheet-handle',
    );
    const rect = sheet.getBoundingClientRect();
    return {
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      handleFirst: sheet.firstElementChild === handle,
      handleTop: handle ? Math.round(handle.getBoundingClientRect().top) : null,
      now: handle?.getAttribute('aria-valuenow') ?? null,
      min: handle?.getAttribute('aria-valuemin') ?? null,
      max: handle?.getAttribute('aria-valuemax') ?? null,
      padEnd: parseFloat(window.getComputedStyle(sheet).paddingBlockEnd),
    };
  });

for (const native of [false, true]) {
  test(`resizes a ${native ? 'native' : 'plain'} core bottom sheet by drag and keyboard`, async ({
    page,
  }) => {
    await mount(page);
    await page.evaluate((n) => {
      (
        globalThis as unknown as { openResizableSheet(n: boolean): void }
      ).openResizableSheet(n);
    }, native);
    const handle = page.locator('.kui-overlay-sheet-handle');
    await expect(handle).toHaveAttribute('role', 'separator');
    const opened = await panel(page);
    expect(opened.handleFirst).toBe(true);
    expect(opened.bottom).toBe(844);

    // Keyboard: Home is the minimum (160px visible), End the cap.
    await handle.focus();
    await expect(handle).toHaveAttribute('aria-valuemin', '160');
    await page.keyboard.press('Home');
    let state = await panel(page);
    expect(state.now).toBe('160');
    expect(state.height).toBe(160 + state.padEnd);
    await page.keyboard.press('ArrowUp');
    state = await panel(page);
    expect(state.now).toBe('176');
    await page.keyboard.press('End');
    state = await panel(page);
    expect(state.now).toBe(state.max);
    expect(state.top).toBe(844 - state.height);

    // Drag down by 200px.
    const before = await panel(page);
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 200, {
      steps: 5,
    });
    await page.mouse.up();
    state = await panel(page);
    expect(Math.abs(state.height - (before.height - 200))).toBeLessThanOrEqual(
      1,
    );

    // The grabber stays at the top edge while the content scrolls.
    await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>('.kerf-overlay')!;
      const sheet =
        host.tagName === 'DIALOG'
          ? host
          : (host.firstElementChild as HTMLElement);
      sheet.scrollTop = 300;
    });
    state = await panel(page);
    expect(state.handleTop).toBe(state.top);
    await page.screenshot({
      path: test
        .info()
        .outputPath(`sheet-${native ? 'native' : 'plain'}-scrolled.png`),
    });

    // A re-render keeps the grabber first and the resized height.
    await page.evaluate(() =>
      (globalThis as unknown as { setRows(n: number): void }).setRows(40),
    );
    await expect.poll(async () => (await panel(page)).handleFirst).toBe(true);
    expect((await panel(page)).height).toBe(state.height);

    await page.evaluate(() =>
      (globalThis as unknown as { closeSheet(): void }).closeSheet(),
    );
    await expect(page.locator('.kerf-overlay')).toHaveCount(0);
  });
}

test('a sheet without the opt-in class gets no grabber', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.className = 'kerf-overlay';
    host.dataset.presentation = 'bottom-sheet';
    host.append(document.createElement('div'));
    document.body.append(host);
  });
  await page.waitForTimeout(50);
  await expect(page.locator('.kui-overlay-sheet-handle')).toHaveCount(0);
});
