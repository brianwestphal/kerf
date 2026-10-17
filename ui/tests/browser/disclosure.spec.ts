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

test('An embedded Disclosure sits on its ContentItem inset without a second frame', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [1100, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/?component=disclosure');
      const item = page.locator('[data-demo-item="embedded-disclosure"]');
      const details = item.locator('details[data-appearance="embedded"]');
      const summary = details.locator('summary');
      const arrow = summary.locator('.kui-disclosure-arrow');
      await expect(details).toBeVisible();
      await expect(details).toHaveJSProperty('open', false);

      // The Disclosure draws no margin, border, or padding of its own, and
      // its summary is a compact row with no inset.
      const box = await details.evaluate((el) => {
        const sides = (
          style: CSSStyleDeclaration,
          prefix: string,
          suffix = '',
        ) =>
          ['Top', 'Right', 'Bottom', 'Left'].map((side) =>
            style.getPropertyValue(`${prefix}-${side.toLowerCase()}${suffix}`),
          );
        const style = window.getComputedStyle(el);
        const summaryElement = el.querySelector('summary')!;
        const summaryStyle = window.getComputedStyle(summaryElement);
        return {
          margin: sides(style, 'margin'),
          border: sides(style, 'border', '-width'),
          padding: sides(style, 'padding'),
          summaryPadding: sides(summaryStyle, 'padding'),
          summaryHeight: summaryElement.getBoundingClientRect().height,
          summaryMinHeight: summaryStyle.minHeight,
        };
      });
      const none = ['0px', '0px', '0px', '0px'];
      expect(box.margin).toEqual(none);
      expect(box.border).toEqual(none);
      expect(box.padding).toEqual(none);
      expect(box.summaryPadding).toEqual(none);
      expect(box.summaryMinHeight).toBe('24px');
      expect(box.summaryHeight).toBeGreaterThanOrEqual(24);
      expect(box.summaryHeight).toBeLessThan(42);

      // The Disclosure fills the item's content box: its arrow starts on the
      // item's content inset with the item's own copy (icons and text on the
      // owner's inset), never one inset further in.
      const geometry = await item.evaluate((element) => {
        const rect = (node: Element) => node.getBoundingClientRect();
        const textStart = (node: Element) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getBoundingClientRect().left;
        };
        const style = window.getComputedStyle(element);
        const itemRect = rect(element);
        const disclosure = element.querySelector('details')!;
        return {
          contentLeft:
            itemRect.left +
            Number.parseFloat(style.borderLeftWidth) +
            Number.parseFloat(style.paddingLeft),
          contentRight:
            itemRect.right -
            Number.parseFloat(style.borderRightWidth) -
            Number.parseFloat(style.paddingRight),
          leadText: textStart(element.querySelector('.kui-text')!),
          detailsLeft: rect(disclosure).left,
          detailsRight: rect(disclosure).right,
          arrowLeft: rect(disclosure.querySelector('.kui-disclosure-arrow')!)
            .left,
        };
      });
      expect(
        Math.abs(geometry.detailsLeft - geometry.contentLeft),
      ).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(geometry.detailsRight - geometry.contentRight),
      ).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(geometry.arrowLeft - geometry.contentLeft),
      ).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(geometry.leadText - geometry.contentLeft),
      ).toBeLessThanOrEqual(1);

      // A click toggles it natively and the arrow rotates.
      await summary.click();
      await expect(details).toHaveJSProperty('open', true);
      await expect
        .poll(() =>
          arrow.evaluate((el) => window.getComputedStyle(el).transform),
        )
        .toBe('matrix(0, 1, -1, 0, 0, 0)');

      // The body text starts on the title's text column, one item gap below.
      const body = await details.evaluate((el) => {
        const textStart = (node: Element) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getBoundingClientRect().left;
        };
        const text = el.querySelector('.kui-disclosure__content .kui-text')!;
        return {
          inline:
            textStart(text) -
            textStart(el.querySelector('.kui-disclosure__title')!),
          block:
            text.getBoundingClientRect().top -
            el.querySelector('summary')!.getBoundingClientRect().bottom,
        };
      });
      expect(Math.abs(body.inline)).toBeLessThanOrEqual(1);
      expect(Math.abs(body.block - 8)).toBeLessThanOrEqual(0.5);

      // Enter and Space toggle it from the keyboard.
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveJSProperty('open', false);
      await expect
        .poll(() =>
          arrow.evaluate((el) => window.getComputedStyle(el).transform),
        )
        .toBe('matrix(1, 0, 0, 1, 0, 0)');
      await page.keyboard.press('Space');
      await expect(details).toHaveJSProperty('open', true);
    }
  }
});
