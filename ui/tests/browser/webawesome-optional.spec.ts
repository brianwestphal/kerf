import { expect, test } from '@playwright/test';

for (const width of [1280, 390]) {
  for (const [component, selector] of [
    ['text', '[data-demo-section="semantic-variants"] > .kui-text'],
    ['value-table', '[data-demo="value-table"] .kui-value-table__row dt'],
  ] as const) {
    test(`${component} typography survives removing Web Awesome styles at ${width}px`, async ({
      page,
    }, testInfo) => {
      test.slow(); // CSSOM rule deletion is notably slower in CI WebKit.
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?component=${component}`);
      const report = await page.evaluate((target) => {
        const measure = () =>
          [...document.querySelectorAll<HTMLElement>(target)].map((element) => {
            const css = window.getComputedStyle(element);
            return {
              fontFamily: css.fontFamily,
              fontSize: css.fontSize,
              fontWeight: css.fontWeight,
              lineHeight: css.lineHeight,
              textWrap: css.textWrap,
            };
          });
        const withWebAwesome = measure();
        // The catalog build folds all CSS into one file. Remove only the
        // native typography rules Web Awesome contributes, and invalidate its
        // theme variables to exercise Kerf's standalone fallbacks.
        let removedNativeRules = 0;
        const nativeSelectors = new Set([
          'h1,h2,h3,h4,h5,h6',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'p',
          'dt',
        ]);
        const strip = (container: CSSStyleSheet | CSSGroupingRule) => {
          const rules = container.cssRules;
          for (let index = rules.length - 1; index >= 0; index--) {
            const rule = rules[index];
            if (
              rule instanceof CSSStyleRule &&
              nativeSelectors.has(rule.selectorText.replaceAll(' ', '')) &&
              (rule.cssText.includes('--wa-') ||
                rule.cssText.includes('text-wrap:'))
            ) {
              container.deleteRule(index);
              removedNativeRules++;
            } else if ('cssRules' in rule) strip(rule as CSSGroupingRule);
          }
        };
        for (const sheet of document.styleSheets) strip(sheet);
        const rootStyle = window.getComputedStyle(document.documentElement);
        for (const name of rootStyle)
          if (name.startsWith('--wa-'))
            document.documentElement.style.setProperty(name, 'initial');
        return {
          removedNativeRules,
          withWebAwesome,
          standalone: measure(),
        };
      }, selector);
      expect(report.removedNativeRules).toBeGreaterThan(0);
      expect(report.withWebAwesome.length).toBeGreaterThan(0);
      expect(report.standalone).toEqual(report.withWebAwesome);
      await page
        .locator(
          component === 'text'
            ? '[data-demo-section="semantic-variants"]'
            : '[data-demo="value-table"] .kui-value-table',
        )
        .first()
        .screenshot({
          path: testInfo.outputPath(`${component}-${width}-no-wa.png`),
        });
    });
  }
}

// Web Awesome is an optional integration. Every Kerf token that can follow a
// Web Awesome theme variable falls back to the value the shipped Kerf theme
// gives it, so a Kerf-only application (no Web Awesome, no theme bridge)
// renders exactly like the catalog. The probe re-declares each such token
// with every --wa-* variable it reads reset to the guaranteed-invalid
// `initial`, then compares the resolved values with the themed page.

test('Kerf tokens resolve identically with and without the Web Awesome theme', async ({
  page,
}) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/?component=button');
    await expect(page.locator('[data-demo="button"]')).toBeVisible();
    const report = await page.evaluate(() => {
      const declarations = new Map<string, string>();
      const walk = (rules: CSSRuleList) => {
        for (const rule of rules) {
          if (
            rule instanceof CSSStyleRule &&
            rule.selectorText
              .split(',')
              .some((selector) => selector.trim() === ':root')
          ) {
            for (const name of rule.style) {
              const value = rule.style.getPropertyValue(name);
              if (name.startsWith('--kui-') && value.includes('--wa-'))
                declarations.set(name, value);
            }
          } else if ('cssRules' in rule) walk(rule.cssRules as CSSRuleList);
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules);
      const waNames = new Set(
        [...declarations.values()].flatMap((value) =>
          [...value.matchAll(/--wa-[a-z0-9-]+/g)].map((match) => match[0]),
        ),
      );
      const property = (name: string) => {
        if (name.startsWith('--kui-font-weight')) return 'font-weight';
        if (name === '--kui-font-sans') return 'font-family';
        if (/^--kui-(font|space|radius)-/.test(name)) return 'width';
        return 'background-color';
      };
      const resolve = (element: HTMLElement, name: string) => {
        const target = document.createElement('div');
        target.style.setProperty(property(name), `var(${name})`);
        element.append(target);
        const value = window
          .getComputedStyle(target)
          .getPropertyValue(property(name));
        target.remove();
        return value;
      };
      const probe = document.createElement('div');
      for (const name of waNames) probe.style.setProperty(name, 'initial');
      for (const [name, value] of declarations)
        probe.style.setProperty(name, value);
      document.body.append(probe);
      const themed = document.createElement('div');
      document.body.append(themed);
      const differences = [...declarations.keys()]
        .map((name) => ({
          name,
          themed: resolve(themed, name),
          standalone: resolve(probe, name),
        }))
        .filter((entry) => entry.themed !== entry.standalone);
      probe.remove();
      themed.remove();
      return { checked: declarations.size, differences };
    });
    // Foundation's color, type, spacing, and radius tokens are covered.
    expect(report.checked).toBeGreaterThan(30);
    expect(report.differences, scheme).toEqual([]);
  }
});
