import { expect, test } from '@playwright/test';

test('Disclosure toggles natively, aligns its content, and forms an accordion', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=disclosure');
    const demo = page.locator('[data-demo="disclosure"]');
    const advanced = demo.locator('details').first();
    const summary = advanced.locator('summary');
    await expect(advanced).not.toHaveAttribute('open', '');

    // Keyboard: the summary is the native disclosure button.
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(advanced).toHaveJSProperty('open', true);
    const arrow = summary.locator('.kui-disclosure-arrow');
    await expect
      .poll(() => arrow.evaluate((el) => window.getComputedStyle(el).transform))
      .toBe('matrix(0, 1, -1, 0, 0, 0)');

    // No page-wide details styling leaks in: one arrow, no extra marker.
    const summaryStyle = await summary.evaluate((el) => ({
      after: window.getComputedStyle(el, '::after').content,
    }));
    expect(summaryStyle.after).toBe('none');

    // The content's text starts on the title's text column.
    const offset = await advanced.evaluate((details) => {
      const start = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect().left;
      };
      return (
        start(details.querySelector('.kui-disclosure__content .kui-text')!) -
        start(details.querySelector('.kui-disclosure__title')!)
      );
    });
    expect(Math.abs(offset)).toBeLessThanOrEqual(1);

    await page.keyboard.press('Space');
    await expect(advanced).toHaveJSProperty('open', false);
    await expect
      .poll(() => arrow.evaluate((el) => window.getComputedStyle(el).transform))
      .toBe('matrix(1, 0, 0, 1, 0, 0)');

    // Disclosures sharing a name close each other.
    const faq = demo.locator('details[name="disclosure-demo-faq"]');
    await faq.nth(0).locator('summary').click();
    await expect(faq.nth(0)).toHaveJSProperty('open', true);
    await faq.nth(1).locator('summary').click();
    await expect(faq.nth(1)).toHaveJSProperty('open', true);
    await expect(faq.nth(0)).toHaveJSProperty('open', false);
  }
});
