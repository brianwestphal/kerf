import { expect, test } from '@playwright/test';

test('compact toolbar Select uses group focus geometry and spaced option icons', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const demo = page.locator('[data-demo="select"]');
  const select = demo.locator('[name="toolbar-rendering-balance"]');
  const group = select.locator('xpath=..');

  await select.click();
  await expect(select).toHaveAttribute('open');
  const focusGeometry = await group.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      borderRadius: Number.parseFloat(style.borderTopLeftRadius),
      height: bounds.height,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      width: bounds.width,
    };
  });
  expect(focusGeometry).toMatchObject({
    height: 34,
    outlineStyle: 'solid',
    outlineWidth: 3,
  });
  expect(focusGeometry.width).toBeGreaterThanOrEqual(34);
  expect(focusGeometry.width).toBeLessThanOrEqual(36);
  expect(focusGeometry.borderRadius).toBeGreaterThanOrEqual(17);

  const gaps = await select.locator('wa-option').evaluateAll((options) =>
    options.map((option) => {
      const icon = option.querySelector<HTMLElement>('.kui-select__icon');
      const label = [...option.childNodes].find(
        (node) =>
          node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
      );
      if (!icon || !label) return -1;
      const range = document.createRange();
      range.selectNodeContents(label);
      return (
        range.getBoundingClientRect().left - icon.getBoundingClientRect().right
      );
    }),
  );
  expect(gaps).toHaveLength(3);
  for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(8);

  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/select-toolbar-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  const popupBounds = await select.evaluate((element) =>
    element.shadowRoot
      ?.querySelector<HTMLElement>('[part~="listbox"]')
      ?.getBoundingClientRect(),
  );
  expect(popupBounds?.left).toBeGreaterThanOrEqual(10);
  expect(popupBounds?.right).toBeLessThanOrEqual(380);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/select-toolbar-narrow.png' });
});
