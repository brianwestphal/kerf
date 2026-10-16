import { expect, test } from '@playwright/test';

test('SearchField form presentation matches TextField geometry and metadata', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=search-field');
    const pair = page.locator('[data-demo-token-form]');
    const field = pair.locator('[data-search-field-form-field]');
    const editor = field.getByRole('searchbox', { name: 'Search Query' });
    await expect(editor).toHaveAttribute('aria-required', 'true');
    await expect(editor).toHaveAttribute(
      'aria-describedby',
      'saved-view-query-hint',
    );
    await expect(
      field.locator('.kui-search-field__field-required'),
    ).toBeVisible();
    await expect(field.locator('.kui-search-field__field-hint')).toHaveText(
      'Add filters to narrow the view.',
    );
    const geometry = await pair.evaluate((container) => {
      const text = container.querySelector<HTMLElement>('.kui-text-field')!;
      const textLabel = text.querySelector<HTMLElement>(
        '.kui-text-field__label',
      )!;
      const textHint = text.querySelector<HTMLElement>(
        '.kui-text-field__hint',
      )!;
      const textControl = text.querySelector<HTMLElement>(
        '.kui-text-field__box',
      )!;
      const textRequired = text.querySelector<HTMLElement>(
        '.kui-text-field__required',
      )!;
      const search = container.querySelector<HTMLElement>(
        '[data-component="search-field"]',
      )!;
      const searchLabel = container.querySelector<HTMLElement>(
        '.kui-search-field__field-label',
      )!;
      const searchHint = container.querySelector<HTMLElement>(
        '.kui-search-field__field-hint',
      )!;
      const searchRequired = container.querySelector<HTMLElement>(
        '.kui-search-field__field-required',
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
        hostLeft: text.getBoundingClientRect().left,
        hostRight: text.getBoundingClientRect().right,
        searchLeft: search.getBoundingClientRect().left,
        searchRight: search.getBoundingClientRect().right,
        textLabelInset:
          textLabel.getBoundingClientRect().left -
          text.getBoundingClientRect().left +
          parseFloat(globalThis.getComputedStyle(textLabel).paddingLeft),
        searchLabelInset:
          searchLabel.getBoundingClientRect().left -
          search.getBoundingClientRect().left +
          parseFloat(globalThis.getComputedStyle(searchLabel).paddingLeft),
        textHintInset:
          textHint.getBoundingClientRect().left -
          text.getBoundingClientRect().left +
          parseFloat(globalThis.getComputedStyle(textHint).paddingLeft),
        searchHintInset:
          searchHint.getBoundingClientRect().left -
          search.getBoundingClientRect().left +
          parseFloat(globalThis.getComputedStyle(searchHint).paddingLeft),
        textLabel: style(textLabel),
        searchLabel: style(searchLabel),
        textControlRadius:
          globalThis.getComputedStyle(textControl).borderRadius,
        searchControlRadius: globalThis.getComputedStyle(search).borderRadius,
        textRequiredColor: globalThis.getComputedStyle(textRequired).color,
        searchRequiredColor: globalThis.getComputedStyle(searchRequired).color,
      };
    });
    expect(geometry.searchLeft).toBeCloseTo(geometry.hostLeft, 0);
    expect(geometry.searchRight).toBeCloseTo(geometry.hostRight, 0);
    expect(geometry.searchLabelInset).toBeCloseTo(geometry.textLabelInset, 0);
    expect(geometry.searchHintInset).toBeCloseTo(geometry.textHintInset, 0);
    expect(geometry.searchLabel).toEqual(geometry.textLabel);
    expect(geometry.searchControlRadius).toBe(geometry.textControlRadius);
    expect(geometry.searchRequiredColor).toBe(geometry.textRequiredColor);

    await field.locator('[data-search-field-form-label]').click();
    await expect(editor).toBeFocused();
    await pair.screenshot({
      path: `test-results/search-field-form-${width}.png`,
    });
  }
});

test('SearchField accepts inherited app color tokens in form and standalone presentations', async ({
  page,
}) => {
  await page.goto('/?component=search-field');
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.addStyleTag({
    content: `
    [data-demo="search-field"] {
      --kui-search-field-background: #f9f7fb;
      --kui-search-field-border: #8b6f9c;
      --kui-search-field-token-background: #e8dff0;
      --kui-search-field-token-foreground: #342547;
    }
  `,
  });
  const colors = await page
    .locator('[data-demo="search-field"]')
    .evaluate((demo) => {
      const form = demo.querySelector<HTMLElement>(
        '[data-demo-token-form] .kui-search-field',
      )!;
      const formToken = form.querySelector<HTMLElement>(
        '.kui-search-field__token',
      )!;
      const standalone = demo.querySelector<HTMLElement>(
        '[data-search-field-id="catalog-search"]',
      )!;
      const token = standalone.querySelector<HTMLElement>(
        '.kui-search-field__token',
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
      path: `test-results/search-field-colors-form-chip-${width}.png`,
    });
    await page.locator('[data-search-field-id="catalog-search"]').screenshot({
      path: `test-results/search-field-colors-tokens-${width}.png`,
    });
  }
});
