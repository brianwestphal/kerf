import { expect, test } from '@playwright/test';

test('Text renders semantic variants with standard padded geometry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=text');

  const examples = page.locator('.demo-text-stack > .kui-text');
  await expect(examples).toHaveCount(7);
  await expect(examples.nth(0)).toHaveJSProperty('tagName', 'H1');
  await expect(examples.nth(5)).toHaveJSProperty('tagName', 'H6');
  await expect(examples.nth(6)).toHaveJSProperty('tagName', 'P');

  const paragraph = page.locator('#text-demo-paragraph');
  await expect(paragraph).toHaveAttribute('lang', 'en');
  await expect(paragraph).toHaveAttribute('data-demo-copy', 'paragraph');
  await expect(paragraph).toHaveAttribute('aria-label', 'Example paragraph');
  await expect
    .poll(() =>
      paragraph.evaluate((element) => {
        const style = globalThis.getComputedStyle(element);
        return {
          border: style.borderTopWidth,
          borderStyle: style.borderTopStyle,
          margin: style.marginTop,
          padding: style.paddingTop,
        };
      }),
    )
    .toEqual({
      border: '1px',
      borderStyle: 'solid',
      margin: '0px',
      padding: '8px',
    });

  await page.screenshot({ path: 'test-results/text-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  await page.screenshot({
    path: 'test-results/text-narrow.png',
    fullPage: true,
  });
});
