import { expect, test } from '@playwright/test';

import { catalog, kerfCatalog, webAwesomeCatalog } from '../../ux-demo/catalog.js';

test('loads the Web Awesome specimen bundle only when a matching route needs it', async ({ page }) => {
  await page.goto('/?component=lucide-icon');
  await expect(page.locator('[data-demo="lucide-icon"]')).toBeVisible();
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('webawesome-demos-')))).toBe(false);

  await page.locator('[data-action="toggle-webawesome-catalog"]').click();
  await page.locator('[data-item-id="wa-button"]').click();
  await expect(page.locator('[data-demo="wa-button"]')).toBeVisible();
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('webawesome-demos-')))).toBe(true);

  await page.goto('/?component=wa-input');
  await expect(page.locator('[data-demo="wa-input"]')).toBeVisible();
  await expect(page.locator('[data-item-id="wa-input"]')).toHaveAttribute('aria-current', 'page');
});

test('loads component-reachable package CSS through browser subpaths', async ({ page }) => {
  await page.goto('/?component=toolbar');
  await expect(page.locator('[data-component="toolbar"]').first()).toHaveCSS('display', 'grid');
  expect(await page.locator(':root').evaluate((root) => window.getComputedStyle(root).getPropertyValue('--kui-color-text').trim())).not.toBe('');

  await page.goto('/?component=empty-state');
  await expect(page.locator('[data-component="empty-state"]').first()).toHaveCSS('display', 'grid');
  await expect(page.locator('[data-component="empty-state"] .kui-loading-spinner')).toHaveCSS('display', 'block');
});

