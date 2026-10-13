import { expect, test } from '@playwright/test';

test('ToolbarText description sits under the title at the same text start', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=toolbar-text');
  const example = page.locator('[data-demo-toolbar-text-description]');
  const toolbars = example.locator('.kui-toolbar');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await example.scrollIntoViewIfNeeded();
    for (const index of [0, 1]) {
      const geometry = await toolbars.nth(index).evaluate((toolbar) => {
        const title = toolbar
          .querySelector('.kui-toolbar-text__text')!
          .getBoundingClientRect();
        const description = toolbar.querySelector<HTMLElement>(
          '.kui-toolbar-text__description',
        )!;
        const box = description.getBoundingClientRect();
        const style = globalThis.getComputedStyle(description);
        const group = toolbar.querySelector(
          '.kui-toolbar__trailing .kui-toolbar-control-group',
        );
        return {
          titleLeft: title.left,
          titleBottom: title.bottom,
          descriptionLeft: box.left,
          descriptionTop: box.top,
          whiteSpace: style.whiteSpace,
          textOverflow: style.textOverflow,
          toolbarHeight: toolbar.getBoundingClientRect().height,
          groupTop: group
            ? group.getBoundingClientRect().top -
              toolbar.getBoundingClientRect().top
            : null,
        };
      });
      expect(
        Math.abs(geometry.descriptionLeft - geometry.titleLeft),
      ).toBeLessThan(1);
      expect(geometry.descriptionTop).toBeGreaterThanOrEqual(
        geometry.titleBottom - 1,
      );
      expect(geometry.whiteSpace).toBe('nowrap');
      expect(geometry.textOverflow).toBe('ellipsis');
      if (geometry.groupTop !== null)
        expect(geometry.groupTop).toBeCloseTo(8, 0);
    }
    await example.screenshot({
      path: testInfo.outputPath(`toolbar-text-description-${width}.png`),
    });
    await example.screenshot({
      path: `test-results/toolbar-text-description-${width}.png`,
    });
  }
  // The heading and its accessible name are the title alone; the description
  // is a separate node a dialog can reference with aria-describedby.
  const heading = example.getByRole('heading', { name: 'Custom Commands' });
  await expect(heading).toHaveAttribute('id', 'toolbar-text-description-title');
  await expect(heading).toHaveAccessibleName('Custom Commands');
  await expect(example.locator('#toolbar-text-description-copy')).toHaveText(
    'Changes save automatically.',
  );
});
