import { expect, test } from '@playwright/test';

import { Text } from '../../dist/text.js';

test('Mark keeps match and current result readable in prose and code', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=text');
  const section = page.locator('[data-demo-section="find-matches"]');
  const marks = section.locator('mark.kui-text__mark');
  await expect(marks).toHaveCount(4);
  await expect(marks.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(marks.nth(3)).toHaveAttribute('aria-current', 'true');
  await expect(marks.nth(0)).not.toHaveAttribute('aria-current');

  const contrast = async () =>
    marks.evaluateAll((elements) => {
      const channels = (color: string) => {
        const values = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        return color.startsWith('color(srgb ')
          ? values.map((v) => v * 255)
          : values;
      };
      const luminance = (color: string) => {
        const values = channels(color).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
      };
      return elements.map((element) => {
        const style = window.getComputedStyle(element);
        const foreground = luminance(style.color);
        const background = luminance(style.backgroundColor);
        return {
          ratio:
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05),
          background: style.backgroundColor,
          font: style.fontFamily,
          parentFont: window.getComputedStyle(element.parentElement!)
            .fontFamily,
        };
      });
    });

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const results = await contrast();
    for (const result of results) {
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      expect(result.font).toBe(result.parentFont);
    }
    expect(results[0]!.background).not.toBe(results[1]!.background);
    await section.screenshot({
      path: testInfo.outputPath(`mark-${colorScheme}.png`),
    });
  }

  if (testInfo.project.name === 'chromium') {
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
    const results = await contrast();
    for (const result of results)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    expect(results[0]!.background).not.toBe(results[1]!.background);
    await section.screenshot({
      path: testInfo.outputPath('mark-forced-colors.png'),
    });
  }
});

test('Text colors inherit, use foreground tokens, and override tone', async ({
  page,
}) => {
  await page.goto('/?component=text');
  const texts = page.locator('[data-demo-section="text-colors"] > .kui-text');
  await expect(texts).toHaveCount(4);
  await expect(texts.nth(0)).not.toHaveAttribute('style', /color:/);
  expect(
    await texts
      .nth(0)
      .evaluate(
        (element) =>
          window.getComputedStyle(element).color ===
          window.getComputedStyle(element.parentElement!).color,
      ),
  ).toBe(true);
  await expect(texts.nth(1)).toHaveAttribute(
    'style',
    /color:var\(--kui-color-warning-on-quiet\)/,
  );
  await expect(texts.nth(2)).toHaveCSS('color', 'rgb(102, 51, 153)');
  await expect(texts.nth(3)).toHaveAttribute('data-tone', 'danger');
  const quiet = page
    .locator(
      '[data-demo-section="presentation-roles"] > .kui-text[data-tone="quiet"]',
    )
    .first();
  await expect(texts.nth(3)).toHaveCSS(
    'color',
    await quiet.evaluate((element) => window.getComputedStyle(element).color),
  );
});

