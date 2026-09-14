import { expect, test } from '@playwright/test';

import { catalog, catalogRepositoryHref, catalogSections, kerfCatalog, webAwesomeCatalog } from '../../ux-demo/catalog.js';

test('links catalog details to their first-party source and existing guidance', async ({ page, browserName }) => {
  for (const [id, name, sourcePath, componentPath, documentationPath, guidanceLabel] of [
    ['toolbar', 'Toolbar', 'ui/ux-demo/main.tsx', 'ui/src/toolbar.tsx', 'ui/docs/component-selection.md', 'Read guidance'],
    ['recipe-app-shell', 'Desktop application shell', 'ui/ux-demo/recipes/app-shell.tsx', undefined, 'ui/docs/recipes.md#desktop-application-shell', 'Read guidance'],
    ['wa-button', 'Button', 'ui/ux-demo/webawesome-demos.tsx', undefined, 'ui/docs/webawesome-theme.md#coverage', 'Read Kerf integration guidance'],
  ] as const) {
    await page.goto(`/?component=${id}`);
    const resources = page.getByRole('navigation', { name: `Reference links for ${name}` });
    const source = resources.getByRole('link', { name: `${name}: View demo source (opens in new tab)` });
    const componentSource = resources.locator('[data-catalog-resource="component-source"]');
    const guidance = resources.getByRole('link', { name: `${name}: ${guidanceLabel} (opens in new tab)` });
    await expect(source).toHaveAttribute('href', catalogRepositoryHref(sourcePath));
    await expect(guidance).toHaveAttribute('href', catalogRepositoryHref(documentationPath));
    const links = componentPath ? [source, componentSource, guidance] : [source, guidance];
    for (const link of links) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    if (componentPath) {
      await expect(componentSource).toHaveAttribute('href', catalogRepositoryHref(componentPath));
      await expect(componentSource.locator('code')).toHaveText(componentPath);
    } else {
      await expect(componentSource).toHaveCount(0);
    }
    await expect(source.locator('code')).toHaveText(sourcePath);
    await expect(guidance.locator('code')).toHaveText(documentationPath);
  }

  for (const layout of [
    { name: 'wide', width: 1440, height: 900, rootFontSize: '' },
    { name: 'narrow', width: 390, height: 844, rootFontSize: '' },
    { name: 'zoom-200', width: 720, height: 900, rootFontSize: '200%' },
  ] as const) {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto(`/?component=${layout.name === 'zoom-200' ? 'recipe-master-detail-dialog' : 'toolbar'}`);
    if (layout.rootFontSize) await page.locator('html').evaluate((element, size) => { element.style.fontSize = size; }, layout.rootFontSize);
    const resources = page.getByRole('navigation', { name: `Reference links for ${layout.name === 'zoom-200' ? 'Master-detail dialog' : 'Toolbar'}` });
    const source = resources.locator('[data-catalog-resource="source"]');
    const guidance = resources.locator('[data-catalog-resource="guidance"]');
    await expect(resources).toBeVisible();
    await source.focus();
    await expect(source).toBeFocused();
    const geometry = await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      links: [...document.querySelectorAll<HTMLElement>('.catalog-resource')].map((link) => ({
        height: link.getBoundingClientRect().height,
        right: link.getBoundingClientRect().right,
        viewportWidth: window.innerWidth,
        pathOverflow: link.querySelector<HTMLElement>('code')!.scrollWidth - link.querySelector<HTMLElement>('code')!.clientWidth,
        outlineStyle: window.getComputedStyle(link).outlineStyle,
      })),
    }));
    expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
    expect(geometry.links).toHaveLength(layout.name === 'zoom-200' ? 2 : 3);
    for (const link of geometry.links) {
      expect(link.height).toBeGreaterThanOrEqual(44);
      expect(link.right).toBeLessThanOrEqual(link.viewportWidth + 1);
      expect(link.pathOverflow).toBeLessThanOrEqual(1);
    }
    expect(geometry.links[0].outlineStyle).not.toBe('none');
    await expect(guidance).toBeVisible();
    if (browserName === 'chromium') {
      await page.screenshot({ path: `test-results/catalog-resource-links-${layout.name}.png`, fullPage: true });
    }
  }
});

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

