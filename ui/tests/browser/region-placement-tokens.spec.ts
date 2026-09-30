import { expect, test } from '@playwright/test';

for (const width of [1100, 390]) {
  test(`region and floating restore placement at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=floating-toolbar');
    const inline = page.locator(
      '.kui-floating-toolbar[data-placement="inline"]',
    );
    await expect(inline).toBeVisible();
    expect(
      await inline.evaluate((el) => window.getComputedStyle(el).position),
    ).toBe('static');
    await inline.screenshot({
      path: `test-results/floating-inline-${width}.png`,
    });
    const insets = await inline.evaluate((el) => {
      const host = document.createElement('div');
      host.style.cssText =
        'position:relative;width:240px;height:100px;--kui-safe-area-block-end:11px;--kui-safe-area-inline-end:13px';
      const clone = el.cloneNode(true) as HTMLElement;
      clone.dataset.placement = 'floating';
      clone.dataset.safeAreaInsets = 'true';
      clone.style.setProperty('--kui-floating-toolbar-inset-block-end', '5px');
      clone.style.setProperty('--kui-floating-toolbar-inset-inline-end', '7px');
      host.append(clone);
      document.body.append(host);
      const css = window.getComputedStyle(clone);
      const result = [css.position, css.bottom, css.right];
      host.remove();
      return result;
    });
    expect(insets).toEqual(['absolute', '16px', '20px']);

    await page.goto('/?component=resize');
    const region = page.locator(
      '.kui-resizable-region[data-region-id="catalog-panel"]',
    );
    await region.evaluate((el) => {
      const style = (el as HTMLElement).style;
      style.setProperty('--kui-resizable-region-background', 'rgb(10, 20, 30)');
      el.setAttribute('data-content-overflow', 'visible');
    });
    expect(
      await region.evaluate((el) => {
        const css = window.getComputedStyle(el);
        const content = el.querySelector('.kui-resizable-region__content')!;
        return [
          css.backgroundColor,
          css.zIndex,
          window.getComputedStyle(content).overflow,
        ];
      }),
    ).toEqual(['rgb(10, 20, 30)', '5', 'visible']);

    const restoreExample = page.locator('[data-demo-region-restore]');
    const restore = restoreExample.locator('.kui-resizable-region__restore');
    await expect(restore).toBeVisible();
    await expect(restore).toHaveAttribute('data-position', 'top-end');
    expect(
      await restore.evaluate((el) => window.getComputedStyle(el).position),
    ).toBe('absolute');
    await restoreExample.screenshot({
      path: `test-results/region-top-restore-${width}.png`,
    });
    await restore.evaluate((el) => el.setAttribute('data-placement', 'inline'));
    expect(
      await restore.evaluate((el) => window.getComputedStyle(el).position),
    ).toBe('static');
  });
}