test('FieldLabel matches the live form label and names a preview', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=text');
  const section = page.locator('[data-demo-section="field-label"]');
  const label = section.locator('.kui-text__field-label');
  const preview = section.getByRole('group', { name: 'Needed By' });
  const input = section.locator('.kui-text-field');
  await expect(label).toHaveText('Needed By');
  await expect(preview).toContainText('October 16, 2026');
  await expect(input.getByRole('textbox', { name: 'Needed By' })).toHaveValue(
    'October 16, 2026',
  );

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const styles = await section.evaluate((root) => {
      const previewLabel = root.querySelector<HTMLElement>(
        '.kui-text__field-label',
      )!;
      const controlLabel = root.querySelector<HTMLElement>(
        '.kui-text-field__label',
      )!;
      const pick = (element: HTMLElement) => {
        const css = globalThis.getComputedStyle(element);
        return [
          css.color,
          css.fontSize,
          css.fontWeight,
          css.letterSpacing,
          css.lineHeight,
          css.textTransform,
          css.paddingInlineStart,
          css.marginBlockEnd,
        ];
      };
      return { preview: pick(previewLabel), control: pick(controlLabel) };
    });
    expect(styles.preview).toEqual(styles.control);
    await section.screenshot({
      path: testInfo.outputPath(`field-label-${width}.png`),
    });
  }
});

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
  await expect(paragraph).toHaveAttribute('aria-label', 'Example Paragraph');
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

  // The specimens and the spans nested in the label line, not the example's
  // own catalog label chrome.
  const roles = page.locator(
    ':is([data-demo-section="presentation-roles"] > .kui-text, [data-demo-section="presentation-roles"] > .kui-text .kui-text)',
  );
  await expect(roles).toHaveCount(10);
  await expect(roles.nth(0)).toHaveAttribute('data-tone', 'quiet');
  await expect(roles.nth(1)).toHaveAttribute('data-tone', 'danger');
  await expect(roles.nth(2)).toHaveAttribute('data-size', 'compact');
  await expect(roles.nth(3)).toHaveAttribute('data-font', 'monospace');
  await expect(roles.nth(4)).toHaveAttribute('data-tone', 'quiet');
  await expect(roles.nth(4)).toHaveAttribute('data-size', 'compact');
  await expect(roles.nth(4)).toHaveAttribute('data-font', 'monospace');
  // A block Text wraps two strong span Texts (KF-MN7QK5: Text nodes, not a
  // raw <strong>) so the label takes the component typography; the second,
  // the count, is quiet and compact.
  await expect(roles.nth(5).locator(':scope > strong')).toHaveCount(0);
  await expect(roles.nth(5).locator(':scope > .kui-text')).toHaveCount(2);
  await expect(roles.nth(6)).toHaveJSProperty('tagName', 'SPAN');
  await expect(roles.nth(6).locator(':scope > strong')).toHaveText('Inbox');
  await expect(roles.nth(7)).toHaveJSProperty('tagName', 'SPAN');
  await expect(roles.nth(7).locator(':scope > strong')).toHaveText('· 3 msg');
  await expect(roles.nth(7)).toHaveAttribute('data-tone', 'quiet');
  await expect(roles.nth(7)).toHaveAttribute('data-size', 'compact');
  await expect(roles.nth(8)).toHaveAttribute('data-size', 'large');
  await expect(roles.nth(9)).toHaveAttribute('data-size', 'xlarge');
  await expect
    .poll(() =>
      roles.evaluateAll((elements) =>
        elements
          .slice(8)
          .map((element) => globalThis.getComputedStyle(element).fontSize),
      ),
    )
    .toEqual(['20px', '32px']);
  await expect
    .poll(() =>
      roles.nth(7).evaluate((element) => {
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
          .slice(8)
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
  await roles.nth(9).scrollIntoViewIfNeeded();
  await expect(roles.nth(9)).toBeVisible();
  await page.screenshot({ path: 'test-results/text-size-narrow.png' });
});

test('Text align centers wrapped status copy and end-aligns values', async ({
  page,
}) => {
  await page.goto('/?component=text');
  const centered = page.locator('[data-demo-copy="align-center"]');
  const end = page.locator('[data-demo-copy="align-end"]');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(centered).toHaveCSS('text-align', 'center');
    await expect(end).toHaveCSS('text-align', 'end');
    const lines = await centered.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = element.getBoundingClientRect();
      return [...range.getClientRects()].map((rect) => ({
        left: rect.left - box.left,
        right: box.right - rect.right,
      }));
    });
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines)
      expect(Math.abs(line.left - line.right)).toBeLessThanOrEqual(2);
  }
  await centered.scrollIntoViewIfNeeded();
  await centered
    .locator('..')
    .screenshot({ path: 'test-results/text-align-narrow.png' });
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

