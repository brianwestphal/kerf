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

  // The specimens and the span nested in the last one, not the example's
  // own catalog label chrome.
  const roles = page.locator(
    ':is([data-demo-section="presentation-roles"] > .kui-text, [data-demo-section="presentation-roles"] > .kui-text .kui-text)',
  );
  await expect(roles).toHaveCount(9);
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
  await expect(roles.nth(7)).toHaveAttribute('data-size', 'large');
  await expect(roles.nth(8)).toHaveAttribute('data-size', 'xlarge');
  await expect
    .poll(() =>
      roles.evaluateAll((elements) =>
        elements
          .slice(7)
          .map((element) => globalThis.getComputedStyle(element).fontSize),
      ),
    )
    .toEqual(['20px', '32px']);
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
      roles.evaluateAll((elements) =>
        elements
          .slice(7)
          .map((element) => globalThis.getComputedStyle(element).fontSize),
      ),
    )
    .toEqual(['20px', '32px']);
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
  await roles.nth(8).scrollIntoViewIfNeeded();
  await expect(roles.nth(8)).toBeVisible();
  await page.screenshot({ path: 'test-results/text-size-narrow.png' });
});

test('Text wrap policies keep long copy within the row and cap summaries', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=text');
  const anywhere = page.locator('[data-demo-copy="anywhere"]');
  const capped = page.locator('[data-demo-copy="capped"]');
  const truncated = page.locator('[data-demo-copy="truncate"]');
  const nowrap = page.locator('[data-demo-copy="nowrap"]');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(anywhere).toHaveCSS('overflow-wrap', 'anywhere');
    await expect(nowrap).toHaveCSS('white-space', 'nowrap');
    await expect(page.locator('[data-demo-copy="price"]')).toHaveCSS(
      'white-space',
      'nowrap',
    );
    await expect(truncated).toHaveCSS('text-overflow', 'ellipsis');
    await expect(truncated).toHaveCSS('min-width', '0px');
    await expect(capped).toHaveCSS('white-space', 'normal');
    await expect(capped.locator('.kui-text__clamp')).toHaveCSS(
      '-webkit-line-clamp',
      '2',
    );
    const row = truncated.locator('..');
    const geometry = await row.evaluate((element) => {
      const text = element.querySelector<HTMLElement>('.kui-text')!;
      const detail = element.querySelector<HTMLElement>(
        '[data-demo-copy="price"]',
      )!;
      return {
        textEnd: text.getBoundingClientRect().right,
        detailStart: detail.getBoundingClientRect().left,
        detailEnd: detail.getBoundingClientRect().right,
        rowEnd: element.getBoundingClientRect().right,
        clipped: text.scrollWidth > text.clientWidth,
      };
    });
    expect(geometry.textEnd).toBeLessThanOrEqual(geometry.detailStart);
    expect(geometry.detailEnd).toBeLessThanOrEqual(geometry.rowEnd + 1);
    if (width === 390) expect(geometry.clipped).toBe(true);
    await row.screenshot({
      path: testInfo.outputPath(`text-wrap-row-${width}.png`),
    });
  }
});

test('Text font="monospace" resolves to the Kerf code stack with Web Awesome loaded', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=text');
  const mono = page.locator('.kui-text[data-font="monospace"]').first();
  await expect(mono).toBeVisible();
  // WebKit serializes family names without quotes; compare unquoted.
  const unquote = (value: string) =>
    value.replaceAll('"', '').replace(/\s+/g, ' ').trim();
  const stack =
    'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace';
  // Web Awesome's own `ui-monospace, monospace` must not replace the stack,
  // and the theme points Web Awesome's code family at the same stack.
  expect(
    unquote(
      await mono.evaluate((node) => window.getComputedStyle(node).fontFamily),
    ),
  ).toBe(stack);
  expect(
    unquote(
      await page.evaluate(() =>
        window
          .getComputedStyle(document.documentElement)
          .getPropertyValue('--wa-font-family-code'),
      ),
    ),
  ).toBe(stack);
  if (browserName !== 'chromium') return;
  // Chromium does not recognize `ui-monospace`; the named fallbacks must
  // render instead of the generic monospace face (Courier on macOS).
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '.kui-text[data-font="monospace"]',
  });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) expect(font.familyName).not.toMatch(/^Courier/);
});
