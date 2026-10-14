import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-CV6GG5 @kerfjs/ui/overlay-sheet.css: a core kerfjs/overlay dialog with
// presentation: 'bottom-sheet' rests on the bottom edge with square bottom
// corners, pads its block end by the larger of the safe area and the
// keyboard inset, and with exitClass 'kui-overlay-sheet-exit' slides away
// before the core removes it — on the plain and the native host.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/overlay-sheet.tsx')],
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
  await page.setContent('<body style="margin:0"><main>Page</main></body>');
  await page.addStyleTag({
    content: `${css}\n:root{--kui-safe-area-block-end:34px}`,
  });
  await page.addScriptTag({
    content: result.outputFiles.find((file) => file.path.endsWith('.js'))!.text,
  });
}

function sheet(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector<HTMLElement>('.kerf-overlay');
    if (!host) return null;
    const panel =
      host.tagName === 'DIALOG'
        ? host
        : (host.firstElementChild as HTMLElement);
    const rect = panel.getBoundingClientRect();
    const style = window.getComputedStyle(panel);
    return {
      tag: host.tagName,
      exiting: host.classList.contains('kui-overlay-sheet-exit'),
      bottom: Math.round(rect.bottom),
      width: Math.round(rect.width),
      paddingBottom: parseFloat(style.paddingBottom),
      radii: [style.borderTopLeftRadius, style.borderBottomLeftRadius],
    };
  });
}

for (const native of [false, true])
  test(`a ${native ? 'native' : 'plain'} core dialog rests on the bottom edge and slides away`, async ({
    page,
  }) => {
    await mount(page);
    await page.evaluate(
      (value) =>
        (globalThis as unknown as { openSheet(n: boolean): void }).openSheet(
          value,
        ),
      native,
    );
    await expect.poll(async () => (await sheet(page))?.bottom).toBe(844);
    const open = (await sheet(page))!;
    expect(open.tag).toBe(native ? 'DIALOG' : 'DIV');
    expect(open.width).toBe(390);
    // The 8px surface inset plus the 34px safe area.
    expect(open.paddingBottom).toBeCloseTo(42, 0);
    expect(open.radii[0]).not.toBe('0px');
    expect(open.radii[1]).toBe('0px');

    // The keyboard inset the core publishes wins when it is larger.
    await page.evaluate(() =>
      document
        .querySelector<HTMLElement>('.kerf-overlay')!
        .style.setProperty('--kerf-keyboard-inset', '300px'),
    );
    expect((await sheet(page))!.paddingBottom).toBeCloseTo(308, 0);

    // Escape resolves at once; the sheet slides away, then the core removes it.
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(() =>
        (globalThis as unknown as { sheetResult(): unknown }).sheetResult(),
      ),
    ).toBe(false);
    expect((await sheet(page))?.exiting).toBe(true);
    await expect.poll(() => sheet(page), { timeout: 3000 }).toBeNull();
  });

test('reduced motion removes the sheet without an exit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  await page.evaluate(() =>
    (globalThis as unknown as { openSheet(n: boolean): void }).openSheet(false),
  );
  await expect.poll(() => sheet(page)).not.toBeNull();
  await page.keyboard.press('Escape');
  expect(await sheet(page)).toBeNull();
});
