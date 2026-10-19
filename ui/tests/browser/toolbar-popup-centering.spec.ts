import { expect, test } from '@playwright/test';

test('single icon PopupMenu fills and centers the toolbar control slot when enabled or disabled', async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto('/?component=toolbar-control-group');
  const example = page
    .locator('[data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Popup Menu (Icon Only)',
      }),
    })
    .first();
  const groups = example.locator(
    '.kui-toolbar-control-group[data-single="true"][data-content="icon"]:has(> .kui-popup-menu)',
  );
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await example.scrollIntoViewIfNeeded();
    await example.evaluate((node) => {
      const group = node.querySelector<HTMLElement>(
        '.kui-toolbar-control-group[data-single="true"]:has(> .kui-popup-menu)',
      )!;
      const previous = group.nextElementSibling;
      if (previous?.hasAttribute('data-disabled-popup-fixture'))
        previous.remove();
      const disabled = group.cloneNode(true) as HTMLElement;
      disabled.dataset.disabledPopupFixture = '';
      disabled.querySelector('button')!.disabled = true;
      group.after(disabled);
    });
    await expect(groups).toHaveCount(2);
    for (const [index, disabled] of [false, true].entries()) {
      const group = groups.nth(index);
      const trigger = group.locator('.kui-popup-menu__trigger');
      await expect(trigger).toHaveJSProperty('disabled', disabled);
      const geometry = await group.evaluate((node) => {
        const center = (element: Element) => {
          const box = element.getBoundingClientRect();
          return {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
            width: box.width,
            height: box.height,
          };
        };
        const groupCenter = center(node);
        const buttonCenter = center(
          node.querySelector('.kui-popup-menu__trigger')!,
        );
        const glyphCenter = center(
          node.querySelector('.kui-popup-menu__trigger > svg')!,
        );
        return {
          group: groupCenter,
          button: buttonCenter,
          glyph: glyphCenter,
        };
      });
      expect(geometry.group.width).toBeCloseTo(44, 0);
      expect(geometry.group.height).toBeCloseTo(44, 0);
      expect(geometry.button.width).toBeGreaterThanOrEqual(40);
      expect(geometry.button.height).toBeCloseTo(40, 0);
      expect(Math.abs(geometry.button.x - geometry.group.x)).toBeLessThan(0.75);
      expect(Math.abs(geometry.glyph.x - geometry.group.x)).toBeLessThan(0.75);
      expect(Math.abs(geometry.glyph.y - geometry.group.y)).toBeLessThan(0.75);
    }
    if (browserName === 'chromium') {
      await example.screenshot({
        path: testInfo.outputPath(`toolbar-popup-centered-${width}.png`),
      });
    }
  }

  const enabled = groups.first().locator('.kui-popup-menu__trigger');
  await enabled.click();
  await expect(
    groups.first().getByRole('menu', { name: 'Sort Direction' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    groups.first().getByRole('menu', { name: 'Sort Direction' }),
  ).toBeHidden();
  const disabled = groups.nth(1).locator('.kui-popup-menu__trigger');
  await disabled.evaluate((button: HTMLButtonElement) => button.click());
  await expect(
    groups.nth(1).getByRole('menu', { name: 'Sort Direction' }),
  ).toBeHidden();
});