test('applies one semantic layout owner across responsive and 200% zoom layouts', async ({ page, browserName }) => {
  const cases = [
    { name: 'wide', width: 1440, height: 900, rootFontSize: '', expected: { page: 32, pane: 16, surface: 16, dialog: 24 } },
    { name: 'intermediate', width: 900, height: 900, rootFontSize: '', expected: { page: 32, pane: 16, surface: 16, dialog: 24 } },
    { name: 'narrow', width: 390, height: 844, rootFontSize: '', expected: { page: 16, pane: 12, surface: 12, dialog: 16 } },
    { name: 'zoom-200', width: 720, height: 900, rootFontSize: '200%', expected: { page: 32, pane: 24, surface: 24, dialog: 32 } },
  ] as const;

  for (const layout of cases) {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto('/?component=headers');
    if (layout.rootFontSize) await page.locator('html').evaluate((element, size) => { element.style.fontSize = size; }, layout.rootFontSize);
    if (layout.name === 'intermediate' || layout.name === 'zoom-200') await page.locator('[data-action="toggle-theme"]').click();

    const geometry = await page.evaluate(() => {
      const number = (selector: string, property: string) => parseFloat(window.getComputedStyle(document.querySelector(selector)!).getPropertyValue(property));
      const sidebar = document.querySelector<HTMLElement>('.catalog-sidebar')!;
      return {
        page: number('.catalog-detail', 'padding-left'),
        surface: number('.catalog-stage', 'padding-left'),
        pane: number('.catalog-canvas', 'padding-left'),
        dialog: number('.demo-dialog__body', 'padding-left'),
        scrollOwners: document.querySelectorAll('.catalog-sidebar.kui-scroll-owner').length,
        sidebarOverflow: window.getComputedStyle(sidebar).overflowY,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(geometry).toMatchObject({ ...layout.expected, scrollOwners: 1, sidebarOverflow: 'auto' });
    expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);

    if (browserName === 'chromium') await page.screenshot({ path: `test-results/layout-${layout.name}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=headers');
  await page.locator('.kui-layout').evaluate((element) => element.classList.add('kui-layout--compact'));
  await expect.poll(() => page.locator('.catalog-detail').evaluate((element) => parseFloat(window.getComputedStyle(element).paddingLeft))).toBe(16);
  await expect.poll(() => page.locator('.catalog-canvas').evaluate((element) => parseFloat(window.getComputedStyle(element).paddingLeft))).toBe(12);
  await expect(page.locator('.catalog-stage')).toHaveClass(/kui-surface-body/);
  await expect(page.locator('.catalog-stage')).not.toHaveClass(/kui-pane-body|kui-dialog-body/);
});

test('routes the generated application-layout composition at wide and narrow sizes', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=layout');
  const demo = page.locator('[data-demo="layout"]');
  await expect(demo).toBeVisible();
  await expect(page.locator('[data-item-id="layout"]')).toHaveAttribute('aria-current', 'page');
  const wideGutter = Number.parseFloat(await demo.evaluate((element) => window.getComputedStyle(element).paddingInlineStart));
  await demo.getByRole('button', { name: 'Primary action' }).click();
  await expect(page.locator('.catalog-log')).toHaveText('Add action requested');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/component-catalog-layout-wide.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const narrowGutter = Number.parseFloat(await demo.evaluate((element) => window.getComputedStyle(element).paddingInlineStart));
  expect(narrowGutter).toBeLessThan(wideGutter);
  await expect(demo.getByRole('button', { name: 'Secondary action' })).toBeVisible();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/component-catalog-layout-narrow.png', fullPage: true });
});

test('edits, removes, and clears controlled token search content', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=token-search-field');
  const demo = page.locator('[data-demo="token-search-field"]');
  const editor = demo.getByRole('searchbox', { name: 'Search tickets' });
  await expect(editor).toBeFocused();
  await expect(editor.locator('[data-component="token-search-token"]')).toHaveCount(2);
  const disabled = demo.getByRole('searchbox', { name: 'Saved search' });
  await expect(disabled).toHaveAttribute('contenteditable', 'false');
  await expect(disabled.locator('button')).toHaveCount(2);
  await expect(disabled.locator('button').first()).toBeDisabled();
  await expect(disabled.locator('button').last()).toBeDisabled();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/token-search-field-light-wide.png', fullPage: true });

  await demo.getByRole('button', { name: 'Remove client tag' }).click();
  await expect(editor.locator('[data-component="token-search-token"]')).toHaveCount(1);
  await demo.getByRole('button', { name: 'Edit is:active' }).click();
  await expect(editor).toContainText('is:active');
  await expect(editor.locator('[data-component="token-search-token"]')).toHaveCount(0);
  await editor.press('End');
  await editor.pressSequentially(' owner');
  await expect(demo.locator('output')).toContainText('owner');

  await demo.getByRole('button', { name: 'Clear search' }).first().click();
  await expect(editor).toHaveText('');
  await expect(editor).toHaveAttribute('data-placeholder', 'Search');

  await page.reload();
  await page.locator('[data-action="toggle-theme"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/token-search-field-dark-narrow.png', fullPage: true });
});

test('themes representative free Web Awesome families with overridable semantic tokens', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/?component=webawesome-theme');
  const demo = page.locator('[data-demo="webawesome-theme"]');
  await expect(demo).toBeVisible();
  await expect(demo.locator(':scope > section')).toHaveCount(5);

  const registered = await page.evaluate(() => [
    'wa-button', 'wa-input', 'wa-checkbox', 'wa-card', 'wa-accordion', 'wa-tab-group',
    'wa-tree', 'wa-callout', 'wa-progress-bar', 'wa-tag', 'wa-avatar', 'wa-qr-code',
  ].every((tag) => Boolean(customElements.get(tag))));
  expect(registered).toBe(true);

  const theme = await demo.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      family: style.getPropertyValue('--wa-font-family-body').trim(),
      brand: style.getPropertyValue('--wa-color-brand-fill-loud').trim(),
      border: style.getPropertyValue('--wa-form-control-border-color').trim(),
    };
  });
  expect(theme.family).toContain('ui-sans-serif');
  expect(theme.brand).toBe('light-dark(#0088ff, #64d2ff)');
  expect(theme.border).toBe('light-dark(#d1d1d6, #48484a)');

  const primary = demo.locator('wa-button[variant="brand"]').first().locator('[part~="button"]');
  await expect(primary).toHaveCSS('background-color', 'rgb(0, 136, 255)');
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(primary).toHaveCSS('background-color', 'rgb(100, 210, 255)');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 17, 19)');

  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/webawesome-theme-dark-wide.png', fullPage: true });

  await demo.evaluate((element) => element.style.setProperty('--wa-color-brand-fill-loud', '#7540a8'));
  await expect(primary).toHaveCSS('background-color', 'rgb(117, 64, 168)');
  await demo.evaluate((element) => element.style.removeProperty('--wa-color-brand-fill-loud'));

  if (browserName === 'chromium') {
    await page.locator('[data-action="toggle-theme"]').click();
    await page.screenshot({ path: 'test-results/webawesome-theme-light-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/webawesome-theme-light-narrow.png', fullPage: true });
  }
});

test('renders and operates representative focused Web Awesome specimens', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Screenshot review is captured once in Chromium.');
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [route, filename] of [
    ['wa-known-date', 'webawesome-form-wide.png'],
    ['wa-page', 'webawesome-layout-wide.png'],
    ['wa-carousel', 'webawesome-media-wide.png'],
    ['wa-popup', 'webawesome-helper-wide.png'],
  ] as const) {
    await page.goto(`/?component=${route}`);
    await expect(page.locator(`[data-demo="${route}"]`)).toBeVisible();
    await expect.poll(() => page.locator(`[data-item-id="${route}"]`).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= -1 && rect.bottom <= window.innerHeight + 1;
    })).toBe(true);
    await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
  }

  await page.goto('/?component=wa-dialog');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.locator('#catalog-wa-dialog')).toHaveAttribute('open', '');
  await page.screenshot({ path: 'test-results/webawesome-dialog-open-wide.png', fullPage: true });
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('#catalog-wa-dialog')).not.toHaveAttribute('open', '');

  await page.goto('/?component=wa-toast-item');
  const toastItem = page.locator('[data-demo="wa-toast-item"] wa-toast-item');
  await expect(toastItem).toBeVisible();
  expect((await toastItem.boundingBox())?.height).toBeGreaterThan(40);

  await page.goto('/?component=wa-animated-image');
  const animatedImage = page.locator('[data-demo="wa-animated-image"] wa-animated-image');
  await expect(animatedImage).toHaveAttribute('src', /\/assets\/animated-image-demo-[^/]+\.gif$/);
  await expect.poll(() => animatedImage.evaluate((element) => (
    element.shadowRoot?.querySelector<HTMLImageElement>('img.frozen')?.naturalWidth ?? 0
  ))).toBeGreaterThan(0);
  expect((await animatedImage.boundingBox())?.height).toBeGreaterThan(200);

  await page.goto('/?component=wa-comparison');
  const comparisonHeights = await page.locator('[data-demo="wa-comparison"] wa-comparison > [slot]').evaluateAll(
    (elements) => elements.map((element) => element.getBoundingClientRect().height),
  );
  expect(comparisonHeights).toEqual([240, 240]);

  await page.goto('/?component=wa-known-date');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/webawesome-form-narrow.png', fullPage: true });
});

test('distinguishes pill status badges from rounded-rectangle tags', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=wa-badge');
  const badges = page.locator('[data-demo="wa-badge"] wa-badge');
  await expect(badges).toHaveCount(5);
  await expect(badges.first()).toHaveAttribute('pill', '');
  const badgeRadius = await badges.first().evaluate((element) => window.getComputedStyle(element).borderRadius);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/webawesome-badge-wide.png', fullPage: true });

  await page.goto('/?component=wa-tag');
  const tags = page.locator('[data-demo="wa-tag"] wa-tag');
  await expect(tags).toHaveCount(4);
  await expect(tags.first()).not.toHaveAttribute('pill');
  expect(await tags.last().evaluate((element) => element.hasAttribute('with-remove'))).toBe(true);
  const tagRadius = await tags.first().evaluate((element) => window.getComputedStyle(element).borderRadius);
  expect(parseFloat(badgeRadius)).toBeGreaterThan(parseFloat(tagRadius));

  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/webawesome-tag-wide.png', fullPage: true });
});

test('labels the Markdown specimen as trusted static client content', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=wa-markdown');
  const demo = page.locator('[data-demo="wa-markdown"]');
  await expect(demo.getByText('Trusted static Markdown · client-rendered')).toBeVisible();
  await expect(demo.getByText('Do not pass unsanitized or untrusted Markdown')).toBeVisible();
  await expect(demo.locator('wa-markdown h2')).toHaveText('Release ready');

  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/webawesome-markdown-trusted-wide.png', fullPage: true });
});

test('themes Tooltip and Popover as arrowless surfaces with public overrides', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=wa-tooltip');
  const tooltip = page.locator('[data-demo="wa-tooltip"] wa-tooltip');
  const tooltipTarget = page.locator('#catalog-tooltip-target');
  await Promise.all([
    tooltip.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('wa-after-show', () => resolve(), { once: true }))),
    tooltipTarget.hover(),
  ]);
  await expect(tooltip).toHaveAttribute('open', '');
  const tooltipArrow = await tooltip.evaluate((element) => {
    const popup = element.shadowRoot?.querySelector('wa-popup');
    const arrow = popup?.shadowRoot?.querySelector<HTMLElement>('[part~="arrow"]');
    const rect = arrow?.getBoundingClientRect();
    return {
      token: window.getComputedStyle(element).getPropertyValue('--wa-tooltip-arrow-size').trim(),
      width: rect?.width ?? -1,
      height: rect?.height ?? -1,
    };
  });
  expect(tooltipArrow.token).toBe('0px');
  expect(tooltipArrow.width).toBeLessThanOrEqual(2.1);
  expect(tooltipArrow.height).toBeLessThanOrEqual(2.1);
  if (browserName === 'chromium') {
    await page.screenshot({ path: 'test-results/webawesome-tooltip-no-arrow-light-wide.png', fullPage: true });
    await page.locator('[data-action="toggle-theme"]').click();
    await Promise.all([
      tooltip.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('wa-after-show', () => resolve(), { once: true }))),
      tooltipTarget.hover(),
    ]);
    await page.screenshot({ path: 'test-results/webawesome-tooltip-no-arrow-dark-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#catalog-tooltip-target').hover();
    await page.screenshot({ path: 'test-results/webawesome-tooltip-no-arrow-dark-narrow.png', fullPage: true });
  }

  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=wa-popover');
  const popover = page.locator('[data-demo="wa-popover"] wa-popover');
  const popoverTarget = page.locator('#catalog-popover-target');
  await Promise.all([
    popover.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('wa-after-show', () => resolve(), { once: true }))),
    popoverTarget.click(),
  ]);
  await expect(popover).toHaveAttribute('open', '');
  const popoverArrow = await popover.evaluate((element) => {
    const popup = element.shadowRoot?.querySelector('wa-popup');
    const arrow = popup?.shadowRoot?.querySelector<HTMLElement>('[part~="arrow"]');
    const rect = arrow?.getBoundingClientRect();
    return {
      token: window.getComputedStyle(element).getPropertyValue('--arrow-size').trim(),
      width: rect?.width ?? -1,
      height: rect?.height ?? -1,
    };
  });
  expect(popoverArrow.token).toBe('0px');
  expect(popoverArrow.width).toBeLessThanOrEqual(2.1);
  expect(popoverArrow.height).toBeLessThanOrEqual(2.1);
  if (browserName === 'chromium') {
    await page.screenshot({ path: 'test-results/webawesome-popover-no-arrow-light-wide.png', fullPage: true });
    await page.locator('[data-action="toggle-theme"]').click();
    await Promise.all([
      popover.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('wa-after-show', () => resolve(), { once: true }))),
      popoverTarget.click(),
    ]);
    await page.screenshot({ path: 'test-results/webawesome-popover-no-arrow-dark-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/webawesome-popover-no-arrow-dark-narrow.png', fullPage: true });
  }
});

test('toast specimen creates a visible transient notification', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=wa-toast');
  await page.getByRole('button', { name: 'Show toast' }).click();
  const createdToast = page.locator('#catalog-wa-toast wa-toast-item');
  await expect(createdToast).toContainText('The component catalog is ready.');
  await expect(createdToast).toBeVisible();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/webawesome-toast-open-wide.png', fullPage: true });
});

test('carousel theme uses compact arrows and seven-pixel visible page dots', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=wa-carousel');
  const geometry = await page.locator('[data-demo="wa-carousel"] wa-carousel').evaluate((element) => {
    const navigation = element.shadowRoot?.querySelector<HTMLElement>('[part~="navigation-button"]');
    const dot = element.shadowRoot?.querySelector<HTMLElement>('[part~="pagination-item"]');
    const activeDot = element.shadowRoot?.querySelector<HTMLElement>('[part~="pagination-item-active"]');
    if (!navigation || !dot || !activeDot) return null;
    const navigationStyle = window.getComputedStyle(navigation);
    const dotStyle = window.getComputedStyle(dot);
    const activeDotStyle = window.getComputedStyle(activeDot);
    return {
      navigationWidth: navigationStyle.width,
      navigationHeight: navigationStyle.height,
      navigationFontSize: navigationStyle.fontSize,
      dotWidth: dotStyle.width,
      dotHeight: dotStyle.height,
      dotImage: dotStyle.backgroundImage,
      activeTransform: activeDotStyle.transform,
      token: window.getComputedStyle(element).getPropertyValue('--kui-wa-carousel-dot-size').trim(),
    };
  });
  expect(geometry).toMatchObject({ navigationWidth: '28px', navigationHeight: '28px', navigationFontSize: '16px', dotWidth: '20px', dotHeight: '20px', activeTransform: 'none', token: '7px' });
  expect(geometry?.dotImage).toContain('radial-gradient');
  if (browserName === 'chromium') {
    await page.screenshot({ path: 'test-results/webawesome-carousel-compact-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/webawesome-carousel-compact-narrow.png', fullPage: true });
  }
});

test('disclosure and breadcrumb chevrons match the Kerf Select scale', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const specimens = [
    { route: 'wa-accordion', selector: 'wa-accordion-item', part: '[part~="icon"]', filename: 'webawesome-accordion-chevron-wide.png' },
    { route: 'wa-details', selector: 'wa-details', part: '[part~="icon"]', filename: 'webawesome-details-chevron-wide.png' },
    { route: 'wa-breadcrumb', selector: 'wa-breadcrumb-item', part: '[part~="separator"]', filename: 'webawesome-breadcrumb-chevron-wide.png' },
  ] as const;

  for (const specimen of specimens) {
    await page.goto(`/?component=${specimen.route}`);
    const geometry = await page.locator(`[data-demo="${specimen.route}"] ${specimen.selector}`).first().evaluate((element, part) => {
      const icon = element.shadowRoot?.querySelector<HTMLElement>(part);
      return icon ? { transform: window.getComputedStyle(icon).transform, token: window.getComputedStyle(element).getPropertyValue('--kui-disclosure-icon-scale').trim() } : null;
    }, specimen.part);
    expect(geometry?.token).toBe('.5');
    expect(geometry?.transform).toMatch(/^matrix\(0\.5, 0, 0, 0\.5,/);
    if (browserName === 'chromium') await page.screenshot({ path: `test-results/${specimen.filename}`, fullPage: true });
  }

  await page.goto('/?component=select');
  const selectTransform = await page.locator('[data-demo="select"] wa-select').evaluate((element) => {
    const icon = element.shadowRoot?.querySelector<HTMLElement>('[part~="expand-icon"]');
    return icon ? window.getComputedStyle(icon).transform : '';
  });
  expect(selectTransform).toMatch(/^matrix\(0\.5, 0, 0, 0\.5,/);
});

test('preserves Select option icons across Kerf rerenders and replaces selected content by value', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const demo = page.locator('[data-demo="select"]');
  const select = demo.locator('[name="rendering-balance"]');
  const optionIcons = select.locator('wa-option .kui-select__icon');
  await expect(optionIcons).toHaveCount(3);
  await expect(select.locator('.kui-select__custom-selected [data-lucide="sliders-horizontal"]')).toBeVisible();
  await expect(select.locator('.kui-select__custom-selected')).toHaveAttribute('data-key', 'rendering-balance:balanced:custom-selected');
  await optionIcons.evaluateAll((icons) => icons.forEach((icon, index) => { icon.setAttribute('data-browser-identity', String(index)); }));

  await page.locator('[data-action="toggle-theme"]').click();
  await expect(optionIcons).toHaveCount(3);
  await expect(optionIcons.nth(0)).toHaveAttribute('data-browser-identity', '0');
  await expect(optionIcons.nth(1)).toHaveAttribute('data-browser-identity', '1');
  await expect(optionIcons.nth(2)).toHaveAttribute('data-browser-identity', '2');
  await expect(select.locator('wa-option[value="quiet"] [data-lucide="bell"]')).toBeAttached();
  await expect(select.locator('wa-option[value="balanced"] [data-lucide="sliders-horizontal"]')).toBeAttached();
  await expect(select.locator('wa-option[value="explicit"] [data-lucide="wrench"]')).toBeAttached();

  await select.evaluate((element) => {
    const control = element as HTMLElement & { value: string };
    control.value = 'explicit';
    control.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  });
  await expect(page.locator('[data-select-value]')).toHaveText('explicit');
  await expect(select.locator('.kui-select__custom-selected')).toHaveAttribute('data-key', 'rendering-balance:explicit:custom-selected');
  await expect(select.locator('.kui-select__custom-selected [data-lucide="wrench"]')).toBeVisible();
  await expect(optionIcons.nth(0)).toHaveAttribute('data-browser-identity', '0');
  await expect(optionIcons.nth(1)).toHaveAttribute('data-browser-identity', '1');
  await expect(optionIcons.nth(2)).toHaveAttribute('data-browser-identity', '2');

  await Promise.all([
    select.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('wa-after-show', () => resolve(), { once: true }))),
    select.click(),
  ]);
  await expect(select.locator('wa-option[value="explicit"]')).toBeVisible();
  if (browserName === 'chromium') {
    await page.screenshot({ path: 'test-results/select-icon-slots-wide.png' });
    await Promise.all([
      select.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('wa-after-hide', () => resolve(), { once: true }))),
      page.keyboard.press('Escape'),
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await demo.scrollIntoViewIfNeeded();
    await Promise.all([
      select.evaluate((element) => new Promise<void>((resolve) => element.addEventListener('wa-after-show', () => resolve(), { once: true }))),
      select.click(),
    ]);
    await expect(select.locator('wa-option[value="explicit"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/select-icon-slots-narrow.png' });
  }
});

test('animation specimen exposes settings, transport, lifecycle, and reduced-motion behavior', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=wa-animation');
  const demo = page.locator('[data-animation-demo]');
  const animation = demo.locator('wa-animation');
  const output = demo.locator('[data-animation-output]');

  await demo.locator('[name="animation-preset"]').evaluate((element) => {
    (element as HTMLElement & { value: string }).value = 'shakeX';
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  });
  await demo.locator('[name="animation-duration"]').fill('1000');
  await demo.locator('[name="animation-rate"]').fill('1.5');
  await expect(animation).toHaveJSProperty('name', 'shakeX');
  await expect(animation).toHaveJSProperty('duration', 1000);
  await expect(animation).toHaveJSProperty('playbackRate', 1.5);

  await demo.getByRole('button', { name: 'Play' }).click();
  await expect(output).toContainText('Playing shakeX');
  await demo.getByRole('button', { name: 'Pause' }).click();
  await expect(output).toHaveText('Paused');
  await demo.getByRole('button', { name: 'Play' }).click();
  await demo.getByRole('button', { name: 'Finish' }).click();
  await expect(output).toHaveText('Finished');
  await demo.getByRole('button', { name: 'Play' }).click();
  await demo.getByRole('button', { name: 'Cancel' }).click();
  await expect(output).toHaveText('Canceled');

  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/webawesome-animation-settings-wide.png', fullPage: true });

  await page.getByRole('button', { name: 'Reduce motion' }).click();
  await page.locator('[data-animation-demo]').getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('[data-animation-output]')).toHaveText('Playback suppressed by reduced-motion preference');

  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/webawesome-animation-settings-narrow.png', fullPage: true });
  }
});

test('observer specimens expose visible, user-driven events', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=wa-intersection-observer');
  const intersection = page.locator('[data-observer-demo="intersection"]');
  await intersection.getByRole('button', { name: 'Reveal target' }).click();
  await expect(intersection.locator('[data-observer-output]')).toContainText('Target visible');
  await expect(intersection.locator('[data-observer-target]')).toHaveClass(/is-intersecting/);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/webawesome-intersection-observer-wide.png', fullPage: true });

  await page.goto('/?component=wa-mutation-observer');
  const mutation = page.locator('[data-observer-demo="mutation"]');
  await mutation.getByRole('button', { name: 'Mutate target' }).click();
  await expect(mutation.locator('[data-observer-target]')).toHaveAttribute('data-revision', '1');
  await expect(mutation.locator('[data-observer-output]')).toContainText(/Observed [1-9]\d* mutation/);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/webawesome-mutation-observer-wide.png', fullPage: true });

  await page.goto('/?component=wa-resize-observer');
  const resize = page.locator('[data-observer-demo="resize"]');
  const target = resize.locator('[data-observer-target]');
  const before = (await target.boundingBox())?.width ?? 0;
  await resize.getByRole('button', { name: 'Resize target' }).click();
  await expect.poll(async () => (await target.boundingBox())?.width ?? 0).toBeGreaterThan(before);
  await expect(resize.locator('[data-observer-output]')).toContainText('Observed width');
  if (browserName === 'chromium') {
    await page.screenshot({ path: 'test-results/webawesome-resize-observer-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/webawesome-resize-observer-narrow.png', fullPage: true });
  }
});

test('catalog routes every production component family and supports its stateful controls', async ({ page, browserName }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.locator('.catalog-sidebar [data-component="menu-header"]')).toHaveCount(6);
  await expect(page.locator('.catalog-sidebar [data-component="menu-item"]')).toHaveCount(kerfCatalog.length);
  const ecosystemToggle = page.getByRole('button', { name: `Web Awesome (${webAwesomeCatalog.length})` });
  await expect(ecosystemToggle).toHaveAttribute('aria-expanded', 'false');
  await ecosystemToggle.click();
  await expect(ecosystemToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.catalog-sidebar [data-component="menu-item"]')).toHaveCount(catalog.length);
  await expect(page.locator('[data-webawesome-catalog] h3')).toHaveText(['Actions', 'Forms', 'Layout', 'Navigation', 'Feedback', 'Media', 'Helpers']);
  await ecosystemToggle.click();
  await expect(page.locator('[data-webawesome-catalog]')).toHaveCount(0);
  await expect(page.locator('[data-demo="lucide-icon"]')).toBeVisible();
  for (const entry of catalog) {
    await page.goto(`/?component=${entry.id}`);
    await expect(page.locator(`[data-demo="${entry.id}"]`)).toBeVisible();
    if (entry.source === 'webawesome') {
      await expect(page.locator(entry.id).first()).toBeAttached();
      await expect(page.locator('[data-webawesome-catalog]')).toBeVisible();
    }
  }

  await page.locator('.catalog-sidebar [data-item-id="menu"]').click();
  await expect(page).toHaveURL(/component=menu/);
  await expect(page.locator('[data-demo="menu"]')).toBeVisible();
  await expect(page.locator('.catalog-sidebar [data-item-id="menu"]')).toHaveAttribute('aria-current', 'page');
  const menuRelationships = page.locator('[data-relationships-for="menu"]');
  await expect(menuRelationships.locator('[name="related-component"]')).toHaveCount(1);
  await expect(page.getByText('Related components', { exact: true })).toHaveCount(1);
  await menuRelationships.locator('[name="related-component"]').click();
  await expect(page.getByRole('group', { name: 'Uses' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('[name="related-component"]').evaluate((element) => {
    const select = element as HTMLElement & { value: string };
    select.value = 'menu-item';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page).toHaveURL(/component=menu-item/);
  await expect(page.locator('[data-demo="menu-item"]')).toBeVisible();
  await page.locator('[name="related-component"]').click();
  await expect(page.getByRole('group', { name: 'Used by' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/?component=resize');
  await expect(page.locator('[data-relationships-for="resize"]')).toHaveCount(0);

  const themeButton = page.locator('[data-action="toggle-theme"]');
  await themeButton.click();
  await expect(themeButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await page.locator('[data-action="toggle-contrast"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-contrast/);
  await page.locator('[data-action="toggle-motion"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-reduced-motion/);

  await page.locator('.catalog-sidebar [data-item-id="tabs"]').click();
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').click();
  await expect(page.locator('[data-action="select-tab"][data-tab-id="guidelines"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('Backspace');
  await expect(page.locator('.catalog-log')).toHaveText('Close requested for guidelines');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('ArrowRight');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="catalog"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="catalog"]').press('Home');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="library"]')).toHaveAttribute('aria-selected', 'true');

  await page.locator('.catalog-sidebar [data-item-id="feedback"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await page.locator('[data-action="cycle-tone"]').click();
  await expect(page.locator('[data-component="state-banner"]')).toHaveAttribute('data-tone', 'danger');
  await expect(page.locator('[data-component="state-banner"]')).toHaveAttribute('role', 'alert');

  await page.goto('/?component=resize');
  const handle = page.locator('[data-kui-resize-handle]');
  await handle.focus();
  await handle.press('ArrowRight');
  await expect(page.locator('[data-region-size]')).toHaveText('292px');
  await handle.press('End');
  await expect(page.locator('[data-region-size]')).toHaveText('420px');

  await page.goto('/?component=select');
  await page.locator('[name="rendering-balance"]').evaluate((element) => {
    const select = element as HTMLElement & { value: string };
    select.value = 'explicit';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('[data-select-value]')).toHaveText('explicit');

  if (browserName === 'chromium') {
    await page.goto('/?component=wa-button');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: 'test-results/webawesome-catalog-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/webawesome-catalog-narrow.png', fullPage: true });
    await page.goto('/?component=select');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('[data-demo="select"]').screenshot({ path: 'test-results/web-awesome-select-wide.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/web-awesome-select-narrow.png', fullPage: true });
    await page.goto('/?component=toolbar');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({ path: 'test-results/ux-demo-wide.png', fullPage: true });
    await page.locator('[data-action="toggle-theme"]').click();
    await page.screenshot({ path: 'test-results/ux-demo-dark.png', fullPage: true });
    await page.goto('/?component=toolbar');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/ux-demo-narrow.png', fullPage: true });
  }
});

test('matches Hot Sheet menu and toolbar control geometry', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=menu');
  const menu = page.locator('[data-demo="menu"]');
  const sidebarAlignment = () => menu.evaluate((node) => {
    const action = node.querySelector<HTMLElement>('.kui-menu-header button')!.getBoundingClientRect();
    const row = node.querySelector<HTMLElement>('[data-item-id="projects"]')!.getBoundingClientRect();
    const rowLabel = node.querySelector<HTMLElement>('[data-item-id="projects"] .kui-menu-item__label')!.getBoundingClientRect();
    const iconlessLabel = node.querySelector<HTMLElement>('[data-item-id="drafts"] .kui-menu-item__label')!.getBoundingClientRect();
    const sectionLabel = node.querySelector<HTMLElement>('.kui-sidebar-section .kui-menu-header h2')!.getBoundingClientRect();
    const surface = node.querySelector<HTMLElement>('[data-sidebar-surface]')!.getBoundingClientRect();
    const surfaceLabel = node.querySelector<HTMLElement>('[data-sidebar-surface] strong')!.getBoundingClientRect();
    const plus = node.querySelector<HTMLElement>('.kui-menu-header [data-lucide="plus"]')!.getBoundingClientRect();
    const disclosure = node.querySelector<HTMLElement>('[data-item-id="projects"] [data-lucide="chevron-right"]')!.getBoundingClientRect();
    return {
      rightEdge: Math.abs(action.right - row.right),
      iconCenter: Math.abs((plus.left + plus.width / 2) - (disclosure.left + disclosure.width / 2)),
      iconlessLabelColumn: Math.abs(iconlessLabel.left - rowLabel.left),
      headerLabelColumn: Math.abs(sectionLabel.left - rowLabel.left),
      surfaceLabelColumn: Math.abs(surfaceLabel.left - rowLabel.left),
      surfaceGutter: Math.abs(surface.left - row.left),
    };
  });
  const expectSidebarAlignment = (alignment: Awaited<ReturnType<typeof sidebarAlignment>>) => {
    expect(alignment.rightEdge).toBeLessThanOrEqual(1);
    expect(alignment.iconCenter).toBeLessThanOrEqual(1);
    expect(alignment.iconlessLabelColumn).toBeLessThanOrEqual(1);
    expect(alignment.headerLabelColumn).toBeLessThanOrEqual(1);
    expect(alignment.surfaceLabelColumn).toBeLessThanOrEqual(1);
    expect(alignment.surfaceGutter).toBeLessThanOrEqual(1);
  };
  expectSidebarAlignment(await sidebarAlignment());
  if (browserName === 'chromium') {
    await menu.screenshot({ path: 'test-results/sidebar-content-alignment-wide.png' });
    await page.locator('[data-relationships-for="menu"]').screenshot({ path: 'test-results/related-components-selector-wide.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    expectSidebarAlignment(await sidebarAlignment());
    await menu.screenshot({ path: 'test-results/sidebar-content-alignment-narrow.png' });
    await page.locator('[data-relationships-for="menu"]').screenshot({ path: 'test-results/related-components-selector-narrow.png' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await page.goto('/?component=toolbar-control-group');
  const demo = page.getByRole('region', { name: 'ToolbarControlGroup demo' });
  await expect(demo.getByRole('heading', { level: 3 })).toHaveText([
    'Segmented choices', 'Popup menu', 'Button group', 'Single button', 'Borderless group',
    'Push button, resting', 'Push button, pressed', 'Dark group',
  ]);
  const groups = demo.locator('[data-component="toolbar-control-group"]');
  await expect(groups).toHaveCount(8);
  const heights = await groups.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(new Set(heights).size).toBe(1);
  await demo.getByRole('button', { name: 'Columns view' }).click();
  await expect(demo.getByRole('button', { name: 'Columns view' })).toHaveAttribute('aria-pressed', 'true');
  await expect(demo.getByRole('button', { name: 'Columns view' })).toHaveCSS('color', 'rgb(30, 110, 244)');
  await demo.locator('wa-button[aria-label="Sort tickets"]').click();
  await expect(demo.getByText('Recently updated', { exact: true })).toBeVisible();
  await demo.getByText('Priority', { exact: true }).click();
  await expect(page.locator('.catalog-log')).toHaveText('Sorted by priority');
  await expect(demo.getByRole('button', { name: 'Pressed comparison' }).locator('..')).toHaveCSS('background-color', 'rgb(72, 72, 74)');
  await expect(demo.getByRole('group', { name: 'Dark navigation' })).toHaveCSS('border-color', 'rgb(53, 53, 54)');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/toolbar-control-groups-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(groups).toHaveCount(8);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/toolbar-control-groups-narrow.png', fullPage: true });
});

test('renders the Hot Sheet split treatment on ResizableRegion', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=resize');
  const region = page.locator('[data-component="resizable-region"]');
  const handle = region.locator('[data-kui-resize-handle]');
  const grip = handle.locator('svg');
  const separator = await handle.evaluate((element) => {
    const style = window.getComputedStyle(element, '::before');
    return { width: style.width, background: style.backgroundColor };
  });
  expect(separator).toEqual({ width: '1px', background: 'rgb(209, 209, 214)' });
  await expect(grip).toHaveCSS('opacity', '0');
  await handle.hover();
  await expect(grip).toHaveCSS('opacity', '1');

  await region.evaluate((element) => element.style.setProperty('--kui-resizable-region-separator-color', '#7540a8'));
  await expect.poll(() => handle.evaluate((element) => window.getComputedStyle(element, '::before').backgroundColor)).toBe('rgb(117, 64, 168)');
  await region.evaluate((element) => element.style.removeProperty('--kui-resizable-region-separator-color'));
  if (browserName === 'chromium') {
    await handle.hover();
    await page.screenshot({ path: 'test-results/resizable-region-separator-light-wide.png', fullPage: true });
    await page.locator('[data-action="toggle-theme"]').click();
    await handle.hover();
    await page.screenshot({ path: 'test-results/resizable-region-separator-dark-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await handle.hover();
    await page.screenshot({ path: 'test-results/resizable-region-separator-dark-narrow.png', fullPage: true });
  }
});

test('communicates preferred Kerf patterns on ecosystem alternatives', async ({ page, browserName }) => {
  for (const [route, description] of [
    ['wa-popup', 'Preferred low-level anchored positioning when Tooltip or Popover do not fit.'],
    ['wa-split-panel', 'Alternative split API; prefer Kerf ResizableRegion for application panes.'],
    ['wa-icon', 'Ecosystem icon renderer; use Kerf LucideIcon in application UI.'],
    ['wa-zoomable-frame', 'Avoid for application UI; keep embedded-media behavior application-owned.'],
  ] as const) {
    await page.goto(`/?component=${route}`);
    await expect(page.locator('.catalog-header').getByText(description, { exact: true })).toBeVisible();
  }

  if (browserName === 'chromium') {
    await page.goto('/?component=wa-split-panel');
    await page.screenshot({ path: 'test-results/webawesome-selection-guidance-wide.png', fullPage: true });
  }
});

test('renders controlled toolbar, rounded, and pill SegmentedControl variants', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=segmented-control');
  const demo = page.getByRole('region', { name: 'SegmentedControl variants' });
  const controls = demo.locator('[data-component="segmented-control"]');
  await expect(controls).toHaveCount(3);
  await expect(demo.getByRole('heading', { level: 3 })).toHaveText(['Toolbar', 'Rounded rectangle', 'Pill']);

  const toolbar = demo.locator('[data-segmented-control-id="standalone-toolbar-view"]');
  const rounded = demo.locator('[data-segmented-control-id="inspector-section"]');
  const pill = demo.locator('[data-segmented-control-id="display-density"]');
  await expect(toolbar).toHaveAttribute('data-appearance', 'toolbar');
  await expect(toolbar).toHaveAttribute('data-shape', 'pill');
  await expect(rounded).toHaveAttribute('data-layout', 'equal');
  await expect(pill).toHaveAttribute('data-appearance', 'outlined');
  await expect(pill).toHaveAttribute('data-shape', 'pill');
  await expect(demo.getByRole('button', { name: 'Roomy' })).toBeDisabled();

  const radii = await Promise.all([rounded, pill].map((control) => control.evaluate((node) => parseFloat(window.getComputedStyle(node).borderRadius))));
  expect(radii[0]).toBeLessThan(20);
  expect(radii[1]).toBeGreaterThan(100);
  const widths = await rounded.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().width));
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);

  const summary = rounded.getByRole('button', { name: 'Summary' });
  const activity = rounded.getByRole('button', { name: 'Activity' });
  await rounded.evaluate((node) => {
    node.style.setProperty('--kui-segmented-selected-background', '#7540a8');
    node.style.setProperty('--kui-segmented-selected-foreground', '#ffffff');
  });
  await expect(summary).toHaveCSS('background-color', 'rgb(117, 64, 168)');
  await expect(summary).toHaveCSS('color', 'rgb(255, 255, 255)');
  await rounded.evaluate((node) => {
    node.style.removeProperty('--kui-segmented-selected-background');
    node.style.removeProperty('--kui-segmented-selected-foreground');
  });

  await activity.click();
  await expect(activity).toHaveAttribute('aria-pressed', 'true');
  await expect(summary).toHaveAttribute('aria-pressed', 'false');
  await expect(rounded).toHaveAttribute('data-value', 'activity');
  await expect(page.locator('.catalog-log')).toHaveText('Selected activity');
  await summary.focus();
  await page.keyboard.press('Tab');
  await expect(activity).toBeFocused();
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(summary).toHaveAttribute('aria-pressed', 'true');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/segmented-control-wide.png', fullPage: true });

  await page.locator('[data-action="toggle-theme"]').click();
  await expect(summary).toHaveCSS('background-color', 'rgb(28, 28, 30)');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/segmented-control-dark-wide.png', fullPage: true });
  await page.locator('[data-action="toggle-theme"]').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(controls.last()).toBeVisible();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/segmented-control-narrow.png', fullPage: true });
});

test('ships semantic banner palettes with scoped overrides', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=state-banner');
  const banners = page.locator('[data-demo="state-banner"] [data-component="state-banner"]');
  await expect(banners).toHaveCount(6);
  const styles = await banners.evaluateAll((nodes) => nodes.map((node) => {
    const style = window.getComputedStyle(node);
    return { tone: node.getAttribute('data-tone'), color: style.color, background: style.backgroundColor, border: style.borderColor };
  }));
  expect(styles.slice(0, 5).map(({ color }) => color)).toEqual([
    'rgb(29, 29, 31)', 'rgb(30, 110, 244)', 'rgb(0, 137, 50)', 'rgb(161, 106, 0)', 'rgb(194, 11, 32)',
  ]);
  expect(new Set(styles.slice(0, 5).map(({ background }) => background)).size).toBe(5);
  expect(new Set(styles.slice(0, 5).map(({ border }) => border)).size).toBe(5);
  expect(styles[5]!.color).toBe('rgb(109, 63, 156)');
  expect(styles[1]!.color).toBe('rgb(30, 110, 244)');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/state-banner-palettes-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(banners.last()).toBeVisible();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/state-banner-palettes-narrow.png', fullPage: true });
});

test('reorders and horizontally scrolls controlled TabBars', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-component="tab-bar"]');
  const strip = bar.locator('[data-kui-tab-list]');
  await expect(bar.getByRole('tab')).toHaveCount(7);
  expect(await strip.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  const integration = bar.getByRole('tab', { name: 'Integration patterns' });
  await integration.click();
  await expect(integration).toHaveAttribute('aria-selected', 'true');
  await integration.press('Alt+Shift+ArrowRight');
  await expect(page.locator('[data-tab-order]')).toContainText('Release notes · Integration patterns');
  await expect(bar.getByRole('tab', { name: 'Integration patterns' })).toBeFocused();
  await bar.getByRole('button', { name: 'Add tab' }).click();
  await expect(bar.getByRole('tab')).toHaveCount(8);
  const added = bar.getByRole('tab', { name: 'New tab 8' });
  await expect(added).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await added.press('Backspace');
  await expect(bar.getByRole('tab')).toHaveCount(7);
  const source = bar.locator('.kui-app-tab[data-tab-id="components"]');
  const target = bar.locator('.kui-app-tab[data-tab-id="design-guidance"]');
  await strip.evaluate((node) => { node.scrollLeft = 0; });
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBe(0);
  await source.dragTo(target, { targetPosition: { x: 100, y: 16 } });
  await expect(page.locator('[data-tab-order]')).toContainText('Design guidance · Components');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/tab-bar-overflow-wide.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await strip.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/tab-bar-overflow-narrow.png', fullPage: true });
});

test('autoscrolls the TabBar while a dragged tab rests near either scroll edge', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=tab-bar');
  const frame = page.locator('.demo-tab-bar-frame');
  const bar = frame.locator('[data-component="tab-bar"]');
  const strip = bar.locator('[data-kui-tab-list]');
  const source = bar.locator('.kui-app-tab').first();
  const stripBounds = await strip.boundingBox();
  expect(stripBounds).not.toBeNull();
  await source.dispatchEvent('dragstart');
  await strip.dispatchEvent('dragover', { clientX: stripBounds!.x + stripBounds!.width - 3, clientY: stripBounds!.y + stripBounds!.height / 2 });
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBeGreaterThan(24);
  if (browserName === 'chromium') await frame.screenshot({ path: 'test-results/tab-bar-edge-autoscroll-end.png' });
  await source.dispatchEvent('dragend');
  await expect(bar.locator('[data-tab-autoscroll]')).toHaveCount(0);

  const startScroll = await strip.evaluate((node) => {
    node.scrollLeft = node.scrollWidth - node.clientWidth;
    return node.scrollLeft;
  });
  await source.dispatchEvent('dragstart');
  await strip.dispatchEvent('dragover', { clientX: stripBounds!.x + 3, clientY: stripBounds!.y + stripBounds!.height / 2 });
  await expect.poll(() => strip.evaluate((node) => node.scrollLeft)).toBeLessThan(startScroll - 24);
  if (browserName === 'chromium') await frame.screenshot({ path: 'test-results/tab-bar-edge-autoscroll-start.png' });
  await source.dispatchEvent('dragend');
  await expect(bar.locator('[data-tab-autoscroll]')).toHaveCount(0);
});
