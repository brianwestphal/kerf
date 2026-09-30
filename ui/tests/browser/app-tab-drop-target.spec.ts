import { expect, test } from '@playwright/test';

test('app tab drop target and visible name keep selection independent', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=tabs');

    const bar = page.locator('[data-tab-bar-id="app-tab-drop-target"]');
    const selected = bar.locator('.kui-app-tab[data-tab-id="project-grid"]');
    const target = bar.locator('.kui-app-tab[data-tab-id="accounting"]');
    const truncatedName = page.locator(
      '[data-tab-bar-id="app-tab-truncated"] .kui-app-tab__name',
    );

    await expect(selected.getByRole('tab')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(target.getByRole('tab')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    await expect(target).toHaveAttribute('data-drop-target', 'true');
    await expect(target).toHaveAttribute('data-name-overflow', 'visible');
    await expect(target.getByRole('tab')).toHaveAccessibleName(
      'Accounting project',
    );

    const appearance = await target.evaluate((element) => {
      const rootStyle = window.getComputedStyle(element);
      const name = element.querySelector('.kui-app-tab__name')!;
      const nameStyle = window.getComputedStyle(name);
      return {
        background: rootStyle.backgroundColor,
        shadow: rootStyle.boxShadow,
        overflow: nameStyle.overflow,
        textOverflow: nameStyle.textOverflow,
        width: name.getBoundingClientRect().width,
      };
    });
    expect(appearance.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(appearance.shadow).toContain('inset');
    expect(appearance.overflow).toBe('visible');
    expect(appearance.textOverflow).toBe('clip');
    expect(appearance.width).toBeGreaterThan(80);
    await expect(truncatedName).toHaveCSS('text-overflow', 'ellipsis');

    await bar.screenshot({
      path: testInfo.outputPath(`app-tab-drop-target-${width}.png`),
    });

    await target.evaluate((element) =>
      element.removeAttribute('data-drop-target'),
    );
    await expect(target).not.toHaveAttribute('data-drop-target');
    const shadowAfterDrag = await target.evaluate(
      (element) => window.getComputedStyle(element).boxShadow,
    );
    expect(shadowAfterDrag).not.toContain('inset');
    await expect(selected.getByRole('tab')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(target.getByRole('tab')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  }
});
