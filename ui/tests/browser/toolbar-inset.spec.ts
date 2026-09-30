import { expect, test } from '@playwright/test';

test('Toolbar outer inset is independent of zone gap and safe-area padding', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=toolbar');
    const demo = page.locator('[data-demo="toolbar"]');
    const defaultToolbar = demo.locator('[aria-label="Document controls"]');
    const embedded = demo.locator('[aria-label="Inset-free toolbar"]');
    await expect(embedded).toBeVisible();
    const geometry = await Promise.all(
      [defaultToolbar, embedded].map((toolbar) =>
        toolbar.evaluate((element) => {
          const style = window.getComputedStyle(element);
          return {
            gap: style.gap,
            paddingBlockStart: style.paddingBlockStart,
            paddingInlineStart: style.paddingInlineStart,
            minHeight: style.minHeight,
          };
        }),
      ),
    );
    expect(geometry[0]).toMatchObject({
      gap: '8px',
      paddingBlockStart: '8px',
      paddingInlineStart: '8px',
      minHeight: '60px',
    });
    expect(geometry[1]).toMatchObject({
      gap: '8px',
      paddingBlockStart: '0px',
      paddingInlineStart: '0px',
      minHeight: '44px',
    });
    await embedded.screenshot({
      path: testInfo.outputPath(`toolbar-inset-${width}.png`),
    });

    await embedded.evaluate((element) =>
      (element as HTMLElement).style.setProperty(
        '--kui-edge-inset-inline-start',
        '12px',
      ),
    );
    await expect(embedded).toHaveCSS('padding-inline-start', '12px');
  }
});