test('Text truncates a path in the middle and a branch name at the start', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=text');
  const middle = page.locator('[data-demo-copy="truncate-middle"]');
  const start = page.locator('[data-demo-copy="truncate-start"]');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await middle.scrollIntoViewIfNeeded();
    await expect(middle).toHaveAttribute('title', /tab-overflow-menu\.tsx$/);
    await expect(start).toHaveAttribute('title', /^feature\/kf-482/);
    const geometry = await page.evaluate(() => {
      const box = (selector: string) =>
        document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      const head = document.querySelector<HTMLElement>(
        '[data-demo-copy="truncate-middle"] .kui-text__truncate-head',
      )!;
      const clip = document.querySelector<HTMLElement>(
        '[data-demo-copy="truncate-start"] .kui-text__truncate-start',
      )!;
      const range = document.createRange();
      range.selectNodeContents(clip);
      const run = range.getBoundingClientRect();
      const clipBox = clip.getBoundingClientRect();
      return {
        headClipped: head.scrollWidth > head.clientWidth,
        tailEnd: box(
          '[data-demo-copy="truncate-middle"] .kui-text__truncate-tail',
        ).right,
        middleEnd: box(
          '[data-demo-copy="truncate-middle"] .kui-text__truncate-middle',
        ).right,
        startClipped: clip.scrollWidth > clip.clientWidth,
        runStartDelta: run.left - clipBox.left,
        runEndDelta: run.right - clipBox.right,
        ellipsis: window.getComputedStyle(clip).textOverflow,
      };
    });
    // The kept suffix stays whole inside the box while the head shrinks.
    expect(geometry.headClipped).toBe(true);
    expect(geometry.tailEnd).toBeLessThanOrEqual(geometry.middleEnd + 1);
    expect(geometry.ellipsis).toBe('ellipsis');
    if (width === 390) {
      // Overflowing, the run's tail is flush with the box end and its start
      // is clipped behind the leading ellipsis.
      expect(geometry.startClipped).toBe(true);
      expect(Math.abs(geometry.runEndDelta)).toBeLessThanOrEqual(1);
      expect(geometry.runStartDelta).toBeLessThan(0);
    } else {
      // Fitting text stays left-aligned with its neighbors.
      expect(geometry.startClipped).toBe(false);
      expect(Math.abs(geometry.runStartDelta)).toBeLessThanOrEqual(1);
    }
    await middle
      .locator('..')
      .screenshot({ path: testInfo.outputPath(`text-truncate-${width}.png`) });
  }
});

test('Text keeps a visible middle cut when a long suffix nearly fills a narrow caption', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=text');
  const html = String(
    Text({
      variant: 'span',
      wrap: 'truncate',
      truncate: 'middle',
      truncateKeep: 12,
      children: 'drafts › Release train: run Q69G5FB0',
    }),
  );
  await page.evaluate((markup) => {
    const fixture = document.createElement('div');
    fixture.dataset.testMiddleCaption = '';
    fixture.style.width = '110px';
    fixture.style.padding = '8px';
    fixture.style.background = 'white';
    fixture.innerHTML = markup;
    document.body.append(fixture);
  }, html);
  const caption = page.locator('[data-test-middle-caption]');
  const geometry = await caption.evaluate((element) => {
    const head = element.querySelector<HTMLElement>(
      '.kui-text__truncate-head',
    )!;
    const tail = element.querySelector<HTMLElement>(
      '.kui-text__truncate-tail',
    )!;
    const middle = element.querySelector<HTMLElement>(
      '.kui-text__truncate-middle',
    )!;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = window.getComputedStyle(head).font;
    return {
      headWidth: head.getBoundingClientRect().width,
      ellipsisWidth: context.measureText('…').width,
      headClipped: head.scrollWidth > head.clientWidth,
      tailEnd: tail.getBoundingClientRect().right,
      middleEnd: middle.getBoundingClientRect().right,
    };
  });
  expect(geometry.headClipped).toBe(true);
  expect(geometry.headWidth).toBeGreaterThanOrEqual(geometry.ellipsisWidth);
  expect(geometry.tailEnd).toBeLessThanOrEqual(geometry.middleEnd + 1);
  await caption.screenshot({
    path: testInfo.outputPath('text-middle-cut.png'),
  });
});

