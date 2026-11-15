import { expect, test } from '@playwright/test';

test('app tab drop target and visible name keep selection independent', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=tabs');

    const bar = page.locator('[data-tab-bar-id="tab-bar-item-drop-target"]');
    const selected = bar.locator(
      '.kui-tab-bar-item[data-tab-id="project-grid"]',
    );
    const target = bar.locator('.kui-tab-bar-item[data-tab-id="accounting"]');
    const truncatedName = page.locator(
      '[data-tab-bar-id="tab-bar-item-truncated"] .kui-tab-bar-item__name',
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
      'Accounting Project',
    );

    const appearance = await target.evaluate((element) => {
      const rootStyle = window.getComputedStyle(element);
      const name = element.querySelector('.kui-tab-bar-item__name')!;
      return {
        background: rootStyle.backgroundColor,
        shadow: rootStyle.boxShadow,
        truncated: name.scrollWidth > name.clientWidth,
        width: name.getBoundingClientRect().width,
      };
    });
    expect(appearance.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(appearance.shadow).toContain('inset');
    // The full name shows past labelMaxWidth while the strip has room.
    expect(appearance.truncated).toBe(false);
    expect(appearance.width).toBeGreaterThan(80);
    await expect(truncatedName).toHaveCSS('text-overflow', 'ellipsis');

    await bar.screenshot({
      path: testInfo.outputPath(`tab-bar-item-drop-target-${width}.png`),
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

// KF-0M3ZPT: a visible-name tab wider than its whole strip takes the strip's
// width and ellipsizes with its full name as the title, instead of the strip
// clipping the name where scrolling cannot reveal it.
test('a visible-name tab wider than its strip ellipsizes with a title', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=tabs');
  const bar = page.locator('[data-tab-bar-id="tab-bar-item-drop-target"]');
  const target = bar.locator('.kui-tab-bar-item[data-tab-id="accounting"]');
  const measure = () =>
    target.evaluate((tab) => {
      const strip = tab.parentElement!;
      const name = tab.querySelector<HTMLElement>('.kui-tab-bar-item__name')!;
      const style = window.getComputedStyle(strip);
      const content =
        strip.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      return {
        fitsStrip: tab.getBoundingClientRect().width <= content + 0.5,
        truncated: name.scrollWidth > name.clientWidth,
        textOverflow: window.getComputedStyle(name).textOverflow,
      };
    });
  const setWidth = (width: string) =>
    bar.evaluate((element, value) => {
      element.style.width = value;
    }, width);

  await setWidth('110px');
  await expect.poll(measure).toEqual({
    fitsStrip: true,
    truncated: true,
    textOverflow: 'ellipsis',
  });
  const button = target.getByRole('tab');
  await expect(button).toHaveAccessibleName('Accounting Project');
  await target.hover();
  await expect(button).toHaveAttribute('title', 'Accounting Project');

  // Room again: the whole name shows, and the title goes on the next hover.
  await setWidth('');
  await expect.poll(measure).toMatchObject({ truncated: false });
  await page.mouse.move(0, 0);
  await target.hover();
  await expect(button).not.toHaveAttribute('title');
});
