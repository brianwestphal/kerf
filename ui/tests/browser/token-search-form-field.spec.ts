import { expect, test } from '@playwright/test';

test('TokenSearchField form presentation matches Web Awesome field geometry and metadata', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=token-search-field');
    const pair = page.locator('[data-demo-token-form]');
    const field = pair.locator('[data-token-search-form-field]');
    const editor = field.getByRole('searchbox', { name: 'Search query' });
    await expect(editor).toHaveAttribute('aria-required', 'true');
    await expect(editor).toHaveAttribute(
      'aria-describedby',
      'saved-view-query-hint',
    );
    await expect(
      field.locator('.kui-token-search__field-required'),
    ).toBeVisible();
    await expect(field.locator('.kui-token-search__field-hint')).toHaveText(
      'Add filters to narrow the view.',
    );
    const geometry = await pair.evaluate((container) => {
      const wa = container.querySelector('wa-input')!;
      const waLabel = wa.shadowRoot!.querySelector<HTMLElement>(
        '[part~="form-control-label"]',
      )!;
      const waHint =
        wa.shadowRoot!.querySelector<HTMLElement>('[part~="hint"]')!;
      const waControl =
        wa.shadowRoot!.querySelector<HTMLElement>('.text-field')!;
      const search = container.querySelector<HTMLElement>(
        '[data-component="token-search-field"]',
      )!;
      const searchLabel = container.querySelector<HTMLElement>(
        '.kui-token-search__field-label',
      )!;
      const searchHint = container.querySelector<HTMLElement>(
        '.kui-token-search__field-hint',
      )!;
      const searchRequired = container.querySelector<HTMLElement>(
        '.kui-token-search__field-required',
      )!;
      const style = (element: Element) => {
        const css = globalThis.getComputedStyle(element);
        return {
          fontSize: css.fontSize,
          fontWeight: css.fontWeight,
          letterSpacing: css.letterSpacing,
          lineHeight: css.lineHeight,
          textTransform: css.textTransform,
          color: css.color,
        };
      };
      return {
        hostLeft: wa.getBoundingClientRect().left,
        hostRight: wa.getBoundingClientRect().right,
        searchLeft: search.getBoundingClientRect().left,
        searchRight: search.getBoundingClientRect().right,
        waLabelInset:
          waLabel.getBoundingClientRect().left -
          wa.getBoundingClientRect().left +
          parseFloat(globalThis.getComputedStyle(waLabel).paddingLeft),
        searchLabelInset:
          searchLabel.getBoundingClientRect().left -
          search.getBoundingClientRect().left +
          parseFloat(globalThis.getComputedStyle(searchLabel).paddingLeft),
        waHintInset:
          waHint.getBoundingClientRect().left -
          wa.getBoundingClientRect().left +
          parseFloat(globalThis.getComputedStyle(waHint).paddingLeft),
        searchHintInset:
          searchHint.getBoundingClientRect().left -
          search.getBoundingClientRect().left +
          parseFloat(globalThis.getComputedStyle(searchHint).paddingLeft),
        waLabel: style(waLabel),
        searchLabel: style(searchLabel),
        waControlRadius: globalThis.getComputedStyle(waControl).borderRadius,
        searchControlRadius: globalThis.getComputedStyle(search).borderRadius,
        waRequiredColor: globalThis.getComputedStyle(waLabel, '::after').color,
        searchRequiredColor: globalThis.getComputedStyle(searchRequired).color,
      };
    });
    expect(geometry.searchLeft).toBeCloseTo(geometry.hostLeft, 0);
    expect(geometry.searchRight).toBeCloseTo(geometry.hostRight, 0);
    expect(geometry.searchLabelInset).toBeCloseTo(geometry.waLabelInset, 0);
    expect(geometry.searchHintInset).toBeCloseTo(geometry.waHintInset, 0);
    expect(geometry.searchLabel).toEqual(geometry.waLabel);
    expect(geometry.searchControlRadius).toBe(geometry.waControlRadius);
    expect(geometry.searchRequiredColor).toBe(geometry.waRequiredColor);

    await field.locator('[data-token-search-form-label]').click();
    await expect(editor).toBeFocused();
    await pair.screenshot({
      path: `test-results/token-search-form-${width}.png`,
    });
  }
});

test('TokenSearchField accepts inherited app color tokens in form and standalone presentations', async ({
  page,
}) => {
  await page.goto('/?component=token-search-field');
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.addStyleTag({
    content: `
    [data-demo="token-search-field"] {
      --kui-token-search-background: #f9f7fb;
      --kui-token-search-border: #8b6f9c;
      --kui-token-search-token-background: #e8dff0;
      --kui-token-search-token-foreground: #342547;
    }
  `,
  });
  const colors = await page
    .locator('[data-demo="token-search-field"]')
    .evaluate((demo) => {
      const form = demo.querySelector<HTMLElement>(
        '[data-demo-token-form] .kui-token-search',
      )!;
      const formToken = form.querySelector<HTMLElement>(
        '.kui-token-search__token',
      )!;
      const standalone = demo.querySelector<HTMLElement>(
        '[data-token-search-id="catalog-search"]',
      )!;
      const token = standalone.querySelector<HTMLElement>(
        '.kui-token-search__token',
      )!;
      const style = (element: HTMLElement) =>
        globalThis.getComputedStyle(element);
      return {
        formBackground: style(form).backgroundColor,
        formBorder: style(form).borderTopColor,
        formTokenBackground: style(formToken).backgroundColor,
        formTokenForeground: style(formToken).color,
        standaloneBackground: style(standalone).backgroundColor,
        standaloneBorder: style(standalone).borderTopColor,
        tokenBackground: style(token).backgroundColor,
        tokenForeground: style(token).color,
      };
    });
  expect(colors).toEqual({
    formBackground: 'rgb(249, 247, 251)',
    formBorder: 'rgb(139, 111, 156)',
    formTokenBackground: 'rgb(232, 223, 240)',
    formTokenForeground: 'rgb(52, 37, 71)',
    standaloneBackground: 'rgb(249, 247, 251)',
    standaloneBorder: 'rgb(139, 111, 156)',
    tokenBackground: 'rgb(232, 223, 240)',
    tokenForeground: 'rgb(52, 37, 71)',
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('[data-demo-token-form]').screenshot({
      path: `test-results/token-search-colors-form-chip-${width}.png`,
    });
    await page.locator('[data-token-search-id="catalog-search"]').screenshot({
      path: `test-results/token-search-colors-tokens-${width}.png`,
    });
  }
});