test('Text can keep a run-id suffix whole in a 109px monospaced box', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=text');
  const render = (truncatePriority?: 'suffix') =>
    String(
      Text({
        variant: 'span',
        font: 'monospace',
        flush: true,
        wrap: 'truncate',
        truncate: 'middle',
        truncateKeep: 12,
        truncatePriority,
        style: 'font-size:14px;width:109px',
        children: 'drafts › Release train: run Q69G5FB0',
      }),
    );
  await page.evaluate(
    ([headFirst, suffixFirst]) => {
      const fixture = document.createElement('div');
      fixture.dataset.testTruncatePriority = '';
      fixture.style.cssText =
        'width:max-content;padding:12px;background:white;color:black';
      fixture.innerHTML = `${headFirst}<br>${suffixFirst}`;
      document.body.append(fixture);
    },
    [render(), render('suffix')],
  );
  const pair = page.locator('[data-test-truncate-priority]');
  const geometry = await pair.evaluate((element) =>
    [...element.querySelectorAll<HTMLElement>('.kui-text')].map((text) => {
      const head = text.querySelector<HTMLElement>('.kui-text__truncate-head')!;
      const tail = text.querySelector<HTMLElement>('.kui-text__truncate-tail')!;
      const middle = text.querySelector<HTMLElement>(
        '.kui-text__truncate-middle',
      )!;
      return {
        headWidth: head.getBoundingClientRect().width,
        headContentOpacity: window.getComputedStyle(
          head.querySelector<HTMLElement>('.kui-text__truncate-head-content') ??
            head,
        ).opacity,
        tailClipped: tail.scrollWidth > tail.clientWidth + 1,
        tailOverflow: window.getComputedStyle(tail).textOverflow,
        tailInside:
          tail.getBoundingClientRect().right <=
          middle.getBoundingClientRect().right + 1,
      };
    }),
  );
  expect(geometry).toHaveLength(2);
  expect(geometry[0]!.tailClipped).toBe(true);
  expect(geometry[0]!.tailOverflow).toBe('ellipsis');
  expect(geometry[1]!.headWidth).toBeLessThan(geometry[0]!.headWidth);
  expect(geometry[1]!.headContentOpacity).toBe('0');
  expect(geometry[1]!.tailClipped).toBe(false);
  expect(geometry[1]!.tailOverflow).toBe('clip');
  expect(geometry[1]!.tailInside).toBe(true);
  await pair.screenshot({
    path: testInfo.outputPath('text-suffix-priority.png'),
  });
  const wide = await pair.evaluate(async (element) => {
    const text = element.querySelector<HTMLElement>(
      '[data-truncate-priority="suffix"]',
    )!;
    text.style.width = '360px';
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => resolve()),
      ),
    );
    const head = text.querySelector<HTMLElement>('.kui-text__truncate-head')!;
    return {
      opacity: window.getComputedStyle(
        head.querySelector<HTMLElement>('.kui-text__truncate-head-content')!,
      ).opacity,
      clipped: head.scrollWidth > head.clientWidth + 1,
    };
  });
  expect(wide).toEqual({ opacity: '1', clipped: false });
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