test('sizes and rotates the first-class disclosure arrow while Select keeps its independent half scale', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=disclosure-arrow');
  const demo = page.locator('[data-demo="disclosure-arrow"]');
  const button = demo.getByRole('button');
  const arrow = button.locator('[data-component="disclosure-arrow"]');
  const arrowSize = () => arrow.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height };
  });

  await expect(arrow).toHaveAttribute('data-open', 'false');
  await expect(arrow).toHaveAttribute('data-direction', 'right');
  await expect(arrow).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  expect(await arrowSize()).toEqual({ width: 18, height: 18 });
  if (browserName === 'chromium') await button.screenshot({ path: 'test-results/disclosure-arrow-default-18px.png' });

  await arrow.evaluate((element) => { (element as HTMLElement).style.setProperty('--kui-disclosure-arrow-size', '2rem'); });
  expect(await arrowSize()).toEqual({ width: 32, height: 32 });
  await arrow.evaluate((element) => { (element as HTMLElement).style.removeProperty('--kui-disclosure-arrow-size'); });
  expect(await arrowSize()).toEqual({ width: 18, height: 18 });

  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(arrow).toHaveAttribute('data-open', 'true');
  await expect(arrow).toHaveAttribute('data-direction', 'down');
  await expect.poll(async () => arrow.evaluate((element) => window.getComputedStyle(element).transform)).toBe('matrix(0, 1, -1, 0, 0, 0)');
  await expect(demo.locator('[data-lucide="arrow-down-a-z"]')).toBeVisible();
  if (browserName === 'chromium') await button.screenshot({ path: 'test-results/disclosure-arrow-open.png' });

  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(async () => arrow.evaluate((element) => window.getComputedStyle(element).transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.locator('html').evaluate((element) => { element.style.fontSize = '200%'; });
  expect(await arrowSize()).toEqual({ width: 36, height: 36 });
  if (browserName === 'chromium') await button.screenshot({ path: 'test-results/disclosure-arrow-default-zoom-200.png' });

  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=select');
  const select = page.locator('[data-demo="select"] wa-select').first();
  const selectDisclosure = () => select.evaluate((element) => {
    const icon = element.shadowRoot?.querySelector<HTMLElement>('[part~="expand-icon"]');
    const bounds = icon?.getBoundingClientRect();
    return icon ? {
      height: bounds!.height,
      transform: window.getComputedStyle(icon).transform,
      token: window.getComputedStyle(element).getPropertyValue('--kui-disclosure-icon-scale').trim(),
      width: bounds!.width,
    } : null;
  });
  const selectDisclosureAt100 = await selectDisclosure();
  expect(selectDisclosureAt100?.token).toBe('0.5');
  expect(selectDisclosureAt100?.transform).toMatch(/^matrix\(0\.5, 0, 0, 0\.5,/);
  expect(selectDisclosureAt100?.width).toBeCloseTo(10, 4);
  expect(selectDisclosureAt100?.height).toBeCloseTo(8, 4);

  await page.locator('html').evaluate((element) => { element.style.fontSize = '200%'; });
  const selectDisclosureAt200 = await selectDisclosure();
  expect(selectDisclosureAt200?.token).toBe('0.5');
  expect(selectDisclosureAt200?.transform).toMatch(/^matrix\(0\.5, 0, 0, 0\.5,/);
  expect(selectDisclosureAt200?.width).toBeCloseTo(selectDisclosureAt100!.width * 2, 4);
  expect(selectDisclosureAt200?.height).toBeCloseTo(selectDisclosureAt100!.height * 2, 4);
  if (browserName === 'chromium') await select.screenshot({ path: 'test-results/select-disclosure-half-scale-zoom-200.png' });
});

test('applies shared pane and content-item geometry across responsive and 200% zoom layouts', async ({ page, browserName }) => {
  const cases = [
    { name: 'wide', width: 1440, height: 900, rootFontSize: '', scale: 1 },
    { name: 'intermediate', width: 900, height: 900, rootFontSize: '', scale: 1 },
    { name: 'narrow', width: 390, height: 844, rootFontSize: '', scale: 1 },
    { name: 'zoom-200', width: 720, height: 900, rootFontSize: '200%', scale: 2 },
  ] as const;

  for (const layout of cases) {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto('/?component=layout');
    if (layout.rootFontSize) await page.locator('html').evaluate((element, size) => { element.style.fontSize = size; }, layout.rootFontSize);
    if (layout.name === 'intermediate' || layout.name === 'zoom-200') await page.locator('[data-action="toggle-theme"]').click();

    const geometry = await page.evaluate(() => {
      const number = (selector: string, property: string) => parseFloat(window.getComputedStyle(document.querySelector(selector)!).getPropertyValue(property));
      return {
        panePadding: number('.demo-layout', 'padding-left'),
        contentGap: number('.demo-layout .kui-content', 'row-gap'),
        itemMargin: number('.demo-layout .kui-content-item', 'margin-left'),
        itemPadding: number('.demo-layout .kui-content-item', 'padding-left'),
        itemBorder: number('.demo-layout .kui-content-item', 'border-left-width'),
        itemRadius: number('.demo-layout .kui-content-item', 'border-top-left-radius'),
        scrollOwners: document.querySelectorAll('.catalog-sidebar .kui-pane__content').length,
        sidebarOverflow: window.getComputedStyle(document.querySelector<HTMLElement>('.catalog-sidebar .kui-pane__content')!).overflowY,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(geometry).toMatchObject({ panePadding: 0, contentGap: 24 * layout.scale, itemMargin: 8 * layout.scale, itemPadding: 8 * layout.scale, itemBorder: 1, itemRadius: 1 + 11 * layout.scale, scrollOwners: 1, sidebarOverflow: 'auto' });
    expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
    await expect(page.locator('.catalog-group__items [data-component="menu-item"]').first()).toHaveAttribute('data-multiline', 'true');

    if (browserName === 'chromium') await page.screenshot({ path: `test-results/layout-${layout.name}.png`, fullPage: true });
  }
  await expect(page.locator('.demo-layout')).toHaveClass(/kui-pane/);
  await expect(page.locator('.demo-layout .kui-pane__content')).toHaveClass(/kui-content/);
});

test('routes the generated application-layout composition at wide and narrow sizes', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=layout');
  const demo = page.locator('[data-demo="layout"]');
  await expect(demo).toBeVisible();
  await expect(page.locator('[data-item-id="layout"]')).toHaveAttribute('aria-current', 'page');
  const wideGap = Number.parseFloat(await demo.locator('.kui-content').evaluate((element) => window.getComputedStyle(element).rowGap));
  await demo.getByRole('button', { name: 'Primary action' }).click();
  await expect(page.locator('.catalog-log')).toHaveText('Add action requested');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/component-catalog-layout-wide.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const narrowGap = Number.parseFloat(await demo.locator('.kui-content').evaluate((element) => window.getComputedStyle(element).rowGap));
  expect(narrowGap).toBe(wideGap);
  await expect(demo.getByRole('button', { name: 'Secondary action' })).toBeVisible();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/component-catalog-layout-narrow.png', fullPage: true });
});

test('keeps the header-composition dialog on the shared inline gutter', async ({ page, browserName }) => {
  const cases = [
    { name: 'wide', width: 1440, height: 900, rootFontSize: '', direction: 'ltr', scale: 1 },
    { name: 'narrow', width: 390, height: 844, rootFontSize: '', direction: 'ltr', scale: 1 },
    { name: 'rtl', width: 1100, height: 760, rootFontSize: '', direction: 'rtl', scale: 1 },
    { name: 'zoom-200', width: 720, height: 900, rootFontSize: '200%', direction: 'ltr', scale: 2 },
  ] as const;

  for (const layout of cases) {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto('/?component=headers');
    await page.locator('html').evaluate((element, settings) => {
      (element as HTMLElement).dir = settings.direction;
      element.style.fontSize = settings.rootFontSize;
    }, layout);

    const geometry = await page.locator('[data-demo="headers"]').evaluate((demo) => {
      const frame = demo.getBoundingClientRect();
      const pageHeader = demo.querySelector<HTMLElement>('[data-component="page-header"]')!;
      const dialog = demo.querySelector<HTMLElement>('.demo-dialog')!;
      const pageHeaderRect = pageHeader.getBoundingClientRect();
      const dialogRect = dialog.getBoundingClientRect();
      const dialogStyle = window.getComputedStyle(dialog);
      return {
        frameLeft: frame.left,
        frameRight: frame.right,
        pageHeaderLeft: pageHeaderRect.left,
        pageHeaderRight: pageHeaderRect.right,
        dialogLeft: dialogRect.left,
        dialogRight: dialogRect.right,
        marginBlockStart: Number.parseFloat(dialogStyle.marginBlockStart),
        marginBlockEnd: Number.parseFloat(dialogStyle.marginBlockEnd),
        marginInlineStart: Number.parseFloat(dialogStyle.marginInlineStart),
        marginInlineEnd: Number.parseFloat(dialogStyle.marginInlineEnd),
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(geometry).toMatchObject({
      marginBlockStart: 16 * layout.scale,
      marginBlockEnd: 16 * layout.scale,
      marginInlineStart: 8 * layout.scale,
      marginInlineEnd: 8 * layout.scale,
    });
    expect(Math.abs(geometry.dialogLeft - geometry.pageHeaderLeft)).toBeLessThan(0.1);
    expect(Math.abs(geometry.dialogRight - geometry.pageHeaderRight)).toBeLessThan(0.1);
    expect(geometry.dialogLeft).toBeGreaterThanOrEqual(geometry.frameLeft);
    expect(geometry.dialogRight).toBeLessThanOrEqual(geometry.frameRight);
    expect(geometry.documentOverflow).toBeLessThanOrEqual(1);

    if (browserName === 'chromium') {
      await page.screenshot({ path: `test-results/header-composition-${layout.name}.png`, fullPage: true });
      if (layout.name === 'wide') {
        await page.locator('[data-demo="headers"]').screenshot({ path: 'test-results/header-composition-reference-after.png' });
      }
    }
  }
});

test('aligns ValueTable separators with icon-bearing and iconless row content', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=value-table');
  const demo = page.locator('[data-demo="value-table"]');
  const rows = demo.locator('.kui-value-table__row');
  await expect(rows).toHaveCount(3);

  const geometry = await rows.evaluateAll((elements) => elements.slice(1).map((element) => {
    const row = element as HTMLElement;
    const rowRect = row.getBoundingClientRect();
    const separator = window.getComputedStyle(row, '::before');
    const icon = row.querySelector<HTMLElement>('.kui-value-table__icon');
    const label = row.querySelector<HTMLElement>('.kui-value-table__label')!;
    return {
      hasIcon: row.dataset.hasIcon,
      separatorLeft: Number.parseFloat(separator.left),
      separatorRight: Number.parseFloat(separator.right),
      iconWidth: icon?.getBoundingClientRect().width ?? 0,
      labelInset: label.getBoundingClientRect().left - rowRect.left,
    };
  }));

  expect(geometry).toEqual([
    { hasIcon: 'true', separatorLeft: 40, separatorRight: 8, iconWidth: 24, labelInset: 40 },
    { hasIcon: 'false', separatorLeft: 8, separatorRight: 8, iconWidth: 0, labelInset: 8 },
  ]);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/value-table-separator-insets.png', fullPage: true });
});

test('keeps token-search focus and caret when Delete removes a controlled token', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=token-search-field');
  const demo = page.locator('[data-demo="token-search-field"]');
  const editor = demo.getByRole('searchbox', { name: 'Search tickets' });
  await editor.evaluate((element) => {
    const text = element.querySelector('[data-token-search-text]')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 4);
    range.collapse(true);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    (element as HTMLElement).focus();
  });

  await page.keyboard.press('Delete');

  await expect(editor).toBeFocused();
  await expect(editor.locator('[data-component="token-search-token"]')).toHaveCount(1);
  await expect(editor.locator('[data-component="token-search-token"][data-token-value="tag:client"]')).toHaveCount(0);
  await expect(editor.locator('[data-component="token-search-token"][data-token-value="is:active"]')).toHaveCount(1);
  expect(await editor.evaluate((element) => {
    const selection = document.getSelection()!;
    const caret = selection.getRangeAt(0);
    const prefix = document.createRange();
    prefix.selectNodeContents(element);
    prefix.setEnd(caret.startContainer, caret.startOffset);
    const clone = document.createElement('div');
    clone.append(prefix.cloneContents());
    clone.querySelectorAll('[data-component="token-search-token"]').forEach((token) => token.remove());
    return (clone.textContent ?? '').replaceAll('\u200b', '').length;
  })).toBe(4);
  await page.keyboard.type('owner ');
  await expect(editor).toContainText('NOT owner is:active AND parser');
  await expect(demo.locator('output')).toContainText('1 filters · NOT owner  AND parser');
  if (browserName === 'chromium') await demo.locator('article').first().screenshot({ path: 'test-results/token-search-field-delete-caret.png' });
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
  const tokenGeometry = await editor.evaluate((element) => {
    const token = element.querySelector<HTMLElement>('[data-component="token-search-token"]')!;
    const text = element.querySelector<HTMLElement>('[data-token-search-text]')!;
    const tokenRect = token.getBoundingClientRect();
    const textRange = document.createRange();
    textRange.selectNodeContents(text);
    const textRect = textRange.getBoundingClientRect();
    return {
      editorLineHeight: Number.parseFloat(window.getComputedStyle(element).lineHeight),
      tokenHeight: tokenRect.height,
      centerDelta: Math.abs((tokenRect.top + tokenRect.height / 2) - (textRect.top + textRect.height / 2)),
    };
  });
  expect(tokenGeometry.tokenHeight).toBeLessThanOrEqual(tokenGeometry.editorLineHeight);
  expect(tokenGeometry.centerDelta).toBeLessThan(2);
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

  await editor.pressSequentially('hello');
  const alignment = () => demo.locator('[data-component="token-search-field"]').first().evaluate((field) => {
    const fieldRect = field.getBoundingClientRect();
    const leadingRect = field.querySelector<HTMLElement>('.kui-token-search__leading')!.getBoundingClientRect();
    const editorElement = field.querySelector<HTMLElement>('.kui-token-search__editor')!;
    const editorRect = editorElement.getBoundingClientRect();
    const editorStyle = window.getComputedStyle(editorElement);
    const clearRect = field.querySelector<HTMLElement>('.kui-token-search__clear')!.getBoundingClientRect();
    return {
      height: fieldRect.height,
      leadingCenter: leadingRect.top + leadingRect.height / 2 - fieldRect.top,
      firstLineCenter: editorRect.top + parseFloat(editorStyle.paddingBlockStart) + parseFloat(editorStyle.lineHeight) / 2 - fieldRect.top,
      clearCenter: clearRect.top + clearRect.height / 2 - fieldRect.top,
    };
  });
  const singleLine = await alignment();
  expect(singleLine.height).toBe(44);
  expect(Math.abs(singleLine.leadingCenter - singleLine.height / 2)).toBeLessThan(0.1);
  expect(Math.abs(singleLine.firstLineCenter - singleLine.height / 2)).toBeLessThan(0.1);
  expect(Math.abs(singleLine.clearCenter - singleLine.height / 2)).toBeLessThan(0.1);
  await page.mouse.move(0, 0);
  if (browserName === 'chromium') await demo.locator('article').first().screenshot({ path: 'test-results/token-search-field-alignment-single-line-wide.png' });

  await editor.pressSequentially(' across a deliberately long second line that proves the first-line controls stay pinned while editable content wraps naturally through the available width');
  const multiline = await alignment();
  expect(multiline.height).toBeGreaterThan(singleLine.height);
  expect(multiline.leadingCenter).toBeCloseTo(singleLine.leadingCenter, 1);
  expect(multiline.firstLineCenter).toBeCloseTo(singleLine.firstLineCenter, 1);
  expect(multiline.clearCenter).toBeCloseTo(singleLine.clearCenter, 1);
  if (browserName === 'chromium') await demo.locator('article').first().screenshot({ path: 'test-results/token-search-field-alignment-multiline-wide.png' });

  await page.reload();
  await page.locator('[data-action="toggle-theme"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/token-search-field-dark-narrow.png', fullPage: true });
});

test('renders an interactive responsive find field inside a toolbar', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=toolbar');
  const toolbar = page.locator('.demo-toolbar-find-row');
  const editor = toolbar.getByRole('searchbox', { name: 'Find in workspace' });
  const trigger = toolbar.getByRole('button', { name: 'Open find' });
  const field = toolbar.locator('.demo-toolbar-find-field');
  const group = toolbar.locator('.demo-toolbar-find');
  const outsideControl = page.locator('[data-action="toggle-theme"]');
  await expect(editor).toBeHidden();
  await expect(trigger).toBeVisible();
  await expect(field).toHaveAttribute('data-collapsible', 'true');
  await expect(field).toHaveAttribute('data-expanded', 'false');
  await expect(group).toHaveCSS('transition-property', 'width, background-color, border-color');
  await expect(group).toHaveCSS('transition-duration', '0.25s, 0.2s, 0.2s');
  const collapsedIconGeometry = await field.evaluate((element) => {
    const fieldRect = element.getBoundingClientRect();
    const iconRect = element.querySelector('svg')!.getBoundingClientRect();
    return { inset: iconRect.left + iconRect.width / 2 - fieldRect.left, center: fieldRect.width / 2 };
  });
  expect(collapsedIconGeometry.inset).toBeCloseTo(collapsedIconGeometry.center, 1);
  await group.evaluate((element) => element.addEventListener('transitionrun', (event) => {
    if ((event as TransitionEvent).propertyName === 'width') element.setAttribute('data-width-transition-seen', 'true');
  }));
  if (browserName === 'chromium') await toolbar.screenshot({ path: 'test-results/toolbar-find-wide-collapsed.png' });

  await trigger.click();
  await expect(group).toHaveAttribute('data-width-transition-seen', 'true');
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(toolbar.locator('.kui-toolbar__leading')).toBeVisible();
  await expect(toolbar.locator('.kui-toolbar__trailing')).toBeVisible();
  await expect(group).toHaveCSS('height', '44px');
  await expect(field).toHaveCSS('height', '40px');
  await expect(field).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(await group.evaluate((element) => window.getComputedStyle(element).boxShadow)).not.toBe('none');
  const expandedIconInset = await field.evaluate((element) => {
    const fieldRect = element.getBoundingClientRect();
    const iconRect = element.querySelector('.kui-token-search__leading svg')!.getBoundingClientRect();
    return iconRect.left + iconRect.width / 2 - fieldRect.left;
  });
  expect(Math.abs(expandedIconInset - collapsedIconGeometry.inset)).toBeLessThan(0.5);
  const trailingCenterBeforeInput = await field.locator('.kui-token-search__trailing').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left + rect.width / 2;
  });
  await editor.pressSequentially('priority');
  await expect(toolbar.getByRole('button', { name: 'Clear search' })).toBeVisible();
  const trailingCenterAfterInput = await field.locator('.kui-token-search__trailing').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left + rect.width / 2;
  });
  expect(Math.abs(trailingCenterAfterInput - trailingCenterBeforeInput)).toBeLessThan(0.5);
  await editor.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Find submitted');
  await expect(editor.locator('br, div')).toHaveCount(0);
  await outsideControl.focus();
  await expect(editor).toBeVisible();
  await expect(trigger).toBeHidden();
  if (browserName === 'chromium') await toolbar.screenshot({ path: 'test-results/toolbar-find-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(editor).toBeVisible();
  await expect(toolbar.locator('.kui-toolbar__leading')).toBeHidden();
  await expect(toolbar.locator('.kui-toolbar__trailing')).toBeHidden();
  await toolbar.getByRole('button', { name: 'Clear search' }).click();
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await outsideControl.focus();
  await expect(editor).toBeHidden();
  await expect(trigger).toBeVisible();
  if (browserName === 'chromium') await toolbar.screenshot({ path: 'test-results/toolbar-find-narrow-collapsed.png' });

  await trigger.click();
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(toolbar.locator('.kui-toolbar__leading')).toBeHidden();
  await expect(toolbar.locator('.kui-toolbar__trailing')).toBeHidden();
  if (browserName === 'chromium') await toolbar.screenshot({ path: 'test-results/toolbar-find-narrow-open.png' });
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
  const selectGeometry = await select.evaluate((element) => {
    const combobox = element.shadowRoot?.querySelector<HTMLElement>('[part~="combobox"]')?.getBoundingClientRect();
    const arrow = element.shadowRoot?.querySelector<HTMLElement>('[part~="expand-icon"]')?.getBoundingClientRect();
    const selected = element.querySelector<HTMLElement>('.kui-select__custom-selected')?.getBoundingClientRect();
    return combobox && arrow && selected ? {
      arrowTrailingInset: combobox.right - arrow.right,
      selectedToArrowGap: arrow.left - selected.right,
    } : null;
  });
  expect(selectGeometry?.arrowTrailingInset).toBeLessThan(16);
  expect(selectGeometry?.selectedToArrowGap).toBeGreaterThan(100);
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
  await expect(page.locator('.catalog-sidebar [data-component="menu-header"]')).toHaveCount(catalogSections.length + 1);
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
    const stableRouteMarker = entry.kind === 'recipe' ? 'data-recipe' : 'data-demo';
    await expect(page.locator(`[${stableRouteMarker}="${entry.id}"]`)).toBeVisible();
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
  const resizeRelationships = page.locator('[data-relationships-for="resize"]');
  await expect(resizeRelationships.locator('[name="related-component"]')).toHaveCount(1);
  await resizeRelationships.locator('[name="related-component"]').click();
  await expect(page.getByRole('group', { name: 'Used by' })).toContainText('Desktop application shell');
  await page.keyboard.press('Escape');

  const themeButton = page.locator('[data-action="toggle-theme"]');
  await themeButton.click();
  await expect(themeButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/demo-dark/);
  await page.locator('[data-action="toggle-contrast"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-contrast/);
  await page.locator('[data-action="toggle-motion"]').click();
  await expect(page.locator('html')).toHaveClass(/demo-reduced-motion/);

  await page.locator('.catalog-sidebar [data-item-id="tabs"]').click();
  await expect(page.locator('[data-demo="tabs"] > [data-component="tab-bar"]')).toHaveAttribute('data-tab-bar-id', 'focused-app-tabs');
  await expect(page.locator('[data-demo="tabs"] [data-kui-tab-list]')).toHaveAttribute('aria-label', 'Open documents');
  const guidelinesRoot = page.locator('[data-demo="tabs"] .kui-app-tab[data-tab-id="guidelines"]');
  await expect(guidelinesRoot).toHaveAttribute('data-demo-tab-source', 'workspace');
  await expect(guidelinesRoot).not.toHaveAttribute('data-action');
  await expect(guidelinesRoot).not.toHaveAttribute('role');
  await expect(guidelinesRoot.locator('.kui-app-tab__close [data-lucide="custom-tab-close"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(guidelinesRoot.locator('.kui-app-tab__close-icon')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').click();
  await expect(page.locator('[data-action="select-tab"][data-tab-id="guidelines"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('Backspace');
  await expect(page.locator('.catalog-log')).toHaveText('Close requested for guidelines');
  await page.locator('[data-action="select-tab"][data-tab-id="guidelines"]').press('ArrowRight');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="catalog"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-action="select-tab"][data-tab-id="catalog"]').press('Home');
  await expect(page.locator('[data-action="select-tab"][data-tab-id="library"]')).toHaveAttribute('aria-selected', 'true');
  if (browserName === 'chromium') await page.locator('[data-demo="tabs"]').screenshot({ path: 'test-results/app-tab-shared-tab-bar.png' });

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

test('preserves menu extension metadata without surrendering native semantics', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=menu-header');
  const headerDemo = page.locator('[data-demo="menu-header"]');
  await expect(headerDemo.locator('[data-demo-section="workspace"]')).toHaveCount(1);
  const popoverTrigger = headerDemo.locator('[data-demo-trigger="workspace-action"]');
  await expect(popoverTrigger).toHaveAttribute('popovertarget', 'menu-header-workspace-popover');
  await expect(popoverTrigger).toHaveAttribute('popovertargetaction', 'toggle');
  await expect(popoverTrigger).toHaveAttribute('aria-controls', 'menu-header-workspace-popover');
  await expect(popoverTrigger).toHaveAttribute('aria-haspopup', 'dialog');
  await popoverTrigger.press('Enter');
  const popover = page.locator('#menu-header-workspace-popover');
  await expect.poll(() => popover.evaluate((element) => element.matches(':popover-open'))).toBe(true);
  await expect(page.locator('.catalog-log')).toHaveText('Add action requested');
  if (browserName === 'chromium') {
    await page.screenshot({ path: 'test-results/menu-header-popover-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await headerDemo.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/menu-header-popover-narrow.png' });
    await page.setViewportSize({ width: 1100, height: 760 });
  }
  await page.keyboard.press('Escape');
  await expect.poll(() => popover.evaluate((element) => element.matches(':popover-open'))).toBe(false);

  const toggle = headerDemo.getByRole('button', { name: 'Tools' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.press('Space');
  await expect(headerDemo.getByRole('button', { name: 'Tools' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.catalog-log')).toHaveText('Disclosure opened');
  const disabled = headerDemo.getByRole('button', { name: 'Unavailable action' });
  await expect(disabled).toBeDisabled();
  expect(await disabled.evaluate((button) => {
    let activations = 0;
    button.addEventListener('click', () => { activations += 1; }, { once: true });
    (button as HTMLButtonElement).click();
    return activations;
  })).toBe(0);
  await expect(page.locator('.catalog-log')).toHaveText('Disclosure opened');
  await expect.poll(() => popover.evaluate((element) => element.matches(':popover-open'))).toBe(false);
  await expect.poll(() => popover.evaluate((element) => window.getComputedStyle(element).display)).toBe('none');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/menu-header-disclosure-disabled-wide.png', fullPage: true });

  await page.goto('/?component=menu-item');
  const row = page.locator('[data-demo="menu-item"] [data-item-id="selected"]');
  await expect(row).toHaveAttribute('data-demo-drop-status', 'ready');
  await expect(row).toHaveAttribute('data-action', 'log-inbox');
  await row.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Inbox selected');
  await row.press('Space');
  await expect(page.locator('.catalog-log')).toHaveText('Inbox selected');
  await row.dispatchEvent('dragover');
  await expect(row).toHaveAttribute('data-demo-drop-status', 'over');
  await expect(page.locator('.catalog-log')).toHaveText('Drop target ready');
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/menu-item-drop-feedback-wide.png', fullPage: true });
  await row.dispatchEvent('drop');
  await expect(page.locator('.catalog-log')).toHaveText('Dropped on selected');
  await expect(row).toHaveAttribute('data-demo-drop-status', 'ready');
  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/menu-item-extension-narrow.png', fullPage: true });
  }
});

test('keeps MenuActionRow primary and trailing controls independent across interaction and layout states', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=menu-action-row');
  const demo = page.locator('[data-demo="menu-action-row"]');
  const selectedRow = demo.locator('[data-demo-action-row="selected"]');
  const primary = selectedRow.getByRole('button', { name: 'Select src/main.ts' });
  const trailing = selectedRow.getByRole('button', { name: 'Actions for src/main.ts' });
  const pressedRow = demo.locator('[data-demo-action-row="multiline"]');
  const pressedPrimary = pressedRow.getByRole('button', { name: 'Select long file' });

  await expect(selectedRow.locator(':scope > button')).toHaveCount(2);
  await expect(selectedRow).not.toHaveAttribute('role');
  await expect(selectedRow).not.toHaveAttribute('data-action');
  await expect(primary).toHaveAttribute('data-action', 'select-menu-action-row');
  await expect(trailing).toHaveAttribute('data-action', 'open-menu-action-row-actions');
  await expect(primary).toHaveAttribute('data-item-id', 'src/main.ts');
  await expect(trailing).toHaveAttribute('data-item-id', 'src/main.ts');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  await expect(selectedRow).not.toHaveAttribute('data-pressed');
  await expect(primary).toHaveAttribute('aria-current', 'page');
  await expect(primary).not.toHaveAttribute('aria-pressed');
  await expect(trailing).not.toHaveAttribute('aria-pressed');
  await expect(pressedRow).toHaveAttribute('data-selected', 'false');
  await expect(pressedRow).toHaveAttribute('data-pressed', 'false');
  await expect(pressedPrimary).not.toHaveAttribute('aria-current');
  await expect(pressedPrimary).toHaveAttribute('aria-pressed', 'false');
  await expect(primary.locator('button, a, [role="button"]')).toHaveCount(0);
  await expect(trailing.locator('button, a, [role="button"]')).toHaveCount(0);

  await primary.focus();
  await expect(primary).toBeFocused();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/menu-action-row-primary-focus-wide.png', fullPage: true });
  expect(await selectedRow.locator(':scope > button').evaluateAll((buttons) => buttons.map((button) => ({ name: button.getAttribute('aria-label'), tabIndex: (button as HTMLButtonElement).tabIndex })))).toEqual([
    { name: 'Select src/main.ts', tabIndex: 0 },
    { name: 'Actions for src/main.ts', tabIndex: 0 },
  ]);
  if (browserName === 'webkit') await trailing.focus();
  else await page.keyboard.press('Tab');
  await expect(trailing).toBeFocused();
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/menu-action-row-trailing-focus-wide.png', fullPage: true });

  await primary.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('src/main.ts selected');
  await primary.press('Space');
  await expect(page.locator('.catalog-log')).toHaveText('src/main.ts selected');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');

  const popover = page.locator('#menu-action-row-popover');
  await trailing.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Actions requested for src/main.ts');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  await expect.poll(() => popover.evaluate((element) => element.matches(':popover-open'))).toBe(true);
  await page.keyboard.press('Escape');
  await trailing.press('Space');
  await expect(page.locator('.catalog-log')).toHaveText('Actions requested for src/main.ts');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  await expect.poll(() => popover.evaluate((element) => element.matches(':popover-open'))).toBe(true);
  await page.keyboard.press('Escape');
  await trailing.click();
  await expect(page.locator('.catalog-log')).toHaveText('Actions requested for src/main.ts');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Escape');

  await trailing.dispatchEvent('dblclick');
  await expect(page.locator('.catalog-log')).toHaveText('Actions requested for src/main.ts');
  await trailing.dispatchEvent('contextmenu');
  await expect(page.locator('.catalog-log')).toHaveText('Actions requested for src/main.ts');
  await primary.dispatchEvent('dblclick');
  await expect(page.locator('.catalog-log')).toHaveText('Double-clicked src/main.ts primary');
  await primary.dispatchEvent('contextmenu');
  await expect(page.locator('.catalog-log')).toHaveText('Context menu for src/main.ts primary');

  await pressedPrimary.click();
  await expect(page.locator('.catalog-log')).toHaveText('long-file pressed');
  await expect(pressedRow).toHaveAttribute('data-pressed', 'true');
  await expect(pressedPrimary).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');
  const pressedTrailing = pressedRow.getByRole('button', { name: 'Actions for long file' });
  await pressedTrailing.click();
  await expect(page.locator('.catalog-log')).toHaveText('Actions requested for long-file');
  await expect(pressedRow).toHaveAttribute('data-pressed', 'true');
  await expect(selectedRow).toHaveAttribute('data-selected', 'true');

  const disabledPrimary = demo.locator('[data-demo-action-row="disabled-primary"]');
  await expect(disabledPrimary.locator('.kui-menu-action-row__primary')).toBeDisabled();
  const availableTrailing = disabledPrimary.getByRole('button', { name: 'Actions for unavailable primary' });
  await expect(availableTrailing).toBeEnabled();
  await availableTrailing.click();
  await expect(page.locator('.catalog-log')).toHaveText('Actions requested for disabled-primary');

  const disabledTrailing = demo.locator('[data-demo-action-row="disabled-trailing"]');
  const availablePrimary = disabledTrailing.getByRole('button', { name: 'Unavailable trailing action' });
  await expect(availablePrimary).toBeEnabled();
  await expect(disabledTrailing.getByRole('button', { name: 'Unavailable actions' })).toBeDisabled();
  await availablePrimary.click();
  await expect(page.locator('.catalog-log')).toHaveText('disabled-trailing selected');
  await expect(disabledTrailing).toHaveAttribute('data-selected', 'true');
  await expect(availablePrimary).toHaveAttribute('aria-current', 'page');
  await expect(pressedRow).toHaveAttribute('data-pressed', 'true');

  await pressedPrimary.click();
  await expect(pressedRow).toHaveAttribute('data-pressed', 'false');
  const resolveMenuActionRowColors = () => pressedRow.evaluate((element) => {
    const resolveBackground = (property: string) => {
      const probe = document.createElement('span');
      probe.style.backgroundColor = `var(${property})`;
      element.append(probe);
      const color = window.getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    return {
      trailingHover: resolveBackground('--kui-menu-action-row-trailing-hover-background'),
      neutralFill: resolveBackground('--kui-color-neutral-fill-normal'),
    };
  });
  const lightColors = await resolveMenuActionRowColors();
  expect(lightColors.trailingHover).toBe(lightColors.neutralFill);
  const themeButton = page.locator('[data-action="toggle-theme"]');
  await themeButton.click();
  const darkColors = await resolveMenuActionRowColors();
  expect(darkColors.trailingHover).toBe(darkColors.neutralFill);
  expect(darkColors.trailingHover).not.toBe(lightColors.trailingHover);
  await pressedTrailing.hover();
  await expect.poll(() => pressedTrailing.evaluate((element) => window.getComputedStyle(element).backgroundColor)).toBe(darkColors.trailingHover);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/menu-action-row-dark-hover-wide.png', fullPage: true });
  await themeButton.click();
  await page.mouse.move(0, 0);

  const geometry = () => demo.evaluate((node) => {
    const row = node.querySelector<HTMLElement>('[data-demo-action-row="selected"]')!;
    const parent = row.parentElement!;
    const primaryControl = row.querySelector<HTMLElement>(':scope > .kui-menu-action-row__primary')!;
    const trailingControl = row.querySelector<HTMLElement>(':scope > .kui-menu-action-row__trailing-action')!;
    const icon = row.querySelector<HTMLElement>('.kui-menu-action-row__icon')!;
    const multilineRow = node.querySelector<HTMLElement>('[data-demo-action-row="multiline"]')!;
    const multilinePrimary = multilineRow.querySelector<HTMLElement>(':scope > .kui-menu-action-row__primary')!;
    const multilineTrailing = multilineRow.querySelector<HTMLElement>(':scope > .kui-menu-action-row__trailing-action')!;
    const longLabel = multilineRow.querySelector<HTMLElement>('.kui-menu-action-row__label')!;
    const rowBox = row.getBoundingClientRect();
    const parentBox = parent.getBoundingClientRect();
    const primaryBox = primaryControl.getBoundingClientRect();
    const trailingBox = trailingControl.getBoundingClientRect();
    const iconBox = icon.getBoundingClientRect();
    const multilineRowBox = multilineRow.getBoundingClientRect();
    const multilinePrimaryBox = multilinePrimary.getBoundingClientRect();
    const multilineTrailingBox = multilineTrailing.getBoundingClientRect();
    const longLabelBox = longLabel.getBoundingClientRect();
    const parentStyle = window.getComputedStyle(parent);
    const direction = window.getComputedStyle(row).direction;
    const parentContentStart = direction === 'rtl'
      ? parentBox.right - parseFloat(parentStyle.borderRightWidth) - parseFloat(parentStyle.paddingRight)
      : parentBox.left + parseFloat(parentStyle.borderLeftWidth) + parseFloat(parentStyle.paddingLeft);
    const rowStart = direction === 'rtl' ? parentContentStart - rowBox.right : rowBox.left - parentContentStart;
    const iconStart = direction === 'rtl' ? rowBox.right - iconBox.right : iconBox.left - rowBox.left;
    const controlsOverlap = Math.max(0, Math.min(primaryBox.right, trailingBox.right) - Math.max(primaryBox.left, trailingBox.left));
    return {
      rowStart,
      iconStart,
      rowHeight: rowBox.height,
      primaryWidth: primaryBox.width,
      primaryHeight: primaryBox.height,
      trailingWidth: trailingBox.width,
      trailingHeight: trailingBox.height,
      controlsOverlap,
      longLabelOverflow: longLabel.scrollWidth - longLabel.clientWidth,
      longLabelVerticalOverflow: longLabel.scrollHeight - longLabel.clientHeight,
      multilinePrimaryVerticalOverflow: multilinePrimary.scrollHeight - multilinePrimary.clientHeight,
      multilineRowVerticalOverflow: multilineRow.scrollHeight - multilineRow.clientHeight,
      longLabelTopInset: longLabelBox.top - multilinePrimaryBox.top,
      longLabelBottomInset: multilinePrimaryBox.bottom - longLabelBox.bottom,
      multilinePrimaryTopInset: multilinePrimaryBox.top - multilineRowBox.top,
      multilinePrimaryBottomInset: multilineRowBox.bottom - multilinePrimaryBox.bottom,
      multilineTrailingTopInset: multilineTrailingBox.top - multilineRowBox.top,
      multilineTrailingBottomInset: multilineRowBox.bottom - multilineTrailingBox.bottom,
      multilineRowHeight: multilineRowBox.height,
      multilinePrimaryHeight: multilinePrimaryBox.height,
      multilineTrailingHeight: multilineTrailingBox.height,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const near = (name: string, actual: number, expected: number) => expect(Math.abs(actual - expected), `${name}: ${actual}`).toBeLessThanOrEqual(1);
  const expectGeometry = (actual: Awaited<ReturnType<typeof geometry>>, scale: number) => {
    near('rowStart', actual.rowStart, 8 * scale);
    near('iconStart', actual.iconStart, 1 + 8 * scale);
    expect(actual.rowHeight).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.primaryWidth).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.primaryHeight).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.trailingWidth).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.trailingHeight).toBeGreaterThanOrEqual(44 * scale);
    expect(actual.controlsOverlap).toBe(0);
    expect(actual.longLabelOverflow).toBeLessThanOrEqual(1);
    expect(actual.longLabelVerticalOverflow).toBeLessThanOrEqual(1);
    expect(actual.multilinePrimaryVerticalOverflow).toBeLessThanOrEqual(1);
    expect(actual.multilineRowVerticalOverflow).toBeLessThanOrEqual(1);
    expect(actual.longLabelTopInset).toBeGreaterThanOrEqual(-1);
    expect(actual.longLabelBottomInset).toBeGreaterThanOrEqual(-1);
    expect(actual.multilinePrimaryTopInset).toBeGreaterThanOrEqual(-1);
    expect(actual.multilinePrimaryBottomInset).toBeGreaterThanOrEqual(-1);
    expect(actual.multilineTrailingTopInset).toBeGreaterThanOrEqual(-1);
    expect(actual.multilineTrailingBottomInset).toBeGreaterThanOrEqual(-1);
    near('multiline primary stretch', actual.multilinePrimaryHeight, actual.multilineRowHeight);
    near('multiline trailing stretch', actual.multilineTrailingHeight, actual.multilineRowHeight);
    expect(actual.horizontalOverflow).toBeLessThanOrEqual(1);
  };

  expectGeometry(await geometry(), 1);
  await demo.evaluate((node) => node.setAttribute('dir', 'rtl'));
  expectGeometry(await geometry(), 1);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/menu-action-row-rtl-wide.png', fullPage: true });
  await demo.evaluate((node) => node.removeAttribute('dir'));

  await page.setViewportSize({ width: 390, height: 844 });
  await demo.scrollIntoViewIfNeeded();
  expectGeometry(await geometry(), 1);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/menu-action-row-narrow.png', fullPage: true });

  await page.setViewportSize({ width: 720, height: 900 });
  await page.locator('html').evaluate((element) => { element.style.fontSize = '200%'; });
  await demo.scrollIntoViewIfNeeded();
  expectGeometry(await geometry(), 2);
  if (browserName === 'chromium') await page.screenshot({ path: 'test-results/menu-action-row-zoom-200.png', fullPage: true });
  if (browserName === 'chromium') {
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(selectedRow).toHaveCSS('outline-style', 'solid');
    await expect(selectedRow).toHaveCSS('outline-width', '1px');
    await page.screenshot({ path: 'test-results/menu-action-row-forced-colors.png', fullPage: true });
    await page.emulateMedia({ forcedColors: 'none' });
  }
});

test('matches shared menu, content-item, and toolbar geometry', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=menu');
  const menu = page.locator('[data-demo="menu"]');
  const paneGeometry = () => menu.evaluate((node) => {
    const content = node.querySelector<HTMLElement>('[data-content-stack]')!.getBoundingClientRect();
    const toolbar = node.querySelector<HTMLElement>('.kui-pane__footer .kui-toolbar')!.getBoundingClientRect();
    const direction = window.getComputedStyle(node).direction;
    const start = (container: DOMRect, item: DOMRect) => direction === 'rtl' ? container.right - item.right : item.left - container.left;
    const end = (container: DOMRect, item: DOMRect) => direction === 'rtl' ? item.left - container.left : container.right - item.right;
    const action = node.querySelector<HTMLElement>('.kui-menu-header button')!.getBoundingClientRect();
    const row = node.querySelector<HTMLElement>('[data-item-id="projects"]')!.getBoundingClientRect();
    const rowLabel = node.querySelector<HTMLElement>('[data-item-id="projects"] .kui-menu-item__label')!.getBoundingClientRect();
    const rowIcon = node.querySelector<HTMLElement>('[data-item-id="projects"] .kui-menu-item__icon')!.getBoundingClientRect();
    const trailing = node.querySelector<HTMLElement>('[data-item-id="projects"] .kui-menu-item__trailing')!.getBoundingClientRect();
    const iconlessLabel = node.querySelector<HTMLElement>('[data-item-id="drafts"] .kui-menu-item__label')!.getBoundingClientRect();
    const sectionLabel = node.querySelector<HTMLElement>('.kui-menu-header h2')!.getBoundingClientRect();
    const surfaceElement = node.querySelector<HTMLElement>('[data-content-item]')!;
    const surface = surfaceElement.getBoundingClientRect();
    const surfaceLabel = node.querySelector<HTMLElement>('[data-content-item] strong')!.getBoundingClientRect();
    const toggleLayer = node.querySelector<HTMLElement>('.kui-menu-header__action-layer')!.getBoundingClientRect();
    const toolbarText = node.querySelector<HTMLElement>('.kui-pane__footer .kui-toolbar-text')!.getBoundingClientRect();
    const toolbarAction = node.querySelector<HTMLElement>('.kui-pane__footer .kui-toolbar__trailing .kui-toolbar-control-group')!.getBoundingClientRect();
    return {
      contentGap: parseFloat(window.getComputedStyle(node.querySelector('[data-content-stack]')!).rowGap),
      rowStart: start(content, row), rowEnd: end(content, row), rowHeight: row.height,
      plainStart: start(content, iconlessLabel), sectionStart: start(content, sectionLabel),
      surfaceStart: start(content, surface), surfaceContentStart: start(content, surfaceLabel), surfacePadding: parseFloat(window.getComputedStyle(surfaceElement).paddingLeft), surfaceBorder: parseFloat(window.getComputedStyle(surfaceElement).borderLeftWidth),
      iconStart: start(content, rowIcon), iconWidth: rowIcon.width, iconLabelStart: start(content, rowLabel),
      trailingEnd: end(content, trailing),
      headerActionEnd: end(content, action), headerActionWidth: action.width, headerActionHeight: action.height,
      toggleLayerWidth: toggleLayer.width, toggleLayerHeight: toggleLayer.height,
      toolbarTextStart: start(toolbar, toolbarText), toolbarActionEnd: end(toolbar, toolbarAction), toolbarActionWidth: toolbarAction.width, toolbarActionHeight: toolbarAction.height,
    };
  });
  const near = (name: string, actual: number, expected: number) => expect(Math.abs(actual - expected), `${name}: ${actual}`).toBeLessThanOrEqual(1);
  const expectPaneGeometry = (geometry: Awaited<ReturnType<typeof paneGeometry>>) => {
    near('contentGap', geometry.contentGap, 24);
    for (const name of ['rowStart', 'rowEnd', 'surfaceStart', 'headerActionEnd', 'toolbarActionEnd'] as const) near(name, geometry[name], 8);
    for (const name of ['plainStart', 'sectionStart', 'surfaceContentStart', 'iconStart', 'trailingEnd'] as const) near(name, geometry[name], 17);
    near('toolbarTextStart', geometry.toolbarTextStart, 10);
    near('iconLabelStart', geometry.iconLabelStart, 49);
    near('iconWidth', geometry.iconWidth, 24);
    near('surfacePadding', geometry.surfacePadding, 8);
    near('surfaceBorder', geometry.surfaceBorder, 1);
    for (const name of ['headerActionWidth', 'headerActionHeight', 'toolbarActionWidth', 'toolbarActionHeight'] as const) near(name, geometry[name], 44);
    near('toggleLayerWidth', geometry.toggleLayerWidth, 24);
    near('toggleLayerHeight', geometry.toggleLayerHeight, 24);
    expect(geometry.rowHeight).toBeGreaterThanOrEqual(44);
  };
  const baseline = await paneGeometry();
  expectPaneGeometry(baseline);
  await menu.locator('[data-item-id="projects"]').hover();
  expect(await paneGeometry()).toEqual(baseline);
  await menu.locator('[data-item-id="drafts"]').focus();
  expect(await paneGeometry()).toEqual(baseline);
  if (browserName === 'chromium') {
    await menu.screenshot({ path: 'test-results/pane-content-geometry-wide.png' });
    await page.locator('[data-relationships-for="menu"]').screenshot({ path: 'test-results/related-components-selector-wide.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    expectPaneGeometry(await paneGeometry());
    await menu.screenshot({ path: 'test-results/pane-content-geometry-narrow.png' });
    await page.locator('[data-relationships-for="menu"]').screenshot({ path: 'test-results/related-components-selector-narrow.png' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await menu.evaluate((node) => node.setAttribute('dir', 'rtl'));
  expectPaneGeometry(await paneGeometry());
  await menu.evaluate((node) => node.removeAttribute('dir'));

  await page.goto('/?component=toolbar-control-group');
  const demo = page.getByRole('region', { name: 'ToolbarControlGroup demo' });
  await expect.poll(() => page.evaluate(() => customElements.get('wa-dropdown') !== undefined)).toBe(true);
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
  const dropdown = demo.locator('wa-dropdown');
  const dropdownItems = dropdown.locator('wa-dropdown-item');
  await expect(dropdown).toHaveAttribute('data-morph-skip-children', '');
  await expect(dropdownItems).toHaveCount(2);
  const originalFirstItem = await dropdownItems.first().elementHandle();
  const originalLastItem = await dropdownItems.last().elementHandle();
  expect(originalFirstItem).not.toBeNull();
  expect(originalLastItem).not.toBeNull();
  await expect(dropdownItems.first()).toBeHidden();
  await demo.locator('wa-button[aria-label="Sort tickets"]').click();
  await expect(dropdownItems.first()).toBeVisible();
  await dropdownItems.filter({ hasText: 'Priority' }).click();
  await expect(page.locator('.catalog-log')).toHaveText('Sorted by priority');
  await expect(dropdownItems.first()).toBeHidden();
  expect(await dropdownItems.first().evaluate((node, original) => node === original, originalFirstItem)).toBe(true);
  expect(await dropdownItems.last().evaluate((node, original) => node === original, originalLastItem)).toBe(true);
  await expect.poll(() => dropdownItems.evaluateAll((items) => items.every((item) => item.shadowRoot !== null))).toBe(true);
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
  const iconLayer = handle.locator('.kui-resizable-region__handle-icon');
  const grip = iconLayer.locator('svg');
  await expect(iconLayer).toHaveAttribute('aria-hidden', 'true');
  await expect(grip).toHaveAttribute('data-lucide', 'custom-resize-handle');
  await expect(grip).toHaveAttribute('aria-hidden', 'true');
  await expect(handle).toHaveAttribute('role', 'separator');
  await expect(handle).toHaveAttribute('aria-label', 'Resize Catalog panel');
  const separator = await handle.evaluate((element) => {
    const style = window.getComputedStyle(element, '::before');
    return { width: style.width, background: style.backgroundColor };
  });
  expect(separator).toEqual({ width: '1px', background: 'rgb(209, 209, 214)' });
  await expect(iconLayer).toHaveCSS('opacity', '0');
  await handle.hover();
  await expect(iconLayer).toHaveCSS('opacity', '1');
  await handle.focus();
  await handle.press('End');
  await expect(page.locator('[data-region-size]')).toHaveText('420px');
  await handle.press('Home');
  await expect(page.locator('[data-region-size]')).toHaveText('180px');
  await handle.press('ArrowRight');
  await expect(page.locator('[data-region-size]')).toHaveText('196px');
  const handleBounds = await handle.boundingBox();
  expect(handleBounds).not.toBeNull();
  await page.mouse.move(handleBounds!.x + handleBounds!.width / 2, handleBounds!.y + handleBounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBounds!.x + handleBounds!.width / 2 + 40, handleBounds!.y + handleBounds!.height / 2);
  await page.mouse.up();
  await expect(page.locator('[data-region-size]')).toHaveText('236px');

  await region.evaluate((element) => element.style.setProperty('--kui-resizable-region-separator-color', '#7540a8'));
  await expect.poll(() => handle.evaluate((element) => window.getComputedStyle(element, '::before').backgroundColor)).toBe('rgb(117, 64, 168)');
  await region.evaluate((element) => element.style.removeProperty('--kui-resizable-region-separator-color'));
  if (browserName === 'chromium') {
    await handle.hover();
    await page.screenshot({ path: 'test-results/resizable-region-custom-handle-light-wide.png', fullPage: true });
    await page.locator('[data-action="toggle-theme"]').click();
    await handle.hover();
    await page.screenshot({ path: 'test-results/resizable-region-custom-handle-dark-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await handle.hover();
    await page.screenshot({ path: 'test-results/resizable-region-custom-handle-dark-narrow.png', fullPage: true });
    await page.setViewportSize({ width: 640, height: 720 });
    await page.locator('html').evaluate((element) => { element.style.fontSize = '200%'; });
    await handle.hover();
    await expect(iconLayer).toHaveCSS('opacity', '1');
    expect(await page.locator('body').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/resizable-region-custom-handle-200-percent.png', fullPage: true });
  }
});

test('keeps AppTab extension metadata and replacement close icons inside the shared tab lifecycle', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=tabs');
  const demo = page.locator('[data-demo="tabs"]');
  const root = demo.locator('.kui-app-tab[data-tab-id="guidelines"]');
  const tab = root.getByRole('tab', { name: 'Guidelines' });
  const close = root.getByRole('button', { name: 'Close Guidelines' });

  await expect(root).toHaveAttribute('data-demo-tab-source', 'workspace');
  await expect(root).toHaveAttribute('data-tab-id', 'guidelines');
  await expect(root).not.toHaveAttribute('data-action');
  await expect(root).not.toHaveAttribute('role');
  await expect(root).not.toHaveAttribute('data-tab-dragging');
  await expect(root).not.toHaveAttribute('data-tab-drop-position');
  await expect(close.locator('[data-lucide="custom-tab-close"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(close.locator('.kui-app-tab__close-icon')).toHaveAttribute('aria-hidden', 'true');

  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await tab.press('ArrowRight');
  await expect(demo.getByRole('tab', { name: 'Catalog' })).toHaveAttribute('aria-selected', 'true');
  await close.click();
  await expect(page.locator('.catalog-log')).toHaveText('Close requested for guidelines');

  if (browserName === 'chromium') {
    await tab.focus();
    await page.screenshot({ path: 'test-results/app-tab-extension-light-wide.png', fullPage: true });
    await page.locator('[data-action="toggle-theme"]').click();
    await root.hover();
    await page.screenshot({ path: 'test-results/app-tab-extension-dark-wide.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await root.hover();
    await page.screenshot({ path: 'test-results/app-tab-extension-dark-narrow.png', fullPage: true });
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
  expect(radii[1]).toBeGreaterThanOrEqual(21);
  expect(radii[1]).toBeLessThanOrEqual(23);
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

test('keeps added tab IDs unique after another tab closes', async ({ page }) => {
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-component="tab-bar"]');
  const add = bar.getByRole('button', { name: 'Add tab' });

  await add.click();
  const firstAdded = bar.locator('[data-demo-tab-id="new-8"]');
  await expect(firstAdded).toHaveCount(1);
  await expect(firstAdded.getByRole('tab')).toHaveAttribute('aria-selected', 'true');

  await bar.getByRole('tab', { name: 'Components' }).press('Backspace');
  await add.click();
  const secondAdded = bar.locator('[data-demo-tab-id="new-9"]');
  await expect(firstAdded).toHaveCount(1);
  await expect(secondAdded).toHaveCount(1);
  await expect(secondAdded.getByRole('tab')).toHaveAttribute('aria-selected', 'true');

  const firstAddedTab = firstAdded.getByRole('tab');
  await firstAddedTab.click();
  await expect(firstAddedTab).toHaveAttribute('aria-selected', 'true');
  await firstAddedTab.press('Alt+Shift+ArrowRight');
  await expect(page.locator('[data-tab-order]')).toContainText('New tab 9 · New tab 8');
  await expect(firstAddedTab).toBeFocused();

  await firstAddedTab.press('Backspace');
  await expect(firstAdded).toHaveCount(0);
  await expect(secondAdded).toHaveCount(1);
  await expect(secondAdded.getByRole('tab')).toHaveAttribute('aria-selected', 'true');
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
