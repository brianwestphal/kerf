import { expect, test } from '@playwright/test';

test('Text renders semantic variants with standard padded geometry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=text');

  const examples = page.locator(
    '[data-demo-section="semantic-variants"] > .kui-text',
  );
  await expect(examples).toHaveCount(7);
  await expect(examples.nth(0)).toHaveJSProperty('tagName', 'H1');
  await expect(examples.nth(5)).toHaveJSProperty('tagName', 'H6');
  await expect(examples.nth(6)).toHaveJSProperty('tagName', 'P');

  const paragraph = page.locator('#text-demo-paragraph');
  await expect(paragraph).toHaveAttribute('lang', 'en');
  await expect(paragraph).toHaveAttribute('data-demo-copy', 'paragraph');
  await expect(paragraph).toHaveAttribute('aria-label', 'Example paragraph');
  await expect(paragraph).toHaveAttribute('data-tone', 'default');
  await expect(paragraph).toHaveAttribute('data-size', 'default');
  await expect(paragraph).toHaveAttribute('data-font', 'default');
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

  const roles = page.locator(
    '[data-demo-section="presentation-roles"] .kui-text',
  );
  await expect(roles).toHaveCount(7);
  await expect(roles.nth(0)).toHaveAttribute('data-tone', 'quiet');
  await expect(roles.nth(1)).toHaveAttribute('data-tone', 'danger');
  await expect(roles.nth(2)).toHaveAttribute('data-size', 'compact');
  await expect(roles.nth(3)).toHaveAttribute('data-font', 'monospace');
  await expect(roles.nth(4)).toHaveAttribute('data-tone', 'quiet');
  await expect(roles.nth(4)).toHaveAttribute('data-size', 'compact');
  await expect(roles.nth(4)).toHaveAttribute('data-font', 'monospace');
  // A block Text wraps the bold label so it takes the component typography;
  // the inline-span count sits inside it.
  await expect(roles.nth(5).locator(':scope > strong')).toHaveCount(1);
  await expect(roles.nth(5).locator('.kui-text')).toHaveCount(1);
  await expect(roles.nth(6)).toHaveJSProperty('tagName', 'SPAN');
  await expect(roles.nth(6)).toHaveAttribute('data-tone', 'quiet');
  await expect(roles.nth(6)).toHaveAttribute('data-size', 'compact');
  await expect
    .poll(() =>
      roles.nth(6).evaluate((element) => {
        const style = globalThis.getComputedStyle(element);
        return {
          display: style.display,
          border: style.borderTopWidth,
          margin: style.marginTop,
          padding: style.paddingTop,
        };
      }),
    )
    .toEqual({
      display: 'inline',
      border: '0px',
      margin: '0px',
      padding: '0px',
    });
  await expect
    .poll(() =>
      roles.evaluateAll((elements) => {
        const styles = elements.map((element) =>
          globalThis.getComputedStyle(element),
        );
        return {
          quietColor: styles[0]?.color,
          dangerColor: styles[1]?.color,
          defaultColor: globalThis.getComputedStyle(
            document.querySelector('#text-demo-paragraph')!,
          ).color,
          compactSize: styles[2]?.fontSize,
          defaultSize: globalThis.getComputedStyle(
            document.querySelector('#text-demo-paragraph')!,
          ).fontSize,
          monoFamily: styles[3]?.fontFamily,
          defaultFamily: globalThis.getComputedStyle(
            document.querySelector('#text-demo-paragraph')!,
          ).fontFamily,
        };
      }),
    )
    .toMatchObject({
      compactSize: '12px',
    });

  const presentation = await roles.evaluateAll((elements) => {
    const styles = elements.map((element) =>
      globalThis.getComputedStyle(element),
    );
    const defaults = globalThis.getComputedStyle(
      document.querySelector('#text-demo-paragraph')!,
    );
    return {
      quietDiffers: styles[0]?.color !== defaults.color,
      dangerDiffers: styles[1]?.color !== defaults.color,
      compactDiffers: styles[2]?.fontSize !== defaults.fontSize,
      monoDiffers: styles[3]?.fontFamily !== defaults.fontFamily,
    };
  });
  expect(presentation).toEqual({
    quietDiffers: true,
    dangerDiffers: true,
    compactDiffers: true,
    monoDiffers: true,
  });

  const presentationExample = roles
    .nth(5)
    .locator('xpath=ancestor::*[@data-catalog-example]');
  await presentationExample.screenshot({
    path: 'test-results/text-inline-wide.png',
  });

  await page.screenshot({ path: 'test-results/text-wide.png', fullPage: true });
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await presentationExample.screenshot({
    path: 'test-results/text-inline-dark.png',
  });
  await page.screenshot({
    path: 'test-results/text-dark-wide.png',
    fullPage: true,
  });
  await page.locator('[data-action="toggle-theme"]').click();
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
  await presentationExample.screenshot({
    path: 'test-results/text-inline-narrow.png',
  });
  await page.screenshot({
    path: 'test-results/text-narrow.png',
    fullPage: true,
  });
});
