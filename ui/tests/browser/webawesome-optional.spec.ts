import { expect, test } from '@playwright/test';

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
