import { expect, test } from '@playwright/test';

test('compact tab strip keeps icon names, truncates long names, and applies geometry tokens', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=tab-bar');
    const bar = page.locator('[data-tab-bar-id="compact-project-tab-bar"]');
    const icon = bar.getByRole('tab', { name: 'Inspector' });
    const attention = bar.locator(
      '.kui-app-tab[data-tab-id="compact-attention"]',
    );
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAccessibleName('Inspector');
    await expect(attention).toHaveAttribute('data-attention', 'true');
    const geometry = await bar.evaluate((element) => {
      const strip = element.querySelector('.kui-tab-bar__tabs')!;
      const stripStyle = window.getComputedStyle(strip);
      const name = element.querySelector(
        '[data-tab-id="compact-attention"] .kui-app-tab__name',
      )!;
      const nameStyle = window.getComputedStyle(name);
      const plainName = element.querySelector(
        '[data-tab-id="compact-inspector"] .kui-app-tab__name',
      )!;
      return {
        stripHeight: strip.getBoundingClientRect().height,
        stripGap: stripStyle.gap,
        stripPadding: stripStyle.padding,
        nameWidth: name.getBoundingClientRect().width,
        textWidth: name.scrollWidth,
        nameOverflow: nameStyle.textOverflow,
        attentionColor: nameStyle.color,
        plainColor: window.getComputedStyle(plainName).color,
        right: element.getBoundingClientRect().right,
        pageWidth: document.documentElement.clientWidth,
      };
    });
    expect(geometry.stripHeight).toBeGreaterThanOrEqual(36);
    expect(geometry.stripGap).toBe('4px');
    expect(geometry.stripPadding).toBe('2px');
    expect(geometry.nameWidth).toBeLessThanOrEqual(112);
    expect(geometry.textWidth).toBeGreaterThan(geometry.nameWidth);
    expect(geometry.nameOverflow).toBe('ellipsis');
    expect(geometry.attentionColor).not.toBe(geometry.plainColor);
    expect(geometry.right).toBeLessThanOrEqual(geometry.pageWidth);
    await bar.screenshot({
      path: testInfo.outputPath(`compact-tab-strip-${width}.png`),
    });
  }
});