test('Text control margins add exterior gutters without changing owned padding', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=text');
  const section = page.locator('[data-demo-section="control-margins"]');
  const all = section.locator('[data-demo-copy="margin-all"]');
  const horizontal = section.locator('[data-demo-copy="margin-horizontal"]');
  const flush = section.locator('[data-demo-copy="margin-flush"]');
  const inline = section.locator('[data-demo-copy="margin-inline"]');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    for (const edge of ['top', 'right', 'bottom', 'left'])
      await expect(all).toHaveCSS(`margin-${edge}`, '8px');
    await expect(all).toHaveCSS('padding-top', '8px');
    await expect(all).toHaveCSS('border-top-width', '1px');
    for (const copy of [horizontal, flush, inline]) {
      await expect(copy).toHaveCSS('margin-left', '8px');
      await expect(copy).toHaveCSS('margin-right', '8px');
      await expect(copy).toHaveCSS('margin-top', '0px');
    }
    await expect(flush).toHaveCSS('padding-top', '0px');
    await expect(inline).toHaveCSS('display', 'inline');
    expect(
      await all.evaluate(
        (el) =>
          el.getBoundingClientRect().right <=
          el.parentElement!.getBoundingClientRect().right,
      ),
    ).toBe(true);
    await section.screenshot({
      path: testInfo.outputPath(`text-control-margins-${width}.png`),
    });
  }
  await all.evaluate((el) =>
    el.setAttribute('style', '--kui-layout-inline-margin:12px'),
  );
  await expect(all).toHaveCSS('margin-left', '12px');
  await expect(horizontal).toHaveCSS('margin-left', '8px');
  for (const sides of [
    't',
    'r',
    'b',
    'l',
    'tr',
    'tb',
    'tl',
    'rb',
    'rl',
    'bl',
    'trb',
    'trl',
    'tbl',
    'rbl',
    'trbl',
    '',
  ]) {
    await all.evaluate(
      (el, value) => el.setAttribute('data-control-margins', value),
      sides,
    );
    for (const [edge, letter] of [
      ['top', 't'],
      ['right', 'r'],
      ['bottom', 'b'],
      ['left', 'l'],
    ])
      await expect(all).toHaveCSS(
        `margin-${edge}`,
        sides.includes(letter) ? '12px' : '0px',
      );
  }
});

test('a medium heading is 16px with heading weight and wraps', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=text');
    const heading = page.locator('[data-demo-copy="medium-heading"]');
    await expect(heading).toHaveJSProperty('localName', 'h3');
    await expect(heading).toHaveCSS('font-size', '16px');
    const metrics = await heading.evaluate((element) => {
      const style = globalThis.getComputedStyle(element);
      return {
        weight: Number(style.fontWeight),
        lines: Math.round(
          element.getBoundingClientRect().height / parseFloat(style.lineHeight),
        ),
      };
    });
    expect(metrics.weight).toBeGreaterThanOrEqual(600);
    if (width < 500) expect(metrics.lines).toBeGreaterThan(1);
  }
});

// KF-FM2NWN: WebKit drew no leading ellipsis for start truncation of text
// with spaces when the run was an isolating dir="ltr" span.
test('Text start truncation draws its leading ellipsis for spaced text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/?component=text');
  const text = page.locator('[data-demo-copy="truncate-start-spaced"]');
  await text.scrollIntoViewIfNeeded();
  await expect(text).toHaveAttribute(
    'title',
    'Nightly release train for the procurement service: run Q69G5FB0',
  );
  const clip = text.locator('.kui-text__truncate-start');
  expect(
    await clip.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  // The tail stays visible: the run's end is flush with the box end.
  const tailDelta = await clip.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return (
      range.getBoundingClientRect().right -
      element.getBoundingClientRect().right
    );
  });
  expect(Math.abs(tailDelta)).toBeLessThanOrEqual(1);
  // The text runs between left-to-right marks, not in an isolating span,
  // which is what keeps WebKit's leading ellipsis (verified visually; a
  // pixel comparison could not tell WebKit's broken ellipsis from a real one).
  expect(
    await clip.evaluate((element) => element.querySelector('[dir]') === null),
  ).toBe(true);
  expect(await clip.textContent()).toBe(
    '\u200ENightly release train for the procurement service: run Q69G5FB0\u200E',
  );
});
