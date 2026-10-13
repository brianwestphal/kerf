import { expect, test } from '@playwright/test';

test('Toolbar outer inset is independent of zone gap and safe-area padding', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=toolbar');
    const demo = page.locator('[data-demo="toolbar"]');
    const defaultToolbar = demo.locator('[aria-label="Document Controls"]');
    const embedded = demo.locator('[aria-label="Inset-Free Toolbar"]');
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

test('a compact-density Toolbar is 40px tall with compact groups centered in its band', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=toolbar');
  const example = page.locator('[data-demo-toolbar-compact]');
  const toolbar = example.locator('.kui-toolbar');
  await expect(toolbar).toHaveAttribute('data-density', 'compact');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await toolbar.scrollIntoViewIfNeeded();
    const geometry = await toolbar.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const group = element
        .querySelector('.kui-toolbar-control-group')!
        .getBoundingClientRect();
      const title = element
        .querySelector('.kui-toolbar-text')!
        .getBoundingClientRect();
      const style = globalThis.getComputedStyle(element);
      return {
        height: box.height,
        paddingInline: style.paddingLeft,
        groupHeight: group.height,
        groupTop: group.top - box.top,
        groupBottom: box.bottom - group.bottom,
        titleCenter: title.top + title.height / 2 - (box.top + box.height / 2),
      };
    });
    expect(geometry.height).toBeCloseTo(40, 0);
    expect(geometry.paddingInline).toBe('8px');
    expect(geometry.groupHeight).toBeCloseTo(34, 0);
    expect(Math.abs(geometry.groupTop - geometry.groupBottom)).toBeLessThan(1);
    expect(Math.abs(geometry.titleCenter)).toBeLessThan(1.5);
    await example.screenshot({
      path: testInfo.outputPath(`toolbar-compact-${width}.png`),
    });
    await example.screenshot({
      path: `test-results/toolbar-compact-${width}.png`,
    });
  }
});
